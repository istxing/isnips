/**
 * iSnippets Sync Service
 * Handles data bundling, merging, and communication with Google Drive/WebDAV.
 */

class SyncService {
  constructor() {
    this.syncFileName = 'iSnippets-sync.json';
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
    
    const [cards, settings] = await Promise.all([
      this.db.getIndexCards({}), // This returns only non-deleted cards based on background.js
      this._getAllSettings()
    ]);

    // We also need deleted cards to sync logic
    const deletedCards = await this.db.getDeletedCards();
    const allCards = [...cards, ...deletedCards];

    return {
      version: '2.0.0',
      lastSync: Date.now(),
      cards: allCards,
      settings: settings
    };
  }

  async _getAllSettings() {
    const keys = ['language', 'columnCount', 'blockedSites', 'recentTags', 'syncConfig'];
    const settings = {};
    for (const key of keys) {
      settings[key] = await this.db.getSetting(key);
    }
    return settings;
  }

  /**
   * Merges remote data into local storage.
   * Logic: For each item, keep the one with the latest updatedAt.
   */
  async mergeData(remoteData) {
    if (!this.db) throw new Error('Database not initialized');
    if (!remoteData || !remoteData.cards) return { success: false, error: 'Invalid remote data' };

    const localData = await this.bundleData();
    const localCardsMap = new Map(localData.cards.map(c => [c.id, c]));
    const remoteCardsMap = new Map(remoteData.cards.map(c => [c.id, c]));

    const mergedCards = [];
    const allIds = new Set([...localCardsMap.keys(), ...remoteCardsMap.keys()]);

    let updatedCount = 0;

    for (const id of allIds) {
      const local = localCardsMap.get(id);
      const remote = remoteCardsMap.get(id);

      if (local && remote) {
        if ((remote.updatedAt || remote.createdAt || 0) > (local.updatedAt || local.createdAt || 0)) {
          mergedCards.push(remote);
          updatedCount++;
        } else {
          mergedCards.push(local);
        }
      } else if (remote) {
        mergedCards.push(remote);
        updatedCount++;
      } else {
        mergedCards.push(local);
      }
    }

    // Save merged cards back to IndexedDB
    // Note: background.js uses transaction for single operations. 
    // We should ideally use a bulk operation.
    for (const card of mergedCards) {
      await this._upsertCard(card);
    }

    // Merge settings (optional, simple overwrite for now or check timestamps)
    if (remoteData.settings) {
      for (const [key, value] of Object.entries(remoteData.settings)) {
        if (key !== 'syncConfig') { // Don't overwrite sync config
          await this.db.setSetting(key, value);
        }
      }
    }

    return { success: true, updatedCount };
  }

  async _upsertCard(card) {
    const db = await this.db.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['indexCards'], 'readwrite');
      const store = transaction.objectStore('indexCards');
      const request = store.put(card);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * WebDAV Implementation
   */
  async syncWebDAV(config) {
    const { url, username, password } = config;
    const fullUrl = url.endsWith('/') ? url + this.syncFileName : url + '/' + this.syncFileName;
    
    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(username + ':' + password));

    try {
      // 1. Download remote data
      const response = await fetch(fullUrl, { headers });
      let remoteData = null;
      if (response.ok) {
        remoteData = await response.json();
      } else if (response.status !== 404) {
        throw new Error(`WebDAV Download Failed: ${response.statusText}`);
      }

      // 2. Merge if remote data exists
      if (remoteData) {
        await this.mergeData(remoteData);
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

      // 1. Find the sync file in Google Drive
      let fileId = await this._findGoogleDriveFile(token);

      // 2. Download remote data
      let remoteData = null;
      if (fileId) {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          remoteData = await response.json();
        }
      }

      // 3. Merge if remote data exists
      if (remoteData) {
        await this.mergeData(remoteData);
      }

      // 4. Upload merged data
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
          mimeType: 'application/json'
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

  async _findGoogleDriveFile(token) {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${this.syncFileName}' and trashed=false`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0].id : null;
  }
}

// Export singleton for background.js
const syncService = new SyncService();
if (typeof module !== 'undefined') {
  module.exports = syncService;
}
