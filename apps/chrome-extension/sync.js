/**
 * iSnips Sync Service
 * Handles data bundling, merging, and communication with Google Drive/WebDAV.
 */

importScripts("merge.js");

class SyncService {
  constructor() {
    this.syncFolderName = "iSnips";
    this.syncFileName = "snippets.json";
    this.db = null;
    this.googleAuth = null;
  }

  async _fetch(url, options = {}) {
    const { _webAuthRetried, ...requestOptions } = options;
    const response = await fetch(url, {
      ...requestOptions,
      signal: AbortSignal.timeout(20000),
    });
    // An expired cached Google token must not make every subsequent attempt fail.
    if (
      response.status === 401 &&
      String(url).startsWith("https://www.googleapis.com/")
    ) {
      const token = options.headers?.Authorization?.replace(/^Bearer /, "");
      if (
        token &&
        this.googleAuth &&
        (await this.googleAuth.method()) === "web"
      ) {
        await this.googleAuth.invalidate(token);
        if (!_webAuthRetried) {
          const renewed = await this.googleAuth.getToken(false);
          return this._fetch(url, {
            ...options,
            headers: { ...options.headers, Authorization: `Bearer ${renewed}` },
            _webAuthRetried: true,
          });
        }
        const error = new Error("AUTH_RECONNECT");
        error.code = "AUTH_RECONNECT";
        throw error;
      } else if (token) {
        await this.googleAuth?.invalidateNative?.();
        await chrome.identity.removeCachedAuthToken({ token });
      }
    }
    return response;
  }

  async _fetchWebDAV(url, options = {}) {
    return this._fetch(url, { ...options, redirect: "error" });
  }

  setGoogleAuth(auth) {
    this.googleAuth = auth;
  }

  async setDatabase(db) {
    this.db = db;
  }

  /**
   * Bundles all local data into a single sync object.
   */
  async bundleData() {
    if (!this.db) throw new Error("Database not initialized");

    const data = this.db.getSyncData
      ? await this.db.getSyncData()
      : {
          snippets: await this.db.getAllSnippetsIncludingDeleted(),
          spaces: this.db.getStoredSpaces
            ? await this.db.getStoredSpaces()
            : [],
        };
    return {
      version: "3.2.0",
      lastSync: Date.now(),
      snippets: data.snippets,
      spaces: data.spaces
        .filter((space) => space.id !== "inbox")
        .map(normalizeSyncSpace),
    };
  }

  async mergeData(remoteData) {
    if (!this.db) throw new Error("Database not initialized");
    if (
      !remoteData ||
      !Array.isArray(remoteData.snippets) ||
      remoteData.snippets.some(
        (item) =>
          !item ||
          typeof item.id !== "string" ||
          !item.id ||
          typeof item.text !== "string" ||
          (item.updated_at != null &&
            !Number.isFinite(Number(item.updated_at))),
      ) ||
      (remoteData.spaces !== undefined && !Array.isArray(remoteData.spaces))
    )
      return { success: false, error: "Invalid remote data" };
    let spaces;
    try {
      spaces = (remoteData.spaces || []).map(normalizeSyncSpace);
    } catch {
      return { success: false, error: "Invalid remote folder data" };
    }
    // The shared transaction compares current values after the download, and commits folders with their records.
    await this._upsertSnippetsBatch(remoteData.snippets, spaces);
    await this.db.runShadowSnippetTask("mergeData", () =>
      this.db.syncShadowSnippets(),
    );
    return {
      success: true,
      updatedCount: remoteData.snippets.length,
      spaceCount: spaces.length,
    };
  }

  async _upsertSnippetsBatch(snippets, spaces = []) {
    if (!snippets.length && !spaces.length) return;
    const db = await this.db.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["snippets", "spaces"], "readwrite");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () =>
        reject(transaction.error || new Error("Sync transaction aborted"));
      upsertSyncData(transaction, snippets, spaces);
    });
  }

  async _upsertSnippet(snippet) {
    return this._upsertSnippetsBatch([snippet]);
  }

  async _updateSyncConfig(patch) {
    const current = await this.db.getSetting("syncConfig", {});
    const next = { ...current, ...patch };
    await this.db.setSetting("syncConfig", next);
    return next;
  }

  _normalizeFolderUrl(baseUrl) {
    const trimmed = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    if (trimmed.endsWith(`/${this.syncFolderName}`)) {
      return `${trimmed}/`;
    }
    return `${trimmed}/${this.syncFolderName}/`;
  }

  async _ensureWebDAVFolder(folderUrl, headers) {
    const propfind = await this._fetchWebDAV(folderUrl, {
      method: "PROPFIND",
      headers,
    });
    if (propfind.ok) return;
    if (propfind.status !== 404) {
      throw new Error(`WebDAV Folder Check Failed: ${propfind.statusText}`);
    }

    const mkcol = await this._fetchWebDAV(folderUrl, {
      method: "MKCOL",
      headers,
    });
    if (!mkcol.ok && mkcol.status !== 405) {
      throw new Error(`WebDAV Folder Create Failed: ${mkcol.statusText}`);
    }
  }

  // btoa() only accepts Latin1, so encode the credentials as UTF-8 first (RFC 7617).
  _basicAuth(username, password) {
    const bytes = new TextEncoder().encode(
      `${username ?? ""}:${password ?? ""}`,
    );
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return "Basic " + btoa(binary);
  }

  // An empty remote file (e.g. an interrupted earlier upload) is treated as "no remote data".
  async _readJsonBody(response) {
    const text = await response.text();
    if (!text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Remote file is not valid JSON.");
    }
  }

  async _getWebDAVETag(fileUrl, headers) {
    const response = await this._fetchWebDAV(fileUrl, {
      method: "HEAD",
      headers,
    });
    if (!response.ok) return null;
    return response.headers.get("ETag");
  }

  /**
   * WebDAV Implementation
   */
  async syncWebDAV(config) {
    const { url, username, password } = config;
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { success: false, error: "Enter a valid WebDAV URL." };
    }
    if (
      parsedUrl.username ||
      parsedUrl.password ||
      parsedUrl.search ||
      parsedUrl.hash
    )
      return {
        success: false,
        error:
          "WebDAV URL must not contain credentials, a query or a fragment.",
      };
    if (
      parsedUrl.protocol !== "https:" &&
      !(
        parsedUrl.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(parsedUrl.hostname)
      )
    ) {
      return {
        success: false,
        error: "WebDAV requires HTTPS (except localhost).",
      };
    }
    const folderUrl = this._normalizeFolderUrl(parsedUrl.href);
    const fullUrl = `${folderUrl}${this.syncFileName}`;

    const headers = new Headers();
    headers.set("Authorization", this._basicAuth(username, password));

    try {
      await this._ensureWebDAVFolder(folderUrl, headers);

      // 1. Download remote data
      const response = await this._fetchWebDAV(fullUrl, { headers });
      let remoteData = null;
      const remoteEtag = response.ok ? response.headers.get("ETag") : null;
      if (response.ok) {
        remoteData = await this._readJsonBody(response);
      } else if (response.status !== 404) {
        throw new Error(`WebDAV Download Failed: ${response.statusText}`);
      }

      // 2. Merge if remote data exists
      if (remoteData) {
        const mergeResult = await this.mergeData(remoteData);
        if (!mergeResult.success) throw new Error(mergeResult.error);
      }

      // Always track what the server has now. A missing file (404) or a server without
      // ETags must clear the stored tag, otherwise the upload's If-Match is stale and 412s forever.
      await this._updateSyncConfig({ last_remote_etag: remoteEtag || null });

      let currentConfig = await this.db.getSetting("syncConfig", {});
      const latestEtag = await this._getWebDAVETag(fullUrl, headers);
      if (
        latestEtag &&
        currentConfig.last_remote_etag &&
        latestEtag !== currentConfig.last_remote_etag
      ) {
        const refreshResponse = await this._fetchWebDAV(fullUrl, { headers });
        if (refreshResponse.ok) {
          const refreshedData = await this._readJsonBody(refreshResponse);
          if (refreshedData) {
            const refreshResult = await this.mergeData(refreshedData);
            if (!refreshResult.success) throw new Error(refreshResult.error);
          }
          await this._updateSyncConfig({
            last_remote_etag: refreshResponse.headers.get("ETag") || null,
          });
        } else {
          throw new Error(`WebDAV refresh failed: ${refreshResponse.status}`);
        }
      }

      // 3. Upload merged data
      const mergedBundle = await this.bundleData();
      currentConfig = await this.db.getSetting("syncConfig", {});
      const uploadHeaders = {
        ...Object.fromEntries(headers),
        "Content-Type": "application/json",
      };

      // Add If-Match if we have a known ETag to prevent lost updates
      if (currentConfig.last_remote_etag) {
        uploadHeaders["If-Match"] = currentConfig.last_remote_etag;
      } else if (response.status === 404) {
        uploadHeaders["If-None-Match"] = "*";
      }

      const uploadResponse = await this._fetchWebDAV(fullUrl, {
        method: "PUT",
        headers: uploadHeaders,
        body: JSON.stringify(mergedBundle),
      });

      if (uploadResponse.status === 412) {
        throw new Error(
          "Sync Conflict: Remote data was modified by another device. Please try again.",
        );
      }

      if (!uploadResponse.ok) {
        throw new Error(`WebDAV Upload Failed: ${uploadResponse.statusText}`);
      }

      const uploadedEtag =
        uploadResponse.headers.get("ETag") ||
        (await this._getWebDAVETag(fullUrl, headers));
      if (uploadedEtag) {
        await this._updateSyncConfig({ last_remote_etag: uploadedEtag });
      }

      return { success: true };
    } catch (error) {
      console.error("WebDAV Sync Error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Google Drive Implementation
   */
  async syncGoogleDrive(options = {}) {
    const { interactive = true } = options;
    try {
      const token = await this._getGoogleToken(interactive);
      const web = this.googleAuth && (await this.googleAuth.method()) === "web";
      const allowCreate = !web || options.allowCreate === true;
      if (!token) throw new Error("Failed to get Google Token");

      // 1. Ensure folder exists
      const folderId = await this._ensureGoogleDriveFolder(token, {
        allowCreate,
      });

      // 2. Find the sync file in Google Drive
      let file = await this._findGoogleDriveFile(token, folderId);
      if (!file && !allowCreate) {
        const error = new Error("AUTH_CREATE_SYNC_REQUIRED");
        error.code = "AUTH_CREATE_SYNC_REQUIRED";
        throw error;
      }
      let fileId = file ? file.id : null;
      let remoteTag = file ? file.headRevisionId || file.modifiedTime : null;
      let remoteHttpEtag = null;

      // 3. Download remote data
      let remoteData = null;
      if (fileId) {
        const response = await this._fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (response.ok) {
          remoteHttpEtag = response.headers.get("ETag");
          remoteData = await this._readJsonBody(response);
        } else {
          throw new Error(`Google Drive download failed: ${response.status}`);
        }
      }

      // 4. Merge if remote data exists
      if (remoteData) {
        const mergeResult = await this.mergeData(remoteData);
        if (!mergeResult.success) throw new Error(mergeResult.error);
      }

      // Clear the stored tag when the file is missing so it cannot leak into the next sync.
      await this._updateSyncConfig({ last_remote_etag: remoteTag || null });

      let currentConfig = await this.db.getSetting("syncConfig", {});
      if (fileId) {
        const latestMeta = await this._getGoogleDriveFileMeta(token, fileId);
        const latestTag = latestMeta
          ? latestMeta.headRevisionId || latestMeta.modifiedTime
          : null;
        if (
          latestTag &&
          currentConfig.last_remote_etag &&
          latestTag !== currentConfig.last_remote_etag
        ) {
          const refreshResponse = await this._fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (refreshResponse.ok) {
            remoteHttpEtag = refreshResponse.headers.get("ETag");
            const refreshedData = await this._readJsonBody(refreshResponse);
            if (refreshedData) {
              const refreshResult = await this.mergeData(refreshedData);
              if (!refreshResult.success) throw new Error(refreshResult.error);
            }
            await this._updateSyncConfig({ last_remote_etag: latestTag });
          } else {
            throw new Error(
              `Google Drive refresh failed: ${refreshResponse.status}`,
            );
          }
        }
      }

      // 5. Upload merged data
      const mergedBundle = await this.bundleData();

      if (fileId) {
        // Update existing file
        const updateHeaders = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        // A Drive revision ID is not an HTTP ETag. Use the response validator when provided.
        if (remoteHttpEtag) {
          updateHeaders["If-Match"] = remoteHttpEtag;
        }

        const updateResponse = await this._fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
          {
            method: "PATCH",
            headers: updateHeaders,
            body: JSON.stringify(mergedBundle),
          },
        );

        if (updateResponse.status === 412) {
          throw new Error(
            "Sync Conflict (Google Drive): Remote data was modified by another device. Please try again.",
          );
        }

        if (!updateResponse.ok) {
          throw new Error(
            `Google Drive Update Failed: ${updateResponse.statusText}`,
          );
        }
      } else {
        // Create new file
        const metadata = {
          name: this.syncFileName,
          mimeType: "application/json",
          parents: [folderId],
        };
        const form = new FormData();
        form.append(
          "metadata",
          new Blob([JSON.stringify(metadata)], { type: "application/json" }),
        );
        form.append(
          "file",
          new Blob([JSON.stringify(mergedBundle)], {
            type: "application/json",
          }),
        );

        const createResponse = await this._fetch(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: form,
          },
        );
        if (!createResponse.ok) {
          throw new Error(
            `Google Drive create failed: ${createResponse.status}`,
          );
        }
      }

      if (fileId) {
        const updatedMeta = await this._getGoogleDriveFileMeta(token, fileId);
        if (updatedMeta) {
          await this._updateSyncConfig({
            last_remote_etag:
              updatedMeta.headRevisionId || updatedMeta.modifiedTime,
          });
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Google Drive Sync Error:", error);
      return {
        success: false,
        error: error.message,
        ...(error.code ? { code: error.code } : {}),
      };
    }
  }

  async _getGoogleToken(interactive = true) {
    if (this.googleAuth) return this.googleAuth.getToken(interactive);
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });
  }

  async _ensureGoogleDriveFolder(token, { allowCreate = true } = {}) {
    const query = encodeURIComponent(
      `name='${this.syncFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    );
    const response = await this._fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!response.ok)
      throw new Error(`Google Drive folder lookup failed: ${response.status}`);
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    if (!allowCreate) {
      const error = new Error("AUTH_CREATE_SYNC_REQUIRED");
      error.code = "AUTH_CREATE_SYNC_REQUIRED";
      throw error;
    }
    const createResponse = await this._fetch(
      "https://www.googleapis.com/drive/v3/files",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: this.syncFolderName,
          mimeType: "application/vnd.google-apps.folder",
        }),
      },
    );
    if (!createResponse.ok)
      throw new Error(
        `Google Drive folder create failed: ${createResponse.status}`,
      );
    const created = await createResponse.json();
    if (!created.id)
      throw new Error(
        "Google Drive folder create failed: no folder id returned",
      );
    return created.id;
  }

  async _findGoogleDriveFile(token, folderId) {
    const query = encodeURIComponent(
      `name='${this.syncFileName}' and '${folderId}' in parents and trashed=false`,
    );
    const response = await this._fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,headRevisionId,modifiedTime)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!response.ok)
      throw new Error(`Google Drive file lookup failed: ${response.status}`);
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
  }

  async _getGoogleDriveFileMeta(token, fileId) {
    const response = await this._fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=headRevisionId,modifiedTime`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!response.ok) return null;
    return await response.json();
  }
}

// Export singleton for background.js
const syncService = new SyncService();
if (typeof module !== "undefined") {
  module.exports = syncService;
}
