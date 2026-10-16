// Background service worker for iSnips extension
// Handles data storage and message routing
// Import sync service
importScripts('google-auth-config.js', 'google-auth.js', 'sync.js', 'clipboard.js', 'library-data.js');

const AUTO_CLEANUP_ALARM = 'autoCleanup';
const AUTO_SYNC_ALARM = 'autoSync';
const AUTO_BACKUP_ALARM = 'autoBackup';
const AUTO_SYNC_INTERVALS = {
  off: 0,
  '30m': 30,
  '1h': 60,
  '1d': 1440
};
const AUTO_BACKUP_RETENTION = {
  off: 0,
  '30m': 48,
  '1h': 72,
  '1d': 30
};
const SHADOW_SNIPPET_PREFIX = 'shadowSnippet:';
const SHADOW_SNIPPET_IDS_KEY = 'shadowSnippetIds';
const SHADOW_SNIPPET_META_KEY = 'shadowSnippetMeta';
const BACKUP_SNAPSHOT_PREFIX = 'backupSnapshot:';
const BACKUP_SNAPSHOT_IDS_KEY = 'backupSnapshotIds';
const BACKUP_SNAPSHOT_META_KEY = 'backupSnapshotMeta';
// Only plain preferences may come from an imported file. Sync settings (server URL,
// credentials, ETag) and the extension's own storage keys must never be set from a file.
const IMPORTABLE_SETTINGS = new Set(['language', 'appearance', 'columnCount', 'libraryGrouping', 'blockedSites', 'recentTags']);
const CLIPBOARD_CONSENT_VERSION = 1;

async function clipboardConsentStatus(db) {
  const consent = await db.getSetting('clipboardCaptureConsent', null);
  const preference = await db.getSetting('clipboardCaptureEnabled', true);
  const known = consent?.version === CLIPBOARD_CONSENT_VERSION && ['accepted', 'declined'].includes(consent.choice);
  const accepted = known && consent.choice === 'accepted';
  return {
    success: true,
    enabled: accepted && preference === true,
    consentRequired: !accepted,
    needsNotice: !known && preference !== false,
  };
}

// Older backups may request two columns; adapt that preference to the new minimum.
function normalizeColumnCountSetting(value) {
  if (typeof value !== 'number' && !(typeof value === 'string' && value.trim())) return null;
  const count = Number(value);
  return Number.isInteger(count) && count >= 2 && count <= 7 ? Math.max(3, count) : null;
}

if (chrome.storage?.local?.setAccessLevel) {
  chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }).catch((error) => {
    console.warn('Could not restrict local storage to extension pages:', error);
  });
}

function normalizeTransactionError(error, fallback = 'Transaction failed') {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
}

function bindWriteTransaction(transaction, resolve, reject, getSuccessResult) {
  let settled = false;

  const resolveOnce = (value) => {
    if (settled) return;
    settled = true;
    resolve(value);
  };

  const rejectOnce = (error, fallback) => {
    if (settled) return;
    settled = true;
    reject({
      success: false,
      error: normalizeTransactionError(error || transaction.error, fallback)
    });
  };

  transaction.oncomplete = () => {
    resolveOnce(getSuccessResult());
  };

  transaction.onerror = () => {
    rejectOnce(transaction.error);
  };

  transaction.onabort = () => {
    rejectOnce(transaction.error, 'Transaction aborted');
  };

  return { rejectOnce };
}

function hasChromeStorageLocal() {
  return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
}

function chromeStorageLocalGet(keys) {
  return new Promise((resolve, reject) => {
    if (!hasChromeStorageLocal()) {
      resolve({});
      return;
    }

    chrome.storage.local.get(keys, (items) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(items || {});
      }
    });
  });
}

function chromeStorageLocalSet(items) {
  return new Promise((resolve, reject) => {
    if (!hasChromeStorageLocal()) {
      resolve();
      return;
    }

    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

function chromeStorageLocalRemove(keys) {
  return new Promise((resolve, reject) => {
    if (!hasChromeStorageLocal() || !keys || keys.length === 0) {
      resolve();
      return;
    }

    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

const googleDriveAuth = new GoogleDriveAuth({ chrome, clientId: ISNIPS_GOOGLE_AUTH.webClientId });
syncService.setGoogleAuth(googleDriveAuth);

const clipboardHistory = new ClipboardHistory({ get: chromeStorageLocalGet, set: chromeStorageLocalSet });

async function requestPersistentStorage(reason = 'background') {
  if (typeof navigator === 'undefined' || !navigator.storage || typeof navigator.storage.persist !== 'function') {
    return { supported: false, persisted: null, granted: false };
  }

  let persisted = null;
  let granted = false;

  try {
    if (typeof navigator.storage.persisted === 'function') {
      persisted = await navigator.storage.persisted();
    }
  } catch (error) {
    console.warn('Failed to query persistent storage status:', error);
  }

  if (!persisted) {
    try {
      granted = await navigator.storage.persist();
    } catch (error) {
      console.warn('Failed to request persistent storage:', error);
    }
  }

  try {
    if (typeof navigator.storage.persisted === 'function') {
      persisted = await navigator.storage.persisted();
    } else if (persisted == null) {
      persisted = granted;
    }
  } catch (error) {
    console.warn('Failed to re-check persistent storage status:', error);
  }

  const status = {
    supported: true,
    granted: Boolean(granted),
    persisted: persisted == null ? null : Boolean(persisted),
    checked_at: Date.now(),
    source: reason
  };

  try {
    const db = await getDatabase();
    await db.setSetting('storagePersistenceStatus', status);
  } catch (error) {
    console.warn('Failed to store persistence status:', error);
  }

  return status;
}

class iSnipsDatabase {
  constructor() {
    this.db = null;
    this.dbName = 'iSnipsIndexDB';
    this.dbVersion = 5;
    this.initialized = false;
    this.shadowQueue = Promise.resolve();
  }

  async initialize() {
    if (this.initialized && this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Highlights store
        if (!db.objectStoreNames.contains('highlights')) {
          const highlightsStore = db.createObjectStore('highlights', { keyPath: 'id' });
          highlightsStore.createIndex('url', 'url', { unique: false });
          highlightsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Snippets store
        if (!db.objectStoreNames.contains('snippets')) {
          const snippetsStore = db.createObjectStore('snippets', { keyPath: 'id' });
          snippetsStore.createIndex('created_at', 'created_at', { unique: false });
          snippetsStore.createIndex('updated_at', 'updated_at', { unique: false });
          snippetsStore.createIndex('deleted_at', 'deleted_at', { unique: false });
          snippetsStore.createIndex('purged_at', 'purged_at', { unique: false });
          snippetsStore.createIndex('domain', 'domain', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Spaces store
        if (!db.objectStoreNames.contains('spaces')) {
          db.createObjectStore('spaces', { keyPath: 'id' });
        }

      };
    });
  }

  // Snippets operations
  async saveSnippet(snippetData) {
    if (snippetData?.spaceId != null) await this.validateSpace(snippetData.spaceId);
    if (!snippetData || typeof snippetData.text !== 'string' || !snippetData.text.trim()) throw new Error('A record needs text');
    const db = await this.initialize();
    const snippet = {
      id: this.generateId(),
      ...snippetData,
      created_at: snippetData.created_at ?? Date.now(),
      updated_at: snippetData.updated_at ?? Date.now(),
      deleted_at: snippetData.deleted_at ?? null,
      purged_at: snippetData.purged_at ?? null
    };

    const result = await new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets'], 'readwrite');
      const store = transaction.objectStore('snippets');
      const { rejectOnce } = bindWriteTransaction(transaction, resolve, reject, () => ({ success: true, snippet }));
      const request = store.add(snippet);

      request.onerror = () => {
        rejectOnce(request.error, 'Failed to save snippet');
      };
    });

    await this.runShadowSnippetTask('saveSnippet', () => this.upsertShadowSnippets([result.snippet]));
    return result;
  }

  async getSnippets(filters = {}) {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets'], 'readonly');
      const store = transaction.objectStore('snippets');
      const request = store.getAll();

      request.onsuccess = () => {
        let snippets = request.result || [];

        snippets = snippets.filter(snippet => !snippet.deleted_at && !snippet.purged_at);

        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          snippets = snippets.filter(snippet =>
            (snippet.text || '').toLowerCase().includes(searchTerm) ||
            (snippet.domain || '').toLowerCase().includes(searchTerm)
          );
        }

        snippets.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

        resolve(snippets);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getSyncData() {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets', 'spaces'], 'readonly');
      let snippets = [], spaces = [];
      transaction.objectStore('snippets').getAll().onsuccess = event => { snippets = event.target.result || []; };
      transaction.objectStore('spaces').getAll().onsuccess = event => { spaces = event.target.result || []; };
      transaction.oncomplete = () => resolve({ snippets, spaces });
      transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('Sync snapshot failed'));
    });
  }

  async getAllSnippetsIncludingDeleted() {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets'], 'readonly');
      const store = transaction.objectStore('snippets');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async updateSnippet(snippetId, updates) {
    if (updates?.spaceId != null) await this.validateSpace(updates.spaceId);
    if (!updates || (updates.text !== undefined && (typeof updates.text !== 'string' || !updates.text.trim()))) throw new Error('A record needs text');
    const db = await this.initialize();
    const result = await new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets'], 'readwrite');
      const store = transaction.objectStore('snippets');
      let updatedSnippet = null;
      const { rejectOnce } = bindWriteTransaction(transaction, resolve, reject, () => ({
        success: true,
        snippet: updatedSnippet
      }));
      const getRequest = store.get(snippetId);

      getRequest.onsuccess = () => {
        const snippet = getRequest.result;
        if (snippet) {
          updatedSnippet = { ...snippet, ...updates, id: snippet.id, created_at: snippet.created_at, updated_at: Math.max(Date.now(), (Number(snippet.updated_at) || 0) + 1) };
          const putRequest = store.put(updatedSnippet);

          putRequest.onerror = () => {
            rejectOnce(putRequest.error, 'Failed to update snippet');
          };
        } else {
          rejectOnce('Snippet not found');
        }
      };

      getRequest.onerror = () => {
        rejectOnce(getRequest.error, 'Failed to load snippet');
      };
    });

    if (result?.snippet) {
      await this.runShadowSnippetTask('updateSnippet', () => this.upsertShadowSnippets([result.snippet]));
    }

    return result;
  }

  async deleteSnippet(snippetId) {
    const db = await this.initialize();
    const result = await new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets'], 'readwrite');
      const store = transaction.objectStore('snippets');
      const { rejectOnce } = bindWriteTransaction(transaction, resolve, reject, () => ({ success: true }));
      const request = store.delete(snippetId);

      request.onerror = () => {
        rejectOnce(request.error, 'Failed to delete snippet');
      };
    });

    await this.runShadowSnippetTask('deleteSnippet', () => this.removeShadowSnippets([snippetId]));
    return result;
  }

  async softDeleteSnippet(snippetId) {
    return this.updateSnippet(snippetId, {
      deleted_at: Date.now(),
      purged_at: null
    });
  }

  async restoreSnippet(snippetId) {
    return this.updateSnippet(snippetId, {
      deleted_at: null,
      purged_at: null
    });
  }

  async purgeSnippet(snippetId) {
    const snippet = await this.getSnippetById(snippetId);
    const deletedAt = snippet?.deleted_at || Date.now();
    return this.updateSnippet(snippetId, {
      deleted_at: deletedAt,
      purged_at: Date.now()
    });
  }

  async getSnippetById(snippetId) {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets'], 'readonly');
      const store = transaction.objectStore('snippets');
      const request = store.get(snippetId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getDeletedSnippets() {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets'], 'readonly');
      const store = transaction.objectStore('snippets');
      const deletedIndex = store.index('deleted_at');
      const request = deletedIndex.getAll(IDBKeyRange.lowerBound(1));

      request.onsuccess = () => {
        let snippets = request.result || [];
        snippets = snippets.filter(snippet => !snippet.purged_at);
        snippets.sort((a, b) => (b.deleted_at || 0) - (a.deleted_at || 0));
        resolve(snippets);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async emptyTrash() {
    const db = await this.initialize();
    const result = await new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets'], 'readwrite');
      const store = transaction.objectStore('snippets');
      const deletedIndex = store.index('deleted_at');
      const { rejectOnce } = bindWriteTransaction(transaction, resolve, reject, () => ({
        success: true,
        purgedCount
      }));
      const request = deletedIndex.openCursor(IDBKeyRange.lowerBound(1));

      let purgedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const snippet = cursor.value;
          if (!snippet.purged_at) {
            cursor.update({
              ...snippet,
              deleted_at: snippet.deleted_at || Date.now(),
              purged_at: Date.now(),
              updated_at: Date.now()
            });
            purgedCount++;
          }
          cursor.continue();
        }
      };

      request.onerror = () => {
        rejectOnce(request.error, 'Failed to empty trash');
      };
    });

    if (result?.success && result.purgedCount > 0) {
      await this.runShadowSnippetTask('emptyTrash', () => this.syncShadowSnippets());
    }

    return result;
  }

  async autoDeleteOldTrash() {
    const lastRemote = await this.getSetting('syncConfig', {});
    if (!lastRemote?.last_remote_etag) {
      return { success: true, deletedCount: 0 };
    }

    const db = await this.initialize();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    const result = await new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets'], 'readwrite');
      const store = transaction.objectStore('snippets');
      const purgedIndex = store.index('purged_at');
      const { rejectOnce } = bindWriteTransaction(transaction, resolve, reject, () => ({
        success: true,
        deletedCount
      }));
      const request = purgedIndex.openCursor(IDBKeyRange.upperBound(thirtyDaysAgo));

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.purged_at && cursor.value.purged_at <= thirtyDaysAgo) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        }
      };

      request.onerror = () => {
        rejectOnce(request.error, 'Failed to auto-delete old trash');
      };
    });

    if (result?.success && result.deletedCount > 0) {
      await this.runShadowSnippetTask('autoDeleteOldTrash', () => this.syncShadowSnippets());
    }

    return result;
  }

  // Spaces operations
  async createSpace(spaceData) {
    return this.writeSpace(spaceData?.id || this.generateId(), spaceData, true);
  }

  async writeSpace(spaceId, updates, create = false) {
    const name = typeof updates?.name === 'string' ? updates.name.trim() : '';
    if (!name || name.length > 40 || /[\u0000-\u001f\u007f]/.test(name)) throw new Error('Use a folder name of 1–40 characters');
    if (spaceId === 'inbox') throw new Error('Cannot change Inbox');
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['spaces'], 'readwrite');
      const store = transaction.objectStore('spaces');
      let space;
      const { rejectOnce } = bindWriteTransaction(transaction, resolve, reject, () => ({ success: true, space }));
      const request = store.getAll();
      request.onsuccess = () => {
        const all = request.result || [];
        if (all.some(item => !item.deleted_at && item.id !== spaceId && String(item.name).trim().toLowerCase() === name.toLowerCase())) { rejectOnce('Folder name already exists'); transaction.abort(); return; }
        const existing = all.find(item => item.id === spaceId);
        if (create && existing) { rejectOnce('Folder already exists'); transaction.abort(); return; }
        if (!create && (!existing || existing.deleted_at)) { rejectOnce('Folder not found'); transaction.abort(); return; }
        space = { ...(existing || {}), id: spaceId, name, createdAt: existing?.createdAt ?? Date.now(), order: existing?.order ?? all.length, updated_at: Math.max(Date.now(), spaceRevision(existing) + 1), deleted_at: null };
        store.put(space);
      };
    });
  }

  async getSpaces() {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['spaces'], 'readonly');
      const store = transaction.objectStore('spaces');
      const request = store.getAll();

      request.onsuccess = () => {
        let spaces = (request.result || []).filter(space => !space.deleted_at);
        // Sort by order, then by created date
        spaces.sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt));

        // Ensure Inbox exists (return it even if not in DB yet)
        if (!spaces.find(s => s.id === 'inbox')) {
          spaces.unshift({
            id: 'inbox',
            name: 'Inbox',
            createdAt: 0,
            order: -1
          });
        }

        resolve(spaces);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getStoredSpaces() {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['spaces'], 'readonly');
      const store = transaction.objectStore('spaces');
      const request = store.getAll();

      request.onsuccess = () => {
        const spaces = request.result || [];
        spaces.sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt));
        resolve(spaces);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async updateSpace(spaceId, updates) {
    return this.writeSpace(spaceId, updates);
  }

  async validateSpace(spaceId) {
    if (typeof spaceId !== 'string' || (spaceId !== 'inbox' && !(await this.getStoredSpaces()).some(space => space.id === spaceId && !space.deleted_at))) throw new Error('Folder not found');
  }

  async moveSnippet(snippetId, spaceId) {
    if (typeof spaceId !== 'string') throw new Error('Invalid folder');
    if (spaceId !== 'inbox' && !(await this.getStoredSpaces()).some(space => space.id === spaceId && !space.deleted_at)) throw new Error('Folder not found');
    const snippet = await this.getSnippetById(snippetId);
    if (!snippet || snippet.deleted_at || snippet.purged_at) throw new Error('Record not found');
    return this.updateSnippet(snippetId, { spaceId });
  }

  async deleteSpace(spaceId) {
    if (spaceId === 'inbox') throw new Error('Cannot delete Inbox');
    const db = await this.initialize(), movedIds = [];
    const result = await new Promise((resolve, reject) => {
      const transaction = db.transaction(['spaces', 'snippets'], 'readwrite');
      const { rejectOnce } = bindWriteTransaction(transaction, resolve, reject, () => ({ success: true, movedCards: movedIds.length }));
      const spaces = transaction.objectStore('spaces');
      const exists = spaces.get(spaceId);
      exists.onsuccess = () => {
        if (!exists.result || exists.result.deleted_at) { rejectOnce('Folder not found'); transaction.abort(); return; }
        const request = transaction.objectStore('snippets').openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) { const deletedAt = Math.max(Date.now(), spaceRevision(exists.result) + 1); spaces.put({ ...exists.result, updated_at: deletedAt, deleted_at: deletedAt }); return; }
          if (cursor.value.spaceId === spaceId) {
            cursor.update({ ...cursor.value, spaceId: 'inbox' });
            movedIds.push(cursor.primaryKey);
          }
          cursor.continue();
        };
      };
    });
    // Mirror affected records in bounded batches rather than materializing every body.
    for (let offset = 0; offset < movedIds.length; offset += 30) {
      const cards = await Promise.all(movedIds.slice(offset, offset + 30).map(id => this.getSnippetById(id)));
      await this.runShadowSnippetTask('deleteSpace', () => this.upsertShadowSnippets(cards.filter(Boolean)));
    }
    return result;
  }

  async storeHighlight(highlight) {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['highlights'], 'readwrite');
      const store = transaction.objectStore('highlights');
      const { rejectOnce } = bindWriteTransaction(transaction, resolve, reject, () => ({ success: true }));
      const request = store.add(highlight);

      request.onerror = () => {
        rejectOnce(request.error, 'Failed to store highlight');
      };
    });
  }

  async getHighlightsForUrl(url) {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['highlights'], 'readonly');
      const store = transaction.objectStore('highlights');
      const index = store.index('url');
      const request = index.getAll(url);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getAllHighlights() {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['highlights'], 'readonly');
      const store = transaction.objectStore('highlights');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Settings operations
  async getSetting(key, defaultValue = null) {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result ? request.result.value : defaultValue);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getAllSettings() {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result || [];
        resolve(Object.fromEntries(entries.map(entry => [entry.key, entry.value])));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async replaceDataFromBackup(bundle) {
    const db = await this.initialize();
    const snippets = Array.isArray(bundle?.snippets) ? bundle.snippets : [];
    const highlights = Array.isArray(bundle?.highlights) ? bundle.highlights : [];
    const spaces = Array.isArray(bundle?.spaces) ? bundle.spaces : [];

    await new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets', 'highlights', 'spaces'], 'readwrite');
      const snippetsStore = transaction.objectStore('snippets');
      const highlightsStore = transaction.objectStore('highlights');
      const spacesStore = transaction.objectStore('spaces');
      const { rejectOnce } = bindWriteTransaction(transaction, resolve, reject, () => ({ success: true }));

      const requests = [
        snippetsStore.clear(),
        highlightsStore.clear(),
        spacesStore.clear()
      ];

      for (const request of requests) {
        request.onerror = () => {
          rejectOnce(request.error, 'Failed to clear data before restore');
        };
      }

      for (const snippet of snippets) {
        const request = snippetsStore.put(snippet);
        request.onerror = () => {
          rejectOnce(request.error, 'Failed to restore snippet');
        };
      }

      for (const highlight of highlights) {
        const request = highlightsStore.put(highlight);
        request.onerror = () => {
          rejectOnce(request.error, 'Failed to restore highlight');
        };
      }

      for (const space of spaces) {
        const request = spacesStore.put(space);
        request.onerror = () => {
          rejectOnce(request.error, 'Failed to restore space');
        };
      }
    });

    await this.runShadowSnippetTask('restoreBackupSnapshot', () => this.syncShadowSnippets());
    return {
      success: true,
      snippetCount: snippets.length,
      highlightCount: highlights.length,
      spaceCount: spaces.length
    };
  }

  async importData(bundle) {
    const rawSnippets = Array.isArray(bundle?.snippets) ? bundle.snippets : (Array.isArray(bundle?.cards) ? bundle.cards : null);
    if (!rawSnippets) throw new Error('Invalid backup: snippets array is required');
    const snippets = rawSnippets.map((item) => {
      if (!item || typeof item !== 'object') throw new Error('Invalid snippet in backup');
      const text = item.text ?? item.clipText ?? item.title;
      if (typeof text !== 'string') throw new Error('Invalid snippet text in backup');
      const created = Number(item.created_at ?? item.createdAt) || Date.now();
      for (const value of [created, item.updated_at ?? item.updatedAt, item.deleted_at ?? item.deletedAt, item.purged_at]) {
        if (value != null && (!Number.isFinite(Number(value)) || Number(value) < 0)) throw new Error('Invalid record date in backup');
      }
      return {
        ...item,
        id: typeof item.id === 'string' && item.id ? item.id : this.generateId(),
        type: item.type || (item.url ? 'web' : 'note'),
        text,
        created_at: created,
        updated_at: Number(item.updated_at ?? item.updatedAt) || created,
        deleted_at: item.deleted_at ?? item.deletedAt ?? null,
        purged_at: item.purged_at ?? null
      };
    });
    const highlights = Array.isArray(bundle.highlights) ? bundle.highlights : [];
    const spaces = Array.isArray(bundle.spaces) ? bundle.spaces.map(normalizeSyncSpace) : [];
    const settings = bundle.settings && typeof bundle.settings === 'object' && !Array.isArray(bundle.settings)
      // Legacy settings.js exported unset language/blockedSites as null. Treat
      // absent preferences as omitted, preserving the current local preference.
      ? Object.entries(bundle.settings).filter(([key, value]) => IMPORTABLE_SETTINGS.has(key) && value != null).map(([key, value]) => [key, key === 'columnCount' ? normalizeColumnCountSetting(value) : value])
      : [];
    for (const [key, value] of settings) {
      const valid = key === 'language' ? ['en', 'zh-CN', 'ja'].includes(value)
        : key === 'appearance' ? ['auto', 'light', 'dark'].includes(value)
        : key === 'columnCount' ? Number.isInteger(value) && value >= 3 && value <= 7
        : key === 'libraryGrouping' ? ['day', 'week', 'month', 'all'].includes(value)
        : Array.isArray(value) && value.every(item => typeof item === 'string');
      if (!valid) throw new Error('Invalid preference in backup: ' + key);
    }
    for (const highlight of highlights) {
      if (!highlight || !highlight.id || typeof highlight.id !== 'string' || typeof highlight.text !== 'string' || typeof highlight.url !== 'string') {
        throw new Error('Invalid highlight in backup');
      }
    }
    for (const space of spaces) {
      if (!space || typeof space.id !== 'string' || !space.id || typeof space.name !== 'string') throw new Error('Invalid space in backup');
    }
    const db = await this.initialize();
    let importedCount = 0;
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets', 'highlights', 'spaces', 'settings'], 'readwrite');
      const { rejectOnce } = bindWriteTransaction(transaction, resolve, reject, () => undefined);
      try {
        upsertSyncData(transaction, snippets, spaces, () => { importedCount++; });
        highlights.forEach((item) => transaction.objectStore('highlights').put(item));
        settings.forEach(([key, value]) => transaction.objectStore('settings').put({ key, value }));
      } catch (error) {
        transaction.abort();
        rejectOnce(error, 'Invalid backup data');
      }
    });
    if (settings.length) {
      try {
        await chromeStorageLocalSet(Object.fromEntries(settings));
      } catch (error) {
        console.warn('Imported settings mirror could not be updated:', error);
      }
    }
    await this.runShadowSnippetTask('importData', () => this.syncShadowSnippets());
    return { success: true, importedCount, highlightCount: highlights.length, spaceCount: spaces.length };
  }

  async clearAllData() {
    const db = await this.initialize();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets', 'highlights', 'settings', 'spaces'], 'readwrite');
      const { rejectOnce } = bindWriteTransaction(transaction, resolve, reject, () => undefined);
      try {
        ['snippets', 'highlights', 'settings', 'spaces'].forEach((name) => transaction.objectStore(name).clear());
      } catch (error) {
        transaction.abort();
        rejectOnce(error, 'Failed to clear data');
      }
    });
    await this.shadowQueue;
    await chrome.storage.local.clear();
    return { success: true };
  }

  async setSetting(key, value) {
    if (key === 'clipboardCaptureEnabled' && typeof value !== 'boolean') throw new Error('Invalid clipboard preference');
    if (key === 'columnCount') {
      value = normalizeColumnCountSetting(value);
      if (value == null) throw new Error('Choose 3 to 7 columns');
    }
    const db = await this.initialize();

    // Update IndexedDB
    const dbPromise = new Promise((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      const { rejectOnce } = bindWriteTransaction(transaction, resolve, reject, () => ({ success: true }));
      const request = store.put({ key, value });

      request.onerror = () => {
        rejectOnce(request.error, `Failed to save setting: ${key}`);
      };
    });

    // Update chrome.storage.local for real-time sync
    const storagePromise = new Promise((resolve, reject) => {
      if (chrome && chrome.storage) {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve({ success: true });
          }
        });
      } else {
        resolve({ success: true }); // Skip if chrome.storage not available
      }
    });

    // Wait for both operations to complete
    await Promise.all([dbPromise, storagePromise]);
    return { success: true };
  }

  async setClipboardConsent(choice) {
    if (!['accepted', 'declined'].includes(choice)) throw new Error('Invalid clipboard choice');
    const db = await this.initialize();
    const values = {
      clipboardCaptureConsent: { version: CLIPBOARD_CONSENT_VERSION, choice, decidedAt: Date.now() },
      clipboardCaptureEnabled: choice === 'accepted',
    };
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('settings', 'readwrite');
      const { rejectOnce } = bindWriteTransaction(transaction, resolve, reject, () => undefined);
      for (const [key, value] of Object.entries(values)) {
        const request = transaction.objectStore('settings').put({ key, value });
        request.onerror = () => rejectOnce(request.error, 'Could not save clipboard choice');
      }
    });
    await chromeStorageLocalSet(values);
    return clipboardConsentStatus(this);
  }

  async runShadowSnippetTask(label, executor) {
    this.shadowQueue = this.shadowQueue.then(executor).catch(error => {
      console.warn(`Shadow snippet mirror failed during ${label}:`, error);
      return { success: false, error: normalizeTransactionError(error, 'Shadow snippet mirror failed') };
    });
    return this.shadowQueue;
  }

  async upsertShadowSnippets(snippets) {
    const normalizedSnippets = (snippets || []).filter(snippet => snippet && snippet.id);
    if (!hasChromeStorageLocal() || normalizedSnippets.length === 0) {
      return { success: true, count: 0 };
    }

    const current = await chromeStorageLocalGet([SHADOW_SNIPPET_IDS_KEY]);
    const existingIds = Array.isArray(current[SHADOW_SNIPPET_IDS_KEY]) ? current[SHADOW_SNIPPET_IDS_KEY] : [];
    const idSet = new Set(existingIds);
    const payload = {};

    for (const snippet of normalizedSnippets) {
      idSet.add(snippet.id);
      payload[`${SHADOW_SNIPPET_PREFIX}${snippet.id}`] = snippet;
    }

    payload[SHADOW_SNIPPET_IDS_KEY] = Array.from(idSet);
    payload[SHADOW_SNIPPET_META_KEY] = {
      updated_at: Date.now(),
      count: payload[SHADOW_SNIPPET_IDS_KEY].length
    };

    await chromeStorageLocalSet(payload);
    return { success: true, count: normalizedSnippets.length };
  }

  async removeShadowSnippets(snippetIds) {
    const idsToRemove = (snippetIds || []).filter(Boolean);
    if (!hasChromeStorageLocal() || idsToRemove.length === 0) {
      return { success: true, count: 0 };
    }

    const current = await chromeStorageLocalGet([SHADOW_SNIPPET_IDS_KEY]);
    const existingIds = Array.isArray(current[SHADOW_SNIPPET_IDS_KEY]) ? current[SHADOW_SNIPPET_IDS_KEY] : [];
    const removeSet = new Set(idsToRemove);
    const nextIds = existingIds.filter(id => !removeSet.has(id));

    await chromeStorageLocalRemove(idsToRemove.map(id => `${SHADOW_SNIPPET_PREFIX}${id}`));
    await chromeStorageLocalSet({
      [SHADOW_SNIPPET_IDS_KEY]: nextIds,
      [SHADOW_SNIPPET_META_KEY]: {
        updated_at: Date.now(),
        count: nextIds.length
      }
    });

    return { success: true, count: idsToRemove.length };
  }

  async syncShadowSnippets() {
    if (!hasChromeStorageLocal()) {
      return { success: true, count: 0 };
    }

    const snippets = await this.getAllSnippetsIncludingDeleted();
    const current = await chromeStorageLocalGet([SHADOW_SNIPPET_IDS_KEY]);
    const previousIds = Array.isArray(current[SHADOW_SNIPPET_IDS_KEY]) ? current[SHADOW_SNIPPET_IDS_KEY] : [];
    const nextIds = snippets.map(snippet => snippet.id).filter(Boolean);
    const nextIdSet = new Set(nextIds);
    const staleKeys = previousIds
      .filter(id => !nextIdSet.has(id))
      .map(id => `${SHADOW_SNIPPET_PREFIX}${id}`);
    const payload = {
      [SHADOW_SNIPPET_IDS_KEY]: nextIds,
      [SHADOW_SNIPPET_META_KEY]: {
        updated_at: Date.now(),
        count: nextIds.length
      }
    };

    for (const snippet of snippets) {
      if (snippet && snippet.id) {
        payload[`${SHADOW_SNIPPET_PREFIX}${snippet.id}`] = snippet;
      }
    }

    await chromeStorageLocalSet(payload);

    if (staleKeys.length > 0) {
      await chromeStorageLocalRemove(staleKeys);
    }

    return { success: true, count: nextIds.length };
  }

  // Recent tags management
  async getRecentTags() {
    const tags = await this.getSetting('recentTags', []);
    return tags.slice(0, 8); // Return up to 8 tags
  }

  async updateRecentTags(newTags) {
    const currentTags = await this.getRecentTags();

    // Add new tags to the front, remove duplicates
    const updatedTags = [...new Set([...newTags, ...currentTags])];

    await this.setSetting('recentTags', updatedTags);
  }

  // Utility methods
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Database instance - initialize only when needed
let dbPromise = null;
let syncInFlight = null;
let backupInFlight = null;
let maintenanceInFlight = null;
async function withDataMaintenance(task) {
  if (maintenanceInFlight) throw new Error('Data operation in progress. Try again shortly.');
  maintenanceInFlight = (async () => {
    await Promise.allSettled([syncInFlight, backupInFlight].filter(Boolean));
    return task();
  })();
  try { return await maintenanceInFlight; } finally { maintenanceInFlight = null; }
}

function isSupportedSyncType(type) {
  return type === 'webdav' || type === 'googledrive';
}

function getAutoSyncPeriod(config = {}) {
  return AUTO_SYNC_INTERVALS[config.autoSyncInterval] || 0;
}

function getAutoBackupPeriod(config = {}) {
  return AUTO_SYNC_INTERVALS[config.autoBackupInterval] || 0;
}

function getAutoBackupRetention(config = {}) {
  return AUTO_BACKUP_RETENTION[config.autoBackupInterval] || 30;
}

function clearAlarm(name) {
  return new Promise((resolve, reject) => {
    if (!chrome.alarms) {
      resolve(false);
      return;
    }

    chrome.alarms.clear(name, (wasCleared) => {
      if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
      resolve(Boolean(wasCleared));
    });
  });
}

// Create the alarm only when it is missing or its period changed. Re-creating it on every
// service-worker wake would restart the countdown, so long periods would never fire.
async function ensureAlarm(name, delayInMinutes, periodInMinutes) {
  const existing = await chrome.alarms.get(name);
  if (existing && existing.periodInMinutes === periodInMinutes) {
    return;
  }
  await chrome.alarms.create(name, { delayInMinutes, periodInMinutes });
}

function ensureAutoCleanupAlarm() {
  if (!chrome.alarms) {
    console.warn('Chrome alarms API not available');
    return;
  }

  ensureAlarm(AUTO_CLEANUP_ALARM, 1, 1440).catch((error) => {
    console.warn('Could not schedule auto cleanup:', error);
  });
}

async function getDatabase() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = new iSnipsDatabase();
      await db.initialize();
      syncService.setDatabase(db);
      return db;
    })().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

async function scheduleAutoSyncAlarm(config = null) {
  if (!chrome.alarms) {
    console.warn('Chrome alarms API not available');
    return false;
  }

  const db = await getDatabase();
  const syncConfig = config || await db.getSetting('syncConfig', { type: 'none', autoSyncInterval: 'off' });
  const periodInMinutes = getAutoSyncPeriod(syncConfig);

  if (!isSupportedSyncType(syncConfig.type) || !periodInMinutes) {
    await clearAlarm(AUTO_SYNC_ALARM);
    return false;
  }

  await ensureAlarm(AUTO_SYNC_ALARM, periodInMinutes, periodInMinutes);

  return true;
}

async function scheduleAutoBackupAlarm(config = null) {
  if (!chrome.alarms) {
    console.warn('Chrome alarms API not available');
    return false;
  }

  const db = await getDatabase();
  const syncConfig = config || await db.getSetting('syncConfig', {
    type: 'none',
    autoSyncInterval: 'off',
    autoBackupInterval: 'off'
  });
  const periodInMinutes = getAutoBackupPeriod(syncConfig);

  if (!periodInMinutes) {
    await clearAlarm(AUTO_BACKUP_ALARM);
    return false;
  }

  await ensureAlarm(AUTO_BACKUP_ALARM, periodInMinutes, periodInMinutes);

  return true;
}

async function buildBackupBundle(db, source = 'manual') {
  const [snippets, highlights, settings, spaces] = await Promise.all([
    db.getAllSnippetsIncludingDeleted(),
    db.getAllHighlights(),
    db.getAllSettings(),
    db.getStoredSpaces()
  ]);

  // Never export sync endpoints, credentials, tokens or internal mirror state.
  const portableSettings = Object.fromEntries(Object.entries(settings).filter(([key]) => IMPORTABLE_SETTINGS.has(key)));

  return {
    version: '3.1.0',
    createdAt: Date.now(),
    source,
    snippets,
    highlights,
    settings: portableSettings,
    spaces
  };
}

async function writeBackupSnapshot(bundle, config = {}) {
  const snapshotId = `${bundle.createdAt}-${Math.random().toString(36).slice(2, 10)}`;
  const retentionLimit = getAutoBackupRetention(config);
  const current = await chromeStorageLocalGet([BACKUP_SNAPSHOT_IDS_KEY]);
  const existingIds = Array.isArray(current[BACKUP_SNAPSHOT_IDS_KEY]) ? current[BACKUP_SNAPSHOT_IDS_KEY] : [];
  const nextIds = [snapshotId, ...existingIds].slice(0, retentionLimit);
  const retainedSet = new Set(nextIds);
  const staleKeys = existingIds
    .filter(id => !retainedSet.has(id))
    .map(id => `${BACKUP_SNAPSHOT_PREFIX}${id}`);

  await chromeStorageLocalSet({
    [`${BACKUP_SNAPSHOT_PREFIX}${snapshotId}`]: bundle,
    [BACKUP_SNAPSHOT_IDS_KEY]: nextIds,
    [BACKUP_SNAPSHOT_META_KEY]: {
      updated_at: bundle.createdAt,
      last_snapshot_id: snapshotId,
      count: nextIds.length
    }
  });

  if (staleKeys.length > 0) {
    await chromeStorageLocalRemove(staleKeys);
  }

  return {
    snapshotId,
    snapshotCount: nextIds.length
  };
}

async function listBackupSnapshots(limit = 20) {
  const current = await chromeStorageLocalGet([BACKUP_SNAPSHOT_IDS_KEY]);
  const snapshotIds = Array.isArray(current[BACKUP_SNAPSHOT_IDS_KEY]) ? current[BACKUP_SNAPSHOT_IDS_KEY] : [];
  const selectedIds = snapshotIds.slice(0, limit);

  if (selectedIds.length === 0) {
    return { success: true, snapshots: [] };
  }

  const snapshotKeys = selectedIds.map(id => `${BACKUP_SNAPSHOT_PREFIX}${id}`);
  const snapshotItems = await chromeStorageLocalGet(snapshotKeys);
  const snapshots = selectedIds.map(id => {
    const bundle = snapshotItems[`${BACKUP_SNAPSHOT_PREFIX}${id}`] || {};
    return {
      id,
      createdAt: bundle.createdAt || null,
      source: bundle.source || 'unknown',
      snippetCount: Array.isArray(bundle.snippets) ? bundle.snippets.length : 0,
      highlightCount: Array.isArray(bundle.highlights) ? bundle.highlights.length : 0,
      spaceCount: Array.isArray(bundle.spaces) ? bundle.spaces.length : 0
    };
  });

  return { success: true, snapshots };
}

async function restoreBackupSnapshot(snapshotId) {
  if (!snapshotId) {
    return { success: false, error: 'Backup snapshot id is required' };
  }

  const snapshotItems = await chromeStorageLocalGet([`${BACKUP_SNAPSHOT_PREFIX}${snapshotId}`]);
  const bundle = snapshotItems[`${BACKUP_SNAPSHOT_PREFIX}${snapshotId}`];
  if (!bundle) {
    return { success: false, error: 'Backup snapshot not found' };
  }

  const db = await getDatabase();
  const restoreResult = await db.replaceDataFromBackup(bundle);
  broadcastDataChange('backupRestored', {
    snapshotId,
    restoredAt: Date.now()
  });
  broadcastDataChange('cardSaved');

  return {
    success: true,
    snapshotId,
    restoredAt: Date.now(),
    ...restoreResult
  };
}

async function performSync(requestedType = null, source = 'manual', options = {}) {
  if (maintenanceInFlight) return { success: false, error: 'Data operation in progress. Try again shortly.' };
  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    const db = await getDatabase();
    const syncConfig = await db.getSetting('syncConfig', { type: 'none', autoSyncInterval: 'off' });
    const type = requestedType || syncConfig.type;

    if (!isSupportedSyncType(type)) {
      return { success: false, error: 'Sync not configured' };
    }

    if (type === 'webdav' && syncConfig.type !== 'webdav') {
      return { success: false, error: 'WebDAV not configured' };
    }

    if (type === 'googledrive' && syncConfig.type !== 'googledrive') {
      return { success: false, error: 'Google Drive not configured' };
    }

    const result = type === 'webdav'
      ? await syncService.syncWebDAV(syncConfig)
      : await syncService.syncGoogleDrive({ interactive: source !== 'auto', allowCreate: source !== 'auto' && options.allowCreate === true });

    if (!result.success) {
      return result;
    }

    const lastSyncTime = Date.now();
    await db.setSetting('lastSyncTime', lastSyncTime);

    broadcastDataChange('syncCompleted', {
      lastSyncTime,
      source,
      type
    });
    broadcastDataChange('cardSaved');

    return { ...result, lastSyncTime };
  })().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}

async function performBackup(source = 'manual') {
  if (maintenanceInFlight) return { success: false, error: 'Data operation in progress. Try again shortly.' };
  if (backupInFlight) {
    return backupInFlight;
  }

  backupInFlight = (async () => {
    const db = await getDatabase();
    const syncConfig = await db.getSetting('syncConfig', {
      type: 'none',
      autoSyncInterval: 'off',
      autoBackupInterval: 'off'
    });
    // Ignore an already-dispatched alarm after the user has switched automatic backup off.
    if (source === 'auto' && !getAutoBackupPeriod(syncConfig)) return { success: true, skipped: true };
    const bundle = await buildBackupBundle(db, source);
    const snapshot = await writeBackupSnapshot(bundle, syncConfig);
    const lastBackupTime = bundle.createdAt;

    await db.setSetting('lastBackupTime', lastBackupTime);

    broadcastDataChange('backupCompleted', {
      lastBackupTime,
      source,
      snapshotId: snapshot.snapshotId,
      snapshotCount: snapshot.snapshotCount
    });

    return {
      success: true,
      lastBackupTime,
      snapshotId: snapshot.snapshotId,
      snapshotCount: snapshot.snapshotCount
    };
  })().catch((error) => {
    console.error('Auto backup error:', error);
    return {
      success: false,
      error: normalizeTransactionError(error, 'Backup failed')
    };
  }).finally(() => {
    backupInFlight = null;
  });

  return backupInFlight;
}

function isBlockedUrl(url, sites) {
  const host = new URL(url).hostname.toLowerCase();
  return Array.isArray(sites) && sites.some(site => typeof site === 'string' && (host === site.toLowerCase() || host.endsWith('.' + site.toLowerCase())));
}
async function authorizeMessage(message, sender, db) {
  if (!message || typeof message.action !== 'string') throw new Error('Invalid message');
  if (sender.id !== chrome.runtime.id) throw new Error('Untrusted sender');
  if (sender.url?.startsWith(chrome.runtime.getURL(''))) return message;
  const actions = new Set(['getSetting', 'saveSnippet', 'getHighlightsForUrl', 'storeHighlight', 'captureClipboard']);
  if (!sender.tab || !actions.has(message.action)) throw new Error('Action unavailable from a web page');
  if (message.action === 'getSetting') {
    if (!['language', 'blockedSites', 'clipboardCaptureEnabled'].includes(message.key)) throw new Error('Setting unavailable from a web page');
    return message;
  }
  const url = new URL(sender.url);
  if (!['https:', 'http:', 'file:'].includes(url.protocol)) throw new Error('Unsupported page');
  if (isBlockedUrl(url.href, await db.getSetting('blockedSites', []))) throw new Error('Clipping is disabled on this site');
  if (message.action === 'getHighlightsForUrl') return { ...message, url: url.href };
  if (message.action === 'saveSnippet') {
    if (typeof message.data?.text !== 'string' || !message.data.text.trim()) throw new Error('No selected text');
    return { action: 'saveSnippet', data: { type: 'web', text: message.data.text, url: url.href, domain: url.hostname, title: typeof message.data.title === 'string' ? message.data.title : '' } };
  }
  if (message.action === 'captureClipboard') {
    if (sender.tab.incognito) return { action: 'captureClipboard', data: null };
    return { action: 'captureClipboard', data: { text: message.data?.text, title: typeof message.data?.title === 'string' ? message.data.title : '', url: url.href } };
  }
  const h = message.highlight;
  if (!h || typeof h.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(h.id) || typeof h.text !== 'string') throw new Error('Invalid highlight');
  return { action: 'storeHighlight', highlight: { ...h, url: url.href } };
}

// Message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      const db = await getDatabase();
      const authorized = await authorizeMessage(message, sender, db);
      if (maintenanceInFlight && !['getSetting', 'getSnippets', 'getDeletedSnippets', 'getHighlightsForUrl', 'getClipboardHistory', 'getLibraryPage', 'getSnippet', 'getSpaces'].includes(authorized.action)) throw new Error('Data operation in progress. Try again shortly.');
      sendResponse(await handleMessage(db, authorized));
    } catch (error) {
      sendResponse({ success: false, error: normalizeTransactionError(error), ...(error?.code ? { code: error.code } : {}) });
    }
  })();
  return true;
});

async function notifyContentPreferences() {
  const tabs = await chrome.tabs.query({});
  await Promise.allSettled(tabs.filter(tab => tab.id != null).map(tab =>
    chrome.tabs.sendMessage(tab.id, { action: 'capturePreferencesChanged' })
  ));
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-to-isnips' && tab?.id != null) {
    chrome.tabs.sendMessage(tab.id, { action: 'captureSnippet' }).catch(err => {
      console.error('Failed to send capture message to tab:', err);
    });
  }
});

async function broadcastDataChange(action, data = null) {
  // 1. Send to other extension components (popups, side panels)
  chrome.runtime.sendMessage({ action, ...data ? { data } : {} }).catch(() => { });

  // 2. Send to all tabs that are extension pages (like library.html)
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url && tab.url.includes('chrome-extension://')) {
        chrome.tabs.sendMessage(tab.id, { action, ...data ? { data } : {} }).catch(() => { });
      }
    });
  });
}

let dataOperations = Promise.resolve();
const MUTATING_ACTIONS = new Set([
  'saveSnippet', 'saveIndexCard', 'updateSnippet', 'updateIndexCard',
  'softDeleteSnippet', 'softDeleteIndexCard', 'restoreSnippet', 'restoreCard',
  'purgeSnippet', 'emptyTrash', 'autoDeleteOldTrash', 'storeHighlight',
  'importData', 'clearAllData', 'restoreBackupSnapshot', 'setSetting', 'disconnectGoogleDrive',
  'captureClipboard', 'deleteClipboardEntry', 'clearClipboardHistory', 'promoteClipboardEntry',
  'createSpace', 'updateSpace', 'deleteSpace', 'moveSnippet', 'setClipboardConsent'
]);
function handleMessage(db, message) {
  if (!MUTATING_ACTIONS.has(message.action)) return dispatchMessage(db, message);
  // Complete prior local writes (including recovery mirrors) before a clear or restore.
  const operation = dataOperations.then(() => dispatchMessage(db, message));
  dataOperations = operation.catch(() => {});
  return operation;
}

async function dispatchMessage(db, message) {
  try {
    switch (message.action) {
      case 'getLibraryPage':
        return await LibraryData.query(db, message.query || {});
      case 'getSnippet': {
        const snippet = await db.getSnippetById(message.cardId);
        if (!snippet || snippet.purged_at) throw new Error('Record no longer exists');
        return { success: true, snippet };
      }
      case 'getSpaces':
        return { success: true, spaces: (await db.getStoredSpaces()).filter(space => !space.deleted_at) };
      case 'createSpace': {
        const result = await db.createSpace({ name: message.name });
        broadcastDataChange('spacesChanged');
        return result;
      }
      case 'updateSpace': {
        const result = await db.updateSpace(message.spaceId, { name: message.name });
        broadcastDataChange('spacesChanged');
        return result;
      }
      case 'deleteSpace': {
        const result = await db.deleteSpace(message.spaceId);
        broadcastDataChange('spacesChanged');
        broadcastDataChange('cardSaved');
        return result;
      }
      case 'moveSnippet': {
        const result = await db.moveSnippet(message.cardId, message.spaceId);
        broadcastDataChange('cardSaved');
        return result;
      }

      case 'getClipboardHistory': {
        const all = await clipboardHistory.getHistory();
        const search = typeof message.search === 'string' ? message.search.slice(0, 200).toLowerCase() : '';
        const items = search ? all.filter(item => [item.text, item.domain, item.title, item.url].some(value => String(value || '').toLowerCase().includes(search))) : all;
        return { ...await clipboardConsentStatus(db), totalCount: all.length, items: message.preview ? items.map(item => ({ ...LibraryData.preview(item), copied_at: item.copied_at })) : items };
      }
      case 'getClipboardConsentStatus':
        return clipboardConsentStatus(db);
      case 'setClipboardConsent': {
        const result = await db.setClipboardConsent(message.choice);
        void notifyContentPreferences().catch(() => {});
        broadcastDataChange('clipboardConsentChanged');
        broadcastDataChange('clipboardChanged');
        return result;
      }
      case 'getClipboardEntry': {
        const entry = (await clipboardHistory.getHistory()).find(item => item.id === message.entryId);
        if (!entry) throw new Error('Clipboard entry no longer exists');
        return { success: true, snippet: entry };
      }
      case 'captureClipboard': {
        if (!message.data || !(await clipboardConsentStatus(db)).enabled) return { success: true, changed: false };
        // Recheck inside the write queue so disabling a site takes effect before queued captures.
        if (isBlockedUrl(message.data.url, await db.getSetting('blockedSites', []))) return { success: true, changed: false };
        const result = await clipboardHistory.capture(message.data);
        if (result.changed) broadcastDataChange('clipboardChanged');
        return result;
      }
      case 'deleteClipboardEntry': {
        const result = await clipboardHistory.remove(message.entryId);
        broadcastDataChange('clipboardChanged');
        return result;
      }
      case 'clearClipboardHistory': {
        const result = await clipboardHistory.clear();
        broadcastDataChange('clipboardChanged');
        return result;
      }
      case 'promoteClipboardEntry': {
        const result = await clipboardHistory.promote(message.entryId, db);
        broadcastDataChange('cardSaved', result.snippet);
        broadcastDataChange('clipboardChanged');
        return result;
      }

      case 'saveSnippet':
      case 'saveIndexCard':
        const saveResult = await db.saveSnippet(message.data);
        if (saveResult.success) {
          broadcastDataChange('cardSaved', saveResult.snippet);
        }
        return saveResult;

      case 'getSnippets':
      case 'getIndexCards':
        const cards = await db.getSnippets(message.filters);
        return { success: true, cards };

      case 'getAllSnippets':
        return { success: true, cards: await db.getAllSnippetsIncludingDeleted() };

      case 'getExportData':
        return { success: true, bundle: await buildBackupBundle(db, 'export') };

      case 'importData': {
        const result = await db.importData(message.bundle);
        const config = await db.getSetting('syncConfig', { type: 'none' });
        await scheduleAutoSyncAlarm(config);
        await scheduleAutoBackupAlarm(config);
        broadcastDataChange('cardSaved');
        void notifyContentPreferences().catch(() => {});
        return result;
      }

      case 'clearAllData': {
        const result = await withDataMaintenance(async () => { await googleDriveAuth.forgetWeb(); return db.clearAllData(); });
        await chrome.storage.session?.clear();
        await scheduleAutoSyncAlarm({ type: 'none', autoSyncInterval: 'off' });
        await scheduleAutoBackupAlarm({ autoBackupInterval: 'off' });
        broadcastDataChange('cardSaved');
        void notifyContentPreferences().catch(() => {});
        return result;
      }

      case 'updateSnippet':
      case 'updateIndexCard':
        const updateResult = await db.updateSnippet(message.cardId, message.updates);
        if (updateResult.success) {
          broadcastDataChange('cardSaved');
        }
        return updateResult;

      case 'softDeleteSnippet':
      case 'softDeleteIndexCard':
        const softDeleteResult = await db.softDeleteSnippet(message.cardId);
        if (softDeleteResult.success) {
          broadcastDataChange('cardSaved');
        }
        return softDeleteResult;

      case 'getDeletedSnippets':
      case 'getDeletedCards':
        const deletedCards = await db.getDeletedSnippets();
        return { success: true, cards: deletedCards };

      case 'restoreSnippet':
      case 'restoreCard':
        const restoreResult = await db.restoreSnippet(message.cardId);
        if (restoreResult.success) {
          broadcastDataChange('cardSaved');
        }
        return restoreResult;

      case 'purgeSnippet':
        const purgeResult = await db.purgeSnippet(message.cardId);
        if (purgeResult.success) {
          broadcastDataChange('cardSaved');
        }
        return purgeResult;

      case 'emptyTrash':
        const emptyResult = await db.emptyTrash();
        if (emptyResult.success) {
          broadcastDataChange('cardSaved');
        }
        return emptyResult;

      case 'autoDeleteOldTrash':
        return await db.autoDeleteOldTrash();

      case 'storeHighlight':
        return await db.storeHighlight(message.highlight);

      case 'getHighlightsForUrl':
        const highlights = await db.getHighlightsForUrl(message.url);
        return { success: true, highlights };

      case 'openLibraryWithHighlight':
        // Open library and focus on specific highlight
        chrome.tabs.create({
          url: chrome.runtime.getURL('library.html') + '#highlight-' + message.highlightId
        });
        return { success: true };

      case 'openTab':
        chrome.tabs.create({ url: message.url });
        return { success: true };

      case 'openSettings':
        chrome.runtime.openOptionsPage();
        return { success: true };

      case 'getSetting':
        if (message.key === 'clipboardCaptureEnabled') return { success: true, value: (await clipboardConsentStatus(db)).enabled };
        const settingValue = await db.getSetting(message.key, message.defaultValue);
        return { success: true, value: settingValue };

      case 'setSetting': {
        if (message.key === 'clipboardCaptureConsent') throw new Error('Use the clipboard consent action');
        if (message.key === 'clipboardCaptureEnabled' && message.value === true && (await clipboardConsentStatus(db)).consentRequired)
          throw Object.assign(new Error('Confirm clipboard auto-save first'), { code: 'CLIPBOARD_CONSENT_REQUIRED' });
        if (message.key === 'syncConfig' && (syncInFlight || backupInFlight)) throw new Error('Sync or backup is running. Try again shortly.');
        const previousConfig = message.key === 'syncConfig' ? await db.getSetting('syncConfig', { type: 'none' }) : null;
        const setResult = await db.setSetting(message.key, message.value);
        if (setResult.success && message.key === 'syncConfig') {
          if (previousConfig?.type !== message.value?.type &&
              (previousConfig?.type === 'googledrive' || message.value?.type === 'googledrive' || message.value?.type === 'none')) {
            const method = await googleDriveAuth.method();
            await googleDriveAuth.forgetWeb();
            if (method === 'native') await chrome.identity.clearAllCachedAuthTokens?.();
          }
          await scheduleAutoSyncAlarm(message.value);
          await scheduleAutoBackupAlarm(message.value);
          broadcastDataChange('googleAuthChanged');
        }
        if (setResult.success && ['blockedSites', 'language', 'clipboardCaptureEnabled'].includes(message.key)) void notifyContentPreferences().catch(() => {});
        if (setResult.success && message.key === 'clipboardCaptureEnabled') broadcastDataChange('clipboardChanged');
        return setResult;
      }

      case 'languageChanged':
        // Broadcast language change to all extension pages
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            if (tab.url && tab.url.includes('chrome-extension://')) {
              chrome.tabs.sendMessage(tab.id, {
                action: 'languageChanged',
                language: message.language
              }).catch(() => {
                // Ignore errors for tabs that don't have listeners
              });
            }
          });
        });

        // Also try to send to the options page if it's open
        if (chrome.runtime.openOptionsPage) {
          // The options page itself should handle its own updates
        }

        return { success: true };

      case 'themeChanged':
        // Broadcast theme change to all extension pages
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            if (tab.url && tab.url.includes('chrome-extension://')) {
              chrome.tabs.sendMessage(tab.id, {
                action: 'themeChanged',
                theme: message.theme
              }).catch(() => { });
            }
          });
        });
        return { success: true };

      case 'getGoogleAuthStatus': {
        await googleDriveAuth.noteBrowser(message.browser);
        const config = await db.getSetting('syncConfig', { type: 'none' });
        const status = await googleDriveAuth.status();
        return { success: true, ...status, connected: config.type === 'googledrive' && status.connected };
      }
      case 'connectGoogleDrive':
      case 'connectGoogleDriveWeb': {
        if (syncInFlight || maintenanceInFlight) throw new Error('Sync or data operation is running');
        if ((await db.getSetting('syncConfig', { type: 'none' })).type !== 'googledrive') throw new Error('Google Drive not configured');
        await googleDriveAuth.noteBrowser(message.browser);
        if (message.action === 'connectGoogleDriveWeb') await googleDriveAuth.connectWeb();
        else await googleDriveAuth.connect();
        if ((await db.getSetting('syncConfig', { type: 'none' })).type !== 'googledrive') {
          await googleDriveAuth.forgetWeb();
          throw new GoogleAuthError('AUTH_CHANGED');
        }
        broadcastDataChange('googleAuthChanged');
        return { success: true, ...await googleDriveAuth.status() };
      }
      case 'disconnectGoogleDrive': {
        if (syncInFlight) throw new Error('Sync is running. Try again shortly.');
        const config = await db.getSetting('syncConfig', {});
        await db.setSetting('syncConfig', { ...config, type: 'none', last_remote_etag: null });
        await scheduleAutoSyncAlarm({ type: 'none' });
        const method = await googleDriveAuth.method();
        let token = null;
        if (method === 'native') {
          try { token = await syncService._getGoogleToken(false); } catch { /* No cached login. */ }
        }
        await googleDriveAuth.forgetWeb();
        broadcastDataChange('googleAuthChanged');
        if (method === 'web') return { success: true };
        await chrome.identity.clearAllCachedAuthTokens();
        if (token) {
          const response = await fetch('https://oauth2.googleapis.com/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ token }).toString(),
            signal: AbortSignal.timeout(20000)
          });
          if (!response.ok && response.status !== 400) throw new Error('Sync stopped. Could not revoke Google access; remove it in your Google account.');
        }
        return { success: true };
      }

      case 'syncWebDAV':
        return await performSync('webdav');

      case 'syncGoogleDrive':
        return await performSync('googledrive', 'manual', { allowCreate: message.allowCreate === true });

      case 'createBackup':
        return await performBackup(message.source || 'manual');

      case 'listBackupSnapshots':
        return await listBackupSnapshots(message.limit || 20);

      case 'restoreBackupSnapshot':
        return await withDataMaintenance(() => restoreBackupSnapshot(message.snapshotId));

      case 'requestPersistentStorage':
        return await requestPersistentStorage(message.source || 'message');

      default:
        return { success: false, error: 'Unknown action' };
    }
  } catch (error) {
    console.error('Message handling error:', error);
    return { success: false, error: normalizeTransactionError(error), ...(error?.code ? { code: error.code } : {}) };
  }
}

// Handle action button click - open side panel
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (error) {
    console.error('Error opening side panel:', error);
  }
});

// Handle shortcuts/commands
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'capture-snippet') {
    // Send message to active tab content script to capture text
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { action: 'captureSnippet' }).catch((err) => {
        console.warn('ClipIndex: Could not send captureSnippet message to tab', tab.id, err);
      });
    }
  }
});

// Auto-cleanup old trash items (runs daily)
async function scheduleAutoCleanup() {
  try {
    const db = await getDatabase();
    const result = await db.autoDeleteOldTrash();
    if (result.deletedCount > 0) {
    }
  } catch (error) {
    console.error('Auto cleanup error:', error);
  }
}

// Schedule daily cleanup - wait for alarms API to be available
if (chrome.alarms) {
  ensureAutoCleanupAlarm();
  void scheduleAutoSyncAlarm().catch(error => console.warn('Could not schedule sync:', error));
  void scheduleAutoBackupAlarm().catch(error => console.warn('Could not schedule backup:', error));
  void requestPersistentStorage('service-worker-init');

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === AUTO_CLEANUP_ALARM) {
      scheduleAutoCleanup();
    } else if (alarm.name === AUTO_SYNC_ALARM) {
      performSync(null, 'auto').catch((error) => {
        console.error('Auto sync error:', error);
      });
    } else if (alarm.name === AUTO_BACKUP_ALARM) {
      performBackup('auto').catch((error) => {
        console.error('Auto backup alarm error:', error);
      });
    }
  });
} else {
  console.warn('Chrome alarms API not available');
}

chrome.runtime.onStartup?.addListener(() => {
  ensureAutoCleanupAlarm();
  void scheduleAutoSyncAlarm().catch(error => console.warn('Could not schedule sync:', error));
  void scheduleAutoBackupAlarm().catch(error => console.warn('Could not schedule backup:', error));
  void requestPersistentStorage('runtime-startup');
});

// Initialize default data on install
chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    ensureAutoCleanupAlarm();
    void requestPersistentStorage('runtime-installed');

    // Initialize preferences without inserting sample records
    const db = await getDatabase();

    // Set initial language based on browser environment
    const existingLang = await db.getSetting('language');
    if (!existingLang) {
      const uiLang = chrome.i18n.getUILanguage();
      let defaultLang = 'en';
      if (uiLang.startsWith('zh')) {
        defaultLang = 'zh-CN';
      } else if (uiLang.startsWith('ja')) {
        defaultLang = 'ja';
      }
      await db.setSetting('language', defaultLang);
    }

    // Initialize context menu
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'save-to-isnips',
        title: chrome.i18n.getMessage('context_menu_save'),
        contexts: ['selection']
      });
    });

    // New installations start with an empty library; upgrades keep every existing record.

    // Run initial cleanup
    await scheduleAutoCleanup();
    await scheduleAutoSyncAlarm();
    await scheduleAutoBackupAlarm();
    if (['install', 'update'].includes(details.reason) && (await clipboardConsentStatus(db)).needsNotice)
      await chrome.tabs.create({ url: chrome.runtime.getURL('library.html#clipboard-consent') });
  } catch (error) {
    console.error('Error during installation:', error);
  }
});
