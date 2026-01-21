/**
 * iSnips Sync Service
 * Handles data bundling, merging, and communication with Google Drive/WebDAV.
 */

importScripts('merge.js');

class SyncService {
  constructor() {
    this.syncFolderName = 'iSnips';
    this.syncFileName = 'snippets.json';
    this.db = null;
  }

  async setDatabase(db) {
    this.db = db;
  }

  /**
   * Bundles all local data into a single sync object.
   */
  async bundleData() {
    if (!this.db) throw new Error('Database not initialized');

    return {
      version: '3.0.0',
      lastSync: Date.now(),
      snippets: await this.db.getAllSnippetsIncludingDeleted()
    };
  }

  /**
   * Merges remote data into local storage.
   * Logic: For each item, keep the one with the latest updated_at.
   */
  async mergeData(remoteData) {
    if (!this.db) throw new Error('Database not initialized');
    if (!remoteData || !Array.isArray(remoteData.snippets)) {
      return { success: false, error: 'Invalid remote data' };
    }

    const localSnippets = await this.db.getAllSnippetsIncludingDeleted();
    const mergedSnippets = mergeSnippets(localSnippets, remoteData.snippets, { preferRemoteOnTie: true });

    for (const snippet of mergedSnippets) {
      await this._upsertSnippet(snippet);
    }

    return { success: true, updatedCount: mergedSnippets.length };
  }

  async _upsertSnippet(snippet) {
    const db = await this.db.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets'], 'readwrite');
      const store = transaction.objectStore('snippets');
      const request = store.put(snippet);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async _updateSyncConfig(patch) {
    const current = await this.db.getSetting('syncConfig', {});
    const next = { ...current, ...patch };
    await this.db.setSetting('syncConfig', next);
    return next;
  }

  _normalizeFolderUrl(baseUrl) {
    const trimmed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    if (trimmed.endsWith(`/${this.syncFolderName}`)) {
      return `${trimmed}/`;
    }
    return `${trimmed}/${this.syncFolderName}/`;
  }

  async _ensureWebDAVFolder(folderUrl, headers) {
    const propfind = await fetch(folderUrl, { method: 'PROPFIND', headers });
    if (propfind.ok) return;
    if (propfind.status !== 404) {
      throw new Error(`WebDAV Folder Check Failed: ${propfind.statusText}`);
    }

    const mkcol = await fetch(folderUrl, { method: 'MKCOL', headers });
    if (!mkcol.ok && mkcol.status !== 405) {
      throw new Error(`WebDAV Folder Create Failed: ${mkcol.statusText}`);
    }
  }

  async _getWebDAVETag(fileUrl, headers) {
    const response = await fetch(fileUrl, { method: 'HEAD', headers });
    if (!response.ok) return null;
    return response.headers.get('ETag');
  }

  /**
   * WebDAV Implementation
   */
  async syncWebDAV(config) {
    const { url, username, password } = config;
    const folderUrl = this._normalizeFolderUrl(url);
    const fullUrl = `${folderUrl}${this.syncFileName}`;
    
    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(username + ':' + password));

    try {
      await this._ensureWebDAVFolder(folderUrl, headers);

      // 1. Download remote data
      const response = await fetch(fullUrl, { headers });
      let remoteData = null;
      const remoteEtag = response.headers.get('ETag');
      if (response.ok) {
        remoteData = await response.json();
      } else if (response.status !== 404) {
        throw new Error(`WebDAV Download Failed: ${response.statusText}`);
      }

      // 2. Merge if remote data exists
      if (remoteData) {
        await this.mergeData(remoteData);
      }

      if (remoteEtag) {
        await this._updateSyncConfig({ last_remote_etag: remoteEtag });
      }

      const currentConfig = await this.db.getSetting('syncConfig', {});
      const latestEtag = await this._getWebDAVETag(fullUrl, headers);
      if (latestEtag && currentConfig.last_remote_etag && latestEtag !== currentConfig.last_remote_etag) {
        const refreshResponse = await fetch(fullUrl, { headers });
        if (refreshResponse.ok) {
          const refreshedData = await refreshResponse.json();
          await this.mergeData(refreshedData);
          await this._updateSyncConfig({ last_remote_etag: latestEtag });
        }
      }

      // 3. Upload merged data
      const mergedBundle = await this.bundleData();
      const uploadResponse = await fetch(fullUrl, {
        method: 'PUT',
        headers: {
          ...Object.fromEntries(headers),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mergedBundle)
      });

      if (!uploadResponse.ok) {
        throw new Error(`WebDAV Upload Failed: ${uploadResponse.statusText}`);
      }

      const uploadedEtag = uploadResponse.headers.get('ETag') || await this._getWebDAVETag(fullUrl, headers);
      if (uploadedEtag) {
        await this._updateSyncConfig({ last_remote_etag: uploadedEtag });
      }

      return { success: true };
    } catch (error) {
      console.error('WebDAV Sync Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Google Drive Implementation
   */
  async syncGoogleDrive() {
    try {
      const token = await this._getGoogleToken();
      if (!token) throw new Error('Failed to get Google Token');

      // 1. Ensure folder exists
      const folderId = await this._ensureGoogleDriveFolder(token);

      // 2. Find the sync file in Google Drive
      let file = await this._findGoogleDriveFile(token, folderId);
      let fileId = file ? file.id : null;
      let remoteTag = file ? (file.headRevisionId || file.modifiedTime) : null;

      // 3. Download remote data
      let remoteData = null;
      if (fileId) {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          remoteData = await response.json();
        }
      }

      // 4. Merge if remote data exists
      if (remoteData) {
        await this.mergeData(remoteData);
      }

      if (remoteTag) {
        await this._updateSyncConfig({ last_remote_etag: remoteTag });
      }

      const currentConfig = await this.db.getSetting('syncConfig', {});
      if (fileId) {
        const latestMeta = await this._getGoogleDriveFileMeta(token, fileId);
        const latestTag = latestMeta ? (latestMeta.headRevisionId || latestMeta.modifiedTime) : null;
        if (latestTag && currentConfig.last_remote_etag && latestTag !== currentConfig.last_remote_etag) {
          const refreshResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (refreshResponse.ok) {
            const refreshedData = await refreshResponse.json();
            await this.mergeData(refreshedData);
            await this._updateSyncConfig({ last_remote_etag: latestTag });
          }
        }
      }

      // 5. Upload merged data
      const mergedBundle = await this.bundleData();
      if (fileId) {
        // Update existing file
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(mergedBundle)
        });
      } else {
        // Create new file
        const metadata = {
          name: this.syncFileName,
          mimeType: 'application/json',
          parents: [folderId]
        };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(mergedBundle)], { type: 'application/json' }));

        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: form
        });
      }

      if (fileId) {
        const updatedMeta = await this._getGoogleDriveFileMeta(token, fileId);
        if (updatedMeta) {
          await this._updateSyncConfig({
            last_remote_etag: updatedMeta.headRevisionId || updatedMeta.modifiedTime
          });
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Google Drive Sync Error:', error);
      return { success: false, error: error.message };
    }
  }

  async _getGoogleToken() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });
  }

  async _ensureGoogleDriveFolder(token) {
    const query = encodeURIComponent(`name='${this.syncFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: this.syncFolderName,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });
    const created = await createResponse.json();
    return created.id;
  }

  async _findGoogleDriveFile(token, folderId) {
    const query = encodeURIComponent(`name='${this.syncFileName}' and '${folderId}' in parents and trashed=false`);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,headRevisionId,modifiedTime)`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
  }

  async _getGoogleDriveFileMeta(token, fileId) {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=headRevisionId,modifiedTime`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return null;
    return await response.json();
  }
}

// Export singleton for background.js
const syncService = new SyncService();
if (typeof module !== 'undefined') {
  module.exports = syncService;
}
