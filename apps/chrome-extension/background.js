// Background service worker for iSnips extension
// Handles data storage and message routing
// Import sync service
importScripts('sync.js');

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

  // Generate localized sample data for first-time users
  getSampleData(lang) {
    const now = Date.now();
    const samples = {
      'zh-CN': [
        {
          url: 'https://isnips.app/welcome',
          type: 'web',
          text: '欢迎使用 iSnips！在网页上选中文字，右键或按 Alt+C 即可存为“摘录”。',
          domain: 'isnips.app',
          title: '入门指南',
          created_at: now - 86400000,
          updated_at: now - 86400000
        },
        {
          url: null,
          type: 'note',
          text: '这是您的第一条“闪记”。您可以随时在下方记录脑海中闪现的灵感。',
          domain: null,
          created_at: now - 3600000,
          updated_at: now - 3600000
        }
      ],
      'en': [
        {
          url: 'https://isnips.app/welcome',
          type: 'web',
          text: 'Welcome to iSnips! Select text on any page, right-click or press Alt+C to save it as a "Clip".',
          domain: 'isnips.app',
          title: 'Getting Started',
          created_at: now - 86400000,
          updated_at: now - 86400000
        },
        {
          url: null,
          type: 'note',
          text: 'This is your first "Flash Note". You can record your quick thoughts and inspirations below anytime.',
          domain: null,
          created_at: now - 3600000,
          updated_at: now - 3600000
        }
      ],
      'ja': [
        {
          url: 'https://isnips.app/welcome',
          type: 'web',
          text: 'iSnips へようこそ！テキストを選択して右クリック、または Alt+C で「摘録」として保存できます。',
          domain: 'isnips.app',
          title: 'スタートガイド',
          created_at: now - 86400000,
          updated_at: now - 86400000
        },
        {
          url: null,
          type: 'note',
          text: 'これは最初の「閃記」です。下の入力欄から、いつでもアイデアを素早くメモできます。',
          domain: null,
          created_at: now - 3600000,
          updated_at: now - 3600000
        }
      ]
    };

    return samples[lang] || samples['en'];
  }

  // Snippets operations
  async saveSnippet(snippetData) {
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
          updatedSnippet = { ...snippet, ...updates, updated_at: Date.now() };
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
    const db = await this.initialize();
    const space = {
      id: spaceData.id || this.generateId(),
      name: spaceData.name,
      createdAt: Date.now(),
      order: spaceData.order || 0
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['spaces'], 'readwrite');
      const store = transaction.objectStore('spaces');
      const request = store.add(space);

      request.onsuccess = () => {
        resolve({ success: true, space });
      };

      request.onerror = () => {
        reject({ success: false, error: request.error });
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
        let spaces = request.result;
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
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['spaces'], 'readwrite');
      const store = transaction.objectStore('spaces');
      const getRequest = store.get(spaceId);

      getRequest.onsuccess = () => {
        const space = getRequest.result;
        if (space) {
          const updatedSpace = { ...space, ...updates };
          const putRequest = store.put(updatedSpace);

          putRequest.onsuccess = () => {
            resolve({ success: true, space: updatedSpace });
          };

          putRequest.onerror = () => {
            reject({ success: false, error: putRequest.error });
          };
        } else {
          reject({ success: false, error: 'Space not found' });
        }
      };

      getRequest.onerror = () => {
        reject({ success: false, error: getRequest.error });
      };
    });
  }

  async deleteSpace(spaceId) {
    // Don't allow deleting inbox
    if (spaceId === 'inbox') {
      return Promise.reject({ success: false, error: 'Cannot delete Inbox' });
    }

    const db = await this.initialize();
    const result = await new Promise((resolve, reject) => {
      const transaction = db.transaction(['spaces', 'snippets'], 'readwrite');
      const spacesStore = transaction.objectStore('spaces');
      const snippetsStore = transaction.objectStore('snippets');
      const cardsRequest = snippetsStore.getAll();

      cardsRequest.onsuccess = () => {
        const cards = cardsRequest.result || [];
        const updatePromises = cards
          .filter(card => card.spaceId === spaceId)
          .map(card => {
            return new Promise((res, rej) => {
              const updateRequest = snippetsStore.put({ ...card, spaceId: 'inbox', updated_at: Date.now() });
              updateRequest.onsuccess = () => res();
              updateRequest.onerror = () => rej(updateRequest.error);
            });
          });

        Promise.all(updatePromises).then(() => {
          const deleteRequest = spacesStore.delete(spaceId);
          deleteRequest.onsuccess = () => {
            resolve({ success: true, movedCards: updatePromises.length });
          };
          deleteRequest.onerror = () => {
            reject({ success: false, error: deleteRequest.error });
          };
        }).catch(error => {
          reject({ success: false, error });
        });
      };

      cardsRequest.onerror = () => {
        reject({ success: false, error: cardsRequest.error });
      };
    });

    if (result?.success && result.movedCards > 0) {
      await this.runShadowSnippetTask('deleteSpace', () => this.syncShadowSnippets());
    }

    return result;
  }

  // Highlights operations
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

  async setSetting(key, value) {
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

  async runShadowSnippetTask(label, executor) {
    try {
      return await executor();
    } catch (error) {
      console.warn(`Shadow snippet mirror failed during ${label}:`, error);
      return { success: false, error: normalizeTransactionError(error, 'Shadow snippet mirror failed') };
    }
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
let dbInstance = null;
let syncInFlight = null;
let backupInFlight = null;

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
  return new Promise((resolve) => {
    if (!chrome.alarms) {
      resolve(false);
      return;
    }

    chrome.alarms.clear(name, (wasCleared) => {
      resolve(Boolean(wasCleared));
    });
  });
}

function ensureAutoCleanupAlarm() {
  if (!chrome.alarms) {
    console.warn('Chrome alarms API not available');
    return;
  }

  chrome.alarms.create(AUTO_CLEANUP_ALARM, { delayInMinutes: 1, periodInMinutes: 1440 });
}

async function getDatabase() {
  if (!dbInstance) {
    dbInstance = new iSnipsDatabase();
    await dbInstance.initialize();
    syncService.setDatabase(dbInstance);
  }

  return dbInstance;
}

async function scheduleAutoSyncAlarm(config = null) {
  if (!chrome.alarms) {
    console.warn('Chrome alarms API not available');
    return false;
  }

  const db = await getDatabase();
  const syncConfig = config || await db.getSetting('syncConfig', { type: 'none', autoSyncInterval: 'off' });
  const periodInMinutes = getAutoSyncPeriod(syncConfig);

  await clearAlarm(AUTO_SYNC_ALARM);

  if (!isSupportedSyncType(syncConfig.type) || !periodInMinutes) {
    return false;
  }

  chrome.alarms.create(AUTO_SYNC_ALARM, {
    delayInMinutes: periodInMinutes,
    periodInMinutes
  });

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

  await clearAlarm(AUTO_BACKUP_ALARM);

  if (!periodInMinutes) {
    return false;
  }

  chrome.alarms.create(AUTO_BACKUP_ALARM, {
    delayInMinutes: periodInMinutes,
    periodInMinutes
  });

  return true;
}

async function buildBackupBundle(db, source = 'manual') {
  const [snippets, highlights, settings, spaces] = await Promise.all([
    db.getAllSnippetsIncludingDeleted(),
    db.getAllHighlights(),
    db.getAllSettings(),
    db.getStoredSpaces()
  ]);

  return {
    version: '3.1.0',
    createdAt: Date.now(),
    source,
    snippets,
    highlights,
    settings,
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

async function performSync(requestedType = null, source = 'manual') {
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
      : await syncService.syncGoogleDrive({ interactive: source !== 'auto' });

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

// Message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle message asynchronously
  (async () => {
    try {
      const db = await getDatabase();
      const result = await handleMessage(db, message);
      sendResponse(result);
    } catch (error) {
      console.error('Message handling error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  // Return true to keep message channel open
  return true;
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-to-isnips' && tab.id) {
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

async function handleMessage(db, message) {
  try {
    switch (message.action) {
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

      case 'updateSnippet':
      case 'updateIndexCard':
        const updateResult = await db.updateSnippet(message.cardId, message.updates);
        if (updateResult.success) {
          broadcastDataChange('cardSaved');
        }
        return updateResult;

      case 'deleteSnippet':
      case 'deleteIndexCard':
        const deleteResult = await db.deleteSnippet(message.cardId);
        if (deleteResult.success) {
          broadcastDataChange('cardSaved');
        }
        return deleteResult;

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
        const settingValue = await db.getSetting(message.key, message.defaultValue);
        return { success: true, value: settingValue };

      case 'setSetting':
        const setResult = await db.setSetting(message.key, message.value);
        if (setResult.success && message.key === 'syncConfig') {
          await scheduleAutoSyncAlarm(message.value);
          await scheduleAutoBackupAlarm(message.value);
        }
        return setResult;

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

      case 'syncWebDAV':
        return await performSync('webdav');

      case 'syncGoogleDrive':
        return await performSync('googledrive');

      case 'createBackup':
        return await performBackup(message.source || 'manual');

      case 'listBackupSnapshots':
        return await listBackupSnapshots(message.limit || 20);

      case 'restoreBackupSnapshot':
        return await restoreBackupSnapshot(message.snapshotId);

      case 'requestPersistentStorage':
        return await requestPersistentStorage(message.source || 'message');

      default:
        return { success: false, error: 'Unknown action' };
    }
  } catch (error) {
    console.error('Message handling error:', error);
    return { success: false, error: error.message };
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
  void scheduleAutoSyncAlarm();
  void scheduleAutoBackupAlarm();
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
  void scheduleAutoSyncAlarm();
  void scheduleAutoBackupAlarm();
  void requestPersistentStorage('runtime-startup');
});

// Initialize default data on install
chrome.runtime.onInstalled.addListener(async () => {
  try {
    ensureAutoCleanupAlarm();
    void requestPersistentStorage('runtime-installed');

    // Add some sample data for testing
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

    // Check if we already have data
    const existingCards = await db.getAllSnippetsIncludingDeleted();
    if (existingCards.length === 0) {

      const currentLang = await db.getSetting('language', 'en');
      const sampleCards = db.getSampleData(currentLang);

      for (const card of sampleCards) {
        await db.saveSnippet(card);
      }

    }

    // Run initial cleanup
    await scheduleAutoCleanup();
    await scheduleAutoSyncAlarm();
    await scheduleAutoBackupAlarm();
  } catch (error) {
    console.error('Error during installation:', error);
  }
});
