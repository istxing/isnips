// Background service worker for ClipIndex extension
// Handles data storage and message routing

class ClipIndexDatabase {
  constructor() {
    this.db = null;
    this.dbName = 'ClipIndexDB';
    this.dbVersion = 2;
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

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        console.log('IndexedDB schema updated');
      };
    });
  }

  // Index Cards operations
  async saveIndexCard(cardData) {
    const db = await this.initialize();
    const card = {
      id: this.generateId(),
      ...cardData
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['indexCards'], 'readwrite');
      const store = transaction.objectStore('indexCards');
      const request = store.add(card);

      request.onsuccess = () => {
        // Notify other parts of the extension
        chrome.runtime.sendMessage({ action: 'cardSaved', card });
        resolve({ success: true, card });
      };

      request.onerror = () => {
        reject({ success: false, error: request.error });
      };
    });
  }

  async getIndexCards(filters = {}) {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['indexCards'], 'readonly');
      const store = transaction.objectStore('indexCards');
      const request = store.getAll();

      request.onsuccess = () => {
        let cards = request.result;

        // Filter out deleted cards
        cards = cards.filter(card => !card.deletedAt);

        // Apply search filter
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          cards = cards.filter(card =>
            card.clipText.toLowerCase().includes(searchTerm) ||
            card.domain.toLowerCase().includes(searchTerm) ||
            (card.title && card.title.toLowerCase().includes(searchTerm))
          );
        }

        // Sort by created date (newest first)
        cards.sort((a, b) => b.createdAt - a.createdAt);

        resolve(cards);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async updateIndexCard(cardId, updates) {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['indexCards'], 'readwrite');
      const store = transaction.objectStore('indexCards');
      const getRequest = store.get(cardId);

      getRequest.onsuccess = () => {
        const card = getRequest.result;
        if (card) {
          const updatedCard = { ...card, ...updates, updatedAt: Date.now() };
          const putRequest = store.put(updatedCard);

          putRequest.onsuccess = () => {
            chrome.runtime.sendMessage({ action: 'cardSaved' }); // Reuse cardSaved to trigger refresh
            resolve({ success: true, card: updatedCard });
          };

          putRequest.onerror = () => {
            reject({ success: false, error: putRequest.error });
          };
        } else {
          reject({ success: false, error: 'Card not found' });
        }
      };

      getRequest.onerror = () => {
        reject({ success: false, error: getRequest.error });
      };
    });
  }

  async deleteIndexCard(cardId) {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['indexCards'], 'readwrite');
      const store = transaction.objectStore('indexCards');
      const request = store.delete(cardId);

      request.onsuccess = () => {
        chrome.runtime.sendMessage({ action: 'cardSaved' });
        resolve({ success: true });
      };

      request.onerror = () => {
        reject({ success: false, error: request.error });
      };
    });
  }

  async softDeleteIndexCard(cardId) {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['indexCards'], 'readwrite');
      const store = transaction.objectStore('indexCards');
      const getRequest = store.get(cardId);

      getRequest.onsuccess = () => {
        const card = getRequest.result;
        if (card) {
          const updatedCard = { ...card, deletedAt: Date.now() };
          const putRequest = store.put(updatedCard);

          putRequest.onsuccess = () => {
            chrome.runtime.sendMessage({ action: 'cardSaved' });
            resolve({ success: true, card: updatedCard });
          };

          putRequest.onerror = () => {
            reject({ success: false, error: putRequest.error });
          };
        } else {
          reject({ success: false, error: 'Card not found' });
        }
      };

      getRequest.onerror = () => {
        reject({ success: false, error: getRequest.error });
      };
    });
  }

  async getDeletedCards() {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['indexCards'], 'readonly');
      const store = transaction.objectStore('indexCards');
      const deletedIndex = store.index('deletedAt');
      const request = deletedIndex.getAll(IDBKeyRange.lowerBound(1)); // Get all cards with deletedAt > 0

      request.onsuccess = () => {
        let cards = request.result;
        // Sort by deleted date (newest first)
        cards.sort((a, b) => b.deletedAt - a.deletedAt);
        resolve(cards);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async restoreCard(cardId) {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['indexCards'], 'readwrite');
      const store = transaction.objectStore('indexCards');
      const getRequest = store.get(cardId);

      getRequest.onsuccess = () => {
        const card = getRequest.result;
        if (card) {
          const updatedCard = { ...card };
          delete updatedCard.deletedAt; // Remove deletedAt to restore
          const putRequest = store.put(updatedCard);

          putRequest.onsuccess = () => {
            chrome.runtime.sendMessage({ action: 'cardSaved' });
            resolve({ success: true, card: updatedCard });
          };

          putRequest.onerror = () => {
            reject({ success: false, error: putRequest.error });
          };
        } else {
          reject({ success: false, error: 'Card not found' });
        }
      };

      getRequest.onerror = () => {
        reject({ success: false, error: getRequest.error });
      };
    });
  }

  async emptyTrash() {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['indexCards'], 'readwrite');
      const store = transaction.objectStore('indexCards');
      const deletedIndex = store.index('deletedAt');
      const request = deletedIndex.openCursor(IDBKeyRange.lowerBound(1));

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          chrome.runtime.sendMessage({ action: 'cardSaved' });
          resolve({ success: true, deletedCount });
        }
      };

      request.onerror = () => {
        reject({ success: false, error: request.error });
      };
    });
  }

  async autoDeleteOldTrash() {
    const db = await this.initialize();
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['indexCards'], 'readwrite');
      const store = transaction.objectStore('indexCards');
      const deletedIndex = store.index('deletedAt');
      const request = deletedIndex.openCursor(IDBKeyRange.upperBound(sevenDaysAgo));

      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
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
      const transaction = db.transaction(['spaces', 'indexCards'], 'readwrite');
      const spacesStore = transaction.objectStore('spaces');
      const cardsStore = transaction.objectStore('indexCards');

      // Move cards to inbox first
      const cardsIndex = cardsStore.index('spaceId');
      const cardsRequest = cardsIndex.getAll(spaceId);

      cardsRequest.onsuccess = () => {
        const cards = cardsRequest.result;
        const updatePromises = cards.map(card => {
          return new Promise((res, rej) => {
            const updateRequest = cardsStore.put({ ...card, spaceId: 'inbox', updatedAt: Date.now() });
            updateRequest.onsuccess = () => res();
            updateRequest.onerror = () => rej(updateRequest.error);
          });
        });

        Promise.all(updatePromises).then(() => {
          // Now delete the space
          const deleteRequest = spacesStore.delete(spaceId);
          deleteRequest.onsuccess = () => {
            resolve({ success: true, movedCards: cards.length });
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
    dbInstance = new ClipIndexDatabase();
    await dbInstance.initialize();
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

async function handleMessage(db, message) {
  try {
    switch (message.action) {
      case 'saveIndexCard':
        const saveResult = await db.saveIndexCard(message.data);
        if (saveResult.success) {
          chrome.runtime.sendMessage({ action: 'cardSaved', card: saveResult.card });
        }
        return saveResult;

      case 'getIndexCards':
        const cards = await db.getIndexCards(message.filters);
        return { success: true, cards };

      case 'updateIndexCard':
        return await db.updateIndexCard(message.cardId, message.updates);

      case 'deleteIndexCard':
        return await db.deleteIndexCard(message.cardId);

      case 'softDeleteIndexCard':
        return await db.softDeleteIndexCard(message.cardId);

      case 'getDeletedCards':
        const deletedCards = await db.getDeletedCards();
        return { success: true, cards: deletedCards };

      case 'restoreCard':
        return await db.restoreCard(message.cardId);

      case 'emptyTrash':
        return await db.emptyTrash();

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

    // Check if we already have data
    const existingCards = await db.getIndexCards();
    if (existingCards.length === 0) {
      console.log('Adding sample data...');

      const sampleCards = [
        {
          url: 'https://example.com/article1',
          clipText: '这是一个示例摘录内容，用于测试 ClipIndex 功能。',
          domain: 'example.com',
          title: '示例文章标题',
          category: '收集',
          createdAt: Date.now() - 86400000, // 1 day ago
          updatedAt: Date.now() - 86400000
        },
        {
          url: 'https://example.com/article2',
          clipText: '另一个测试摘录，展示瀑布流布局的效果。',
          domain: 'example.com',
          title: '第二个示例',
          category: '收集',
          createdAt: Date.now() - 3600000, // 1 hour ago
          updatedAt: Date.now() - 3600000
        },
        {
          url: '',
          clipText: '这是我的第一条随笔记录，用于测试笔记功能。',
          domain: '随笔',
          title: '',
          category: '随笔',
          createdAt: Date.now() - 7200000, // 2 hours ago
          updatedAt: Date.now() - 7200000
        }
      ];

      for (const card of sampleCards) {
        await db.saveIndexCard(card);
      }

      console.log('Sample data added successfully');
    }

    // Run initial cleanup
    await scheduleAutoCleanup();
  } catch (error) {
    console.error('Error during installation:', error);
  }
});
