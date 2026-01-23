// Background service worker for iSnips extension
// Handles data storage and message routing
// Import sync service
importScripts('sync.js');

class iSnipsDatabase {
  constructor() {
    this.db = null;
    this.dbName = 'ClipIndexDB';
    this.dbVersion = 3;
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
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;
        console.log('Upgrading IndexedDB from version', oldVersion, 'to', this.dbVersion);

        // Index Cards store
        if (!db.objectStoreNames.contains('indexCards')) {
          const cardsStore = db.createObjectStore('indexCards', { keyPath: 'id' });
          cardsStore.createIndex('url', 'url', { unique: false });
          cardsStore.createIndex('domain', 'domain', { unique: false });
          cardsStore.createIndex('createdAt', 'createdAt', { unique: false });
          cardsStore.createIndex('category', 'category', { unique: false });
          cardsStore.createIndex('deletedAt', 'deletedAt', { unique: false });
        } else if (oldVersion < 2) {
          // Upgrade existing store
          const cardsStore = event.target.transaction.objectStore('indexCards');
          if (!cardsStore.indexNames.contains('category')) {
            cardsStore.createIndex('category', 'category', { unique: false });
          }
          if (!cardsStore.indexNames.contains('deletedAt')) {
            cardsStore.createIndex('deletedAt', 'deletedAt', { unique: false });
          }
        }

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

        console.log('IndexedDB schema updated');
      };
    });
  }

  async migrateIndexCardsToSnippets() {
    const migrated = await this.getSetting('snippets_migrated', false);
    if (migrated) return;

    const db = await this.initialize();
    const cards = await new Promise((resolve, reject) => {
      const transaction = db.transaction(['indexCards'], 'readonly');
      const request = transaction.objectStore('indexCards').getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    if (cards.length === 0) {
      await this.setSetting('snippets_migrated', true);
      return;
    }

    await new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets'], 'readwrite');
      const store = transaction.objectStore('snippets');
      for (const card of cards) {
        const text = (card.clipText || card.title || '').trim();
        const url = card.url || null;
        const snippet = {
          id: card.id,
          type: url ? 'web' : 'note',
          text: text.slice(0, 144),
          url,
          domain: card.domain || null,
          spaceId: card.spaceId || null,
          created_at: card.createdAt || Date.now(),
          updated_at: card.updatedAt || card.createdAt || Date.now(),
          deleted_at: card.deletedAt || null,
          purged_at: null
        };
        store.put(snippet);
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    await this.setSetting('snippets_migrated', true);
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

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets'], 'readwrite');
      const store = transaction.objectStore('snippets');
      const request = store.add(snippet);

      request.onsuccess = () => {
        resolve({ success: true, snippet });
      };

      request.onerror = () => {
        reject({ success: false, error: request.error });
      };
    });
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
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets'], 'readwrite');
      const store = transaction.objectStore('snippets');
      const getRequest = store.get(snippetId);

      getRequest.onsuccess = () => {
        const snippet = getRequest.result;
        if (snippet) {
          const updatedSnippet = { ...snippet, ...updates, updated_at: Date.now() };
          const putRequest = store.put(updatedSnippet);

          putRequest.onsuccess = () => {
            resolve({ success: true, snippet: updatedSnippet });
          };

          putRequest.onerror = () => {
            reject({ success: false, error: putRequest.error });
          };
        } else {
          reject({ success: false, error: 'Snippet not found' });
        }
      };

      getRequest.onerror = () => {
        reject({ success: false, error: getRequest.error });
      };
    });
  }

  async deleteSnippet(snippetId) {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets'], 'readwrite');
      const store = transaction.objectStore('snippets');
      const request = store.delete(snippetId);

      request.onsuccess = () => {
        resolve({ success: true });
      };

      request.onerror = () => {
        reject({ success: false, error: request.error });
      };
    });
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
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets'], 'readwrite');
      const store = transaction.objectStore('snippets');
      const deletedIndex = store.index('deleted_at');
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
        } else {
          resolve({ success: true, purgedCount });
        }
      };

      request.onerror = () => {
        reject({ success: false, error: request.error });
      };
    });
  }

  async autoDeleteOldTrash() {
    const lastRemote = await this.getSetting('syncConfig', {});
    if (!lastRemote?.last_remote_etag) {
      return { success: true, deletedCount: 0 };
    }

    const db = await this.initialize();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets'], 'readwrite');
      const store = transaction.objectStore('snippets');
      const purgedIndex = store.index('purged_at');
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
        } else {
          resolve({ success: true, deletedCount });
        }
      };

      request.onerror = () => {
        reject({ success: false, error: request.error });
      };
    });
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
    return new Promise((resolve, reject) => {
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
  }

  // Highlights operations
  async storeHighlight(highlight) {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['highlights'], 'readwrite');
      const store = transaction.objectStore('highlights');
      const request = store.add(highlight);

      request.onsuccess = () => {
        resolve({ success: true });
      };

      request.onerror = () => {
        reject({ success: false, error: request.error });
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

  async setSetting(key, value) {
    const db = await this.initialize();

    // Update IndexedDB
    const dbPromise = new Promise((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      const request = store.put({ key, value });

      request.onsuccess = () => {
        resolve({ success: true });
      };

      request.onerror = () => {
        reject({ success: false, error: request.error });
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

  // Recent tags management
  async getRecentTags() {
    const tags = await this.getSetting('recentTags', []);
    console.log('ClipIndex: getRecentTags called, returning:', tags.slice(0, 8));
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

async function getDatabase() {
  if (!dbInstance) {
    dbInstance = new iSnipsDatabase();
    await dbInstance.initialize();
    await dbInstance.migrateIndexCardsToSnippets();
    syncService.setDatabase(dbInstance);
  }

  return dbInstance;
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
        return await db.setSetting(message.key, message.value);

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
        const webdavConfig = await db.getSetting('syncConfig', {});
        if (webdavConfig.type !== 'webdav') return { success: false, error: 'WebDAV not configured' };
        const webdavResult = await syncService.syncWebDAV(webdavConfig);
        if (webdavResult.success) {
          broadcastDataChange('cardSaved'); // Refresh UI
        }
        return webdavResult;

      case 'syncGoogleDrive':
        const gdResult = await syncService.syncGoogleDrive();
        if (gdResult.success) {
          broadcastDataChange('cardSaved'); // Refresh UI
        }
        return gdResult;

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
      console.log(`ClipIndex: Auto-deleted ${result.deletedCount} old trash items`);
    }
  } catch (error) {
    console.error('Auto cleanup error:', error);
  }
}

// Schedule daily cleanup - wait for alarms API to be available
if (chrome.alarms) {
  chrome.alarms.create('autoCleanup', { delayInMinutes: 1, periodInMinutes: 1440 });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'autoCleanup') {
      scheduleAutoCleanup();
    }
  });
} else {
  console.warn('Chrome alarms API not available');
}

// Initialize default data on install
chrome.runtime.onInstalled.addListener(async () => {
  try {
    console.log('ClipIndex v2.0.0 installed successfully');

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
      console.log(`Detected browser language: ${uiLang}, setting default to: ${defaultLang}`);
      await db.setSetting('language', defaultLang);
    }

    // Check if we already have data
    const existingCards = await db.getAllSnippetsIncludingDeleted();
    if (existingCards.length === 0) {
      console.log('Adding sample data...');

      const sampleCards = [
        {
          url: 'https://example.com/article1',
          type: 'web',
          text: '这是一个示例摘录内容，用于测试 ClipIndex 功能。',
          domain: 'example.com',
          created_at: Date.now() - 86400000,
          updated_at: Date.now() - 86400000,
          deleted_at: null,
          purged_at: null
        },
        {
          url: 'https://example.com/article2',
          type: 'web',
          text: '另一个测试摘录，展示瀑布流布局的效果。',
          domain: 'example.com',
          created_at: Date.now() - 3600000,
          updated_at: Date.now() - 3600000,
          deleted_at: null,
          purged_at: null
        },
        {
          url: null,
          type: 'note',
          text: '这是我的第一条随笔记录，用于测试笔记功能。',
          domain: null,
          created_at: Date.now() - 7200000,
          updated_at: Date.now() - 7200000,
          deleted_at: null,
          purged_at: null
        }
      ];

      for (const card of sampleCards) {
        await db.saveSnippet(card);
      }

      console.log('Sample data added successfully');
    }

    // Run initial cleanup
    await scheduleAutoCleanup();
  } catch (error) {
    console.error('Error during installation:', error);
  }
});
