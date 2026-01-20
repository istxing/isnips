# Snippets Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace legacy indexCards storage and sync with the new snippets schema and Pull->Merge->Push flow using a single remote snapshot file.

**Architecture:** Introduce a dedicated `snippets` IndexedDB store with one-time migration from `indexCards`. Sync uses a single snapshot file `iSnippets/snippets.json`, merging by `id` and `updated_at`, and tracks remote versions via ETag/headRevisionId.

**Tech Stack:** Chrome extension (MV3), IndexedDB, Fetch API, Google Drive API, WebDAV, esbuild (bun).

### Task 1: Add pure merge helper with a minimal test

**Files:**
- Create: `merge.js`
- Create: `scripts/merge.test.js`

**Step 1: Write the failing test**

```js
// scripts/merge.test.js
const assert = require('assert');
const { mergeSnippets } = require('../merge');

const local = [
  { id: '1', text: 'a', updated_at: 1000 },
  { id: '2', text: 'b', updated_at: 1000 }
];
const remote = [
  { id: '1', text: 'a-remote', updated_at: 2000 },
  { id: '3', text: 'c', updated_at: 500 }
];

const merged = mergeSnippets(local, remote, { preferRemoteOnTie: true });

assert.equal(merged.length, 3);
assert.equal(merged.find(s => s.id === '1').text, 'a-remote');
assert.equal(merged.find(s => s.id === '2').text, 'b');
assert.equal(merged.find(s => s.id === '3').text, 'c');

const tie = mergeSnippets(
  [{ id: '4', text: 'l', updated_at: 1000 }],
  [{ id: '4', text: 'r', updated_at: 1000 }],
  { preferRemoteOnTie: true }
);
assert.equal(tie.find(s => s.id === '4').text, 'r');

console.log('merge.test.js: ok');
```

**Step 2: Run test to verify it fails**

Run: `node scripts/merge.test.js`
Expected: FAIL with "Cannot find module '../merge'" or similar

**Step 3: Write minimal implementation**

```js
// merge.js
function mergeSnippets(localSnippets, remoteSnippets, options = {}) {
  const preferRemoteOnTie = options.preferRemoteOnTie !== false;
  const localMap = new Map(localSnippets.map(s => [s.id, s]));
  const remoteMap = new Map(remoteSnippets.map(s => [s.id, s]));
  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);

  const merged = [];
  for (const id of allIds) {
    const local = localMap.get(id);
    const remote = remoteMap.get(id);

    if (local && remote) {
      const localUpdated = local.updated_at ?? 0;
      const remoteUpdated = remote.updated_at ?? 0;
      if (remoteUpdated > localUpdated) {
        merged.push(remote);
      } else if (remoteUpdated < localUpdated) {
        merged.push(local);
      } else {
        merged.push(preferRemoteOnTie ? remote : local);
      }
    } else if (remote) {
      merged.push(remote);
    } else if (local) {
      merged.push(local);
    }
  }

  return merged;
}

if (typeof module !== 'undefined') {
  module.exports = { mergeSnippets };
}
```

**Step 4: Run test to verify it passes**

Run: `node scripts/merge.test.js`
Expected: `merge.test.js: ok`

**Step 5: Commit**

```bash
/usr/bin/git add merge.js scripts/merge.test.js
/usr/bin/git commit -m "test: add merge helper"\
```

### Task 2: Add snippets store + migration in IndexedDB

**Files:**
- Modify: `background.js`

**Step 1: Write the failing test**

Manual verification placeholder (no existing test harness for IndexedDB). Confirm migration flag is missing and `snippets` store does not exist before upgrade.

**Step 2: Run test to verify it fails**

Run: open extension -> console should show missing `snippets` store or empty DB.
Expected: No `snippets` store

**Step 3: Write minimal implementation**

Update DB version and schema:

```js
// background.js (constructor)
this.dbVersion = 3;
```

Add store creation in `onupgradeneeded`:

```js
if (!db.objectStoreNames.contains('snippets')) {
  const snippetsStore = db.createObjectStore('snippets', { keyPath: 'id' });
  snippetsStore.createIndex('created_at', 'created_at', { unique: false });
  snippetsStore.createIndex('updated_at', 'updated_at', { unique: false });
  snippetsStore.createIndex('deleted_at', 'deleted_at', { unique: false });
  snippetsStore.createIndex('purged_at', 'purged_at', { unique: false });
  snippetsStore.createIndex('domain', 'domain', { unique: false });
}
```

Add migration helper (called after `initialize()` succeeds, once):

```js
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
```

Call migration once after DB is ready (e.g. after `initialize()` in `getDatabase()`):

```js
if (!dbInstance) {
  dbInstance = new ClipIndexDatabase();
  await dbInstance.initialize();
  await dbInstance.migrateIndexCardsToSnippets();
  syncService.setDatabase(dbInstance);
}
```

**Step 4: Run test to verify it passes**

Run: reload extension, check IndexedDB shows `snippets` store populated and `snippets_migrated` set.
Expected: `snippets` store exists, records present, flag set

**Step 5: Commit**

```bash
/usr/bin/git add background.js
/usr/bin/git commit -m "feat: add snippets store and migration"\
```

### Task 3: Replace indexCards CRUD with snippets CRUD

**Files:**
- Modify: `background.js`

**Step 1: Write the failing test**

Manual: use UI to save a snippet or note and ensure new fields are used.
Expected: UI still using old fields (will fail)

**Step 2: Write minimal implementation**

Rename and update CRUD methods (example for save + list):

```js
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
    request.onsuccess = () => resolve({ success: true, snippet });
    request.onerror = () => reject({ success: false, error: request.error });
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
      snippets = snippets.filter(s => !s.deleted_at && !s.purged_at);

      if (filters.search) {
        const term = filters.search.toLowerCase();
        snippets = snippets.filter(s =>
          (s.text || '').toLowerCase().includes(term) ||
          (s.domain || '').toLowerCase().includes(term)
        );
      }

      snippets.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
      resolve(snippets);
    };

    request.onerror = () => reject(request.error);
  });
}
```

Update delete/restore/purge semantics:

```js
async softDeleteSnippet(id) {
  return this.updateSnippet(id, { deleted_at: Date.now(), purged_at: null });
}

async restoreSnippet(id) {
  return this.updateSnippet(id, { deleted_at: null, purged_at: null });
}

async purgeSnippet(id) {
  return this.updateSnippet(id, {
    deleted_at: Date.now(),
    purged_at: Date.now()
  });
}
```

Update `getDeletedSnippets` and `emptyTrash` to use `deleted_at` and `purged_at`.

**Step 3: Run test to verify it passes**

Manual: create, delete, restore snippet; check lists and fields.

**Step 4: Commit**

```bash
/usr/bin/git add background.js
/usr/bin/git commit -m "refactor: move CRUD to snippets"\
```

### Task 4: Update message handlers and UI data fields

**Files:**
- Modify: `background.js`
- Modify: `popup.js`
- Modify: `content.js`
- Modify: `library.js`
- Modify: `settings.js`

**Step 1: Write the failing test**

Manual: save note and verify fields in DB.
Expected: old fields (`clipText`, `createdAt`) still used

**Step 2: Write minimal implementation**

Update message actions in `background.js`:

```js
case 'saveSnippet':
  return await db.saveSnippet(message.data);
case 'getSnippets':
  return await db.getSnippets(message.filters);
case 'updateSnippet':
  return await db.updateSnippet(message.cardId, message.updates);
case 'softDeleteSnippet':
  return await db.softDeleteSnippet(message.cardId);
case 'restoreSnippet':
  return await db.restoreSnippet(message.cardId);
case 'getDeletedSnippets':
  return await db.getDeletedSnippets();
case 'purgeSnippet':
  return await db.purgeSnippet(message.cardId);
case 'emptyTrash':
  return await db.emptyTrash();
```

Update UI code to use new fields when rendering and saving:

```js
// popup.js saveNote()
const noteText = noteTextarea.value.trim();
const includeLink = await this.getIncludeLinkSetting();
const payload = {
  type: 'note',
  text: noteText,
  url: includeLink ? currentUrl : null,
  domain: includeLink ? new URL(currentUrl).hostname : null,
  created_at: Date.now(),
  updated_at: Date.now(),
  deleted_at: null,
  purged_at: null
};
chrome.runtime.sendMessage({ action: 'saveSnippet', data: payload });
```

Update list rendering to use `text`, `created_at`, and filter on `deleted_at` / `purged_at`.

**Step 3: Run test to verify it passes**

Manual: create snippets from content and note, verify UI displays and stats use new fields.

**Step 4: Commit**

```bash
/usr/bin/git add background.js popup.js content.js library.js settings.js
/usr/bin/git commit -m "feat: update UI and messages for snippets"\
```

### Task 5: Update sync implementation

**Files:**
- Modify: `sync.js`
- Modify: `background.js` (if sync config storage helpers change)

**Step 1: Write the failing test**

Manual: trigger sync and verify it reads `iSnippets/snippets.json` and uses new fields.
Expected: old `iSnippets-sync.json` used

**Step 2: Write minimal implementation**

Update sync filename and bundle structure:

```js
this.syncFileName = 'snippets.json';
this.syncFolderName = 'iSnippets';
```

Bundle only snippets:

```js
async bundleData() {
  if (!this.db) throw new Error('Database not initialized');
  const snippets = await this.db.getAllSnippetsIncludingDeleted();
  return {
    version: '3.0.0',
    lastSync: Date.now(),
    snippets
  };
}
```

Merge using helper:

```js
importScripts('merge.js');
const merged = mergeSnippets(localSnippets, remoteSnippets, { preferRemoteOnTie: true });
```

WebDAV URL uses folder:

```js
const folderUrl = url.endsWith('/') ? url + this.syncFolderName + '/' : url + '/' + this.syncFolderName + '/';
const fullUrl = folderUrl + this.syncFileName;
```

Capture ETag and save to syncConfig:

```js
const etag = response.headers.get('ETag');
await this.db.setSetting('syncConfig', { ...config, last_remote_etag: etag });
```

Google Drive:
- Ensure `iSnippets` folder exists (create if missing)
- Find `snippets.json` inside that folder
- Use `headRevisionId` or `modifiedTime` as `last_remote_etag`

**Step 3: Run test to verify it passes**

Manual: sync with WebDAV/Drive, verify file path and merge behavior.

**Step 4: Commit**

```bash
/usr/bin/git add sync.js background.js
/usr/bin/git commit -m "feat: update sync to snippets snapshot"\
```

### Task 6: Update import/export and data clearing

**Files:**
- Modify: `settings.js`

**Step 1: Write the failing test**

Manual: export data and verify it contains `snippets` not `indexCards`.
Expected: old data format

**Step 2: Write minimal implementation**

Update exports to use new store and fields. Update `clearAllData()` to clear `snippets` store instead of `indexCards`.

**Step 3: Run test to verify it passes**

Manual: export/import and clear data to ensure only snippets are affected.

**Step 4: Commit**

```bash
/usr/bin/git add settings.js
/usr/bin/git commit -m "refactor: export/import snippets"\
```

### Task 7: Rebuild distribution assets

**Files:**
- Modify: `dist/*`

**Step 1: Run build**

Run: `bun run build.js`
Expected: dist assets rebuilt

**Step 2: Commit**

```bash
/usr/bin/git add dist
/usr/bin/git commit -m "build: update dist assets"\
```
