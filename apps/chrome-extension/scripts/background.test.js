const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { IDBFactory, IDBKeyRange } = require("fake-indexeddb");

async function run() {
  const local = {},
    session = {},
    events = {};
  const event = (name) => ({
    addListener: (fn) => {
      events[name] = fn;
    },
  });
  const storage = (data) => ({
    get(keys, cb) {
      const result =
        keys == null
          ? { ...data }
          : Object.fromEntries(
              (Array.isArray(keys) ? keys : [keys]).map((k) => [k, data[k]]),
            );
      cb?.(result);
      return Promise.resolve(result);
    },
    set(values, cb) {
      Object.assign(data, structuredClone(values));
      cb?.();
      return Promise.resolve();
    },
    remove(keys, cb) {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key];
      cb?.();
      return Promise.resolve();
    },
    clear() {
      for (const key of Object.keys(data)) delete data[key];
      return Promise.resolve();
    },
    setAccessLevel: async () => {},
  });
  const chrome = {
    runtime: {
      id: "isnips-test",
      getURL: (file) => "chrome-extension://isnips-test/" + file,
      onMessage: event("message"),
      onStartup: event("startup"),
      onInstalled: event("install"),
      sendMessage: async () => {},
    },
    storage: { local: storage(local), session: storage(session) },
    tabs: {
      query: (_opts, cb) => {
        cb?.([]);
        return Promise.resolve([]);
      },
      sendMessage: async () => {},
      create: async () => {},
    },
    contextMenus: {
      onClicked: event("context"),
      removeAll: (cb) => cb(),
      create: () => {},
    },
    action: { onClicked: event("action") },
    commands: { onCommand: event("command") },
    identity: {
      clearAllCachedAuthTokens: async () => {},
      getRedirectURL: (path) => "https://isnips-test.chromiumapp.org/" + path,
    },
  };
  const context = vm.createContext({
    chrome,
    indexedDB: new IDBFactory(),
    IDBKeyRange,
    console: { warn() {}, error() {} },
    crypto,
    structuredClone,
    URL,
    URLSearchParams,
    AbortSignal,
    TextEncoder,
    Headers,
    Blob,
    FormData,
    btoa,
    fetch: async () => {
      throw new Error("Unexpected network");
    },
  });
  context.importScripts = (...files) =>
    files.forEach((file) =>
      vm.runInContext(
        fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
        context,
      ),
    );
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../background.js"), "utf8") +
      "\nthis.api = { getDatabase, buildBackupBundle, authorizeMessage, handleMessage, withDataMaintenance, performSync, performBackup, service: syncService, auth: googleDriveAuth };",
    context,
  );
  const { api } = context;
  const db = await api.getDatabase();
  assert.equal(db.db.version, 5);
  await db.saveSnippet({
    id: "old",
    text: "Original",
    type: "note",
    created_at: 10,
    updated_at: 10,
  });
  await db.setSetting("syncConfig", {
    type: "webdav",
    url: "https://user:secret@example.test/dav/",
    username: "user",
    password: "secret",
    token: "secret",
  });
  await db.setSetting("language", "zh-CN");
  await db.setSetting("privateToken", "secret");
  const portable = await api.buildBackupBundle(db, "export");
  assert.deepEqual(Object.keys(portable.settings), ["language"]);
  assert.equal(JSON.stringify(portable).includes("secret"), false);
  const imported = await db.importData({
    cards: [
      { id: "legacy", clipText: "Old format", createdAt: 2, updatedAt: 3 },
    ],
    settings: { appearance: "dark", syncConfig: { type: "evil" } },
  });
  assert.equal(imported.importedCount, 1);
  assert.equal((await db.getSnippetById("legacy")).text, "Old format");
  assert.equal((await db.getSetting("syncConfig")).type, "webdav");
  await assert.rejects(
    db.importData({
      snippets: [{ id: "rejected", text: "must not persist" }],
      settings: { language: ["zh-CN"] },
    }),
    /Invalid preference/,
  );
  assert.equal(await db.getSnippetById("rejected"), null);
  // Legacy settings.js getAllSettings() exported null for unset preferences.
  // Import that exact file shape without clearing existing site exclusions.
  await db.setSetting("blockedSites", ["keep.example"]);
  const legacyBackup = JSON.parse(JSON.stringify({
    version: "3.0.0",
    exportDate: "2026-10-15T00:00:00.000Z",
    snippets: [{ id: "legacy-null-prefs", text: "Legacy backup body", created_at: 5 }],
    highlights: [],
    settings: { language: null, blockedSites: null },
  }));
  assert.equal((await db.importData(legacyBackup)).importedCount, 1);
  assert.equal((await db.getSnippetById("legacy-null-prefs")).text, "Legacy backup body");
  assert.equal(await db.getSetting("language"), "zh-CN");
  assert.deepEqual(Array.from(await db.getSetting("blockedSites")), ["keep.example"]);
  assert.deepEqual(local.blockedSites, ["keep.example"]);
  assert.equal((await db.getSetting("syncConfig")).type, "webdav");
  await db.importData({ snippets: [], settings: { blockedSites: ["imported.example"] } });
  assert.deepEqual(Array.from(await db.getSetting("blockedSites")), ["imported.example"]);
  await db.importData({ snippets: [], settings: { blockedSites: [] } });
  assert.equal((await db.getSetting("blockedSites")).length, 0, "An explicit empty list still imports");
  for (const blockedSites of ["example.test", { "example.test": true }, ["example.test", 5]]) {
    await assert.rejects(db.importData({
      snippets: [{ id: "invalid-blocked-sites", text: "Must not persist" }],
      settings: { blockedSites },
    }), /Invalid preference in backup: blockedSites/);
    assert.equal(await db.getSnippetById("invalid-blocked-sites"), null);
    assert.equal((await db.getSetting("blockedSites")).length, 0);
  }
  // Column preferences must survive export/import, including legacy two-column files.
  for (const columns of [3, 5, 6, 7]) {
    await db.importData({ snippets: [], settings: { columnCount: columns } });
    assert.equal(await db.getSetting("columnCount"), columns);
    assert.equal(local.columnCount, columns);
  }
  await db.importData({ snippets: [], settings: { columnCount: "2" } });
  assert.equal(await db.getSetting("columnCount"), 3);
  await db.setSetting("columnCount", 7);
  assert.equal(
    (await api.buildBackupBundle(db, "export")).settings.columnCount,
    7,
  );
  await assert.rejects(
    db.importData({
      snippets: [{ id: "bad-columns", text: "Must not persist" }],
      settings: { columnCount: 8 },
    }),
    /Invalid preference/,
  );
  assert.equal(await db.getSnippetById("bad-columns"), null);
  assert.equal(await db.getSetting("columnCount"), 7);
  for (const view of ["day", "week", "month", "all"]) {
    await db.importData({ snippets: [], settings: { libraryGrouping: view } });
    assert.equal(await db.getSetting("libraryGrouping"), view);
    assert.equal((await api.buildBackupBundle(db, "export")).settings.libraryGrouping, view);
  }
  await assert.rejects(db.importData({
    snippets: [{ id: "invalid-view", text: "Must not persist" }],
    settings: { libraryGrouping: "year" },
  }), /Invalid preference in backup: libraryGrouping/);
  assert.equal(await db.getSnippetById("invalid-view"), null);
  await assert.rejects(db.setSetting("columnCount", 8), /3 to 7/);
  assert.equal(await db.getSetting("columnCount"), 7);
  await assert.rejects(
    db.importData({
      snippets: [{ id: "bad-date", text: "bad", updated_at: "not-a-date" }],
    }),
    /Invalid record date/,
  );
  await db.updateSnippet("old", {
    id: "hijack",
    text: "New edit",
    created_at: 999,
  });
  assert.equal(await db.getSnippetById("hijack"), null);
  assert.equal((await db.getSnippetById("old")).created_at, 10);
  await db.importData({
    snippets: [{ id: "old", text: "Stale backup", updated_at: 10 }],
  });
  assert.equal((await db.getSnippetById("old")).text, "New edit");
  await api.service.mergeData({
    snippets: [{ id: "old", text: "Stale remote", updated_at: 10 }],
  });
  assert.equal((await db.getSnippetById("old")).text, "New edit");
  // Writes queued while a sync transaction waits must be compared to the current value.
  const native = await db.initialize();
  await new Promise((resolve, reject) => {
    const tx = native.transaction("snippets", "readwrite");
    tx.objectStore("snippets").put({
      id: "racing",
      text: "Edit during download",
      updated_at: 300,
    });
    tx.oncomplete = resolve;
    tx.onerror = reject;
    api.service
      .mergeData({
        snippets: [{ id: "racing", text: "Older remote", updated_at: 200 }],
      })
      .catch(reject);
  });
  assert.equal(
    (await db.getSnippetById("racing")).text,
    "Edit during download",
  );
  await db.importData({
    snippets: [
      { id: "duplicate", text: "Newest", updated_at: 200 },
      { id: "duplicate", text: "Older duplicate", updated_at: 100 },
    ],
  });
  assert.equal((await db.getSnippetById("duplicate")).text, "Newest");
  await api.service.mergeData({
    snippets: [
      { id: "remote-duplicate", text: "Newest remote", updated_at: 200 },
      {
        id: "remote-duplicate",
        text: "Older remote duplicate",
        updated_at: 100,
      },
    ],
  });
  assert.equal(
    (await db.getSnippetById("remote-duplicate")).text,
    "Newest remote",
  );
  // Reopen an existing schema-v5 database: the update must keep persisted records and configuration.
  db.db.close();
  db.db = null;
  db.initialized = false;
  await db.initialize();
  assert.equal((await db.getSnippetById("legacy")).text, "Old format");
  assert.equal((await db.getSetting("syncConfig")).password, "secret");
  await db.softDeleteSnippet("old");
  await db.importData({
    snippets: [{ id: "old", text: "Restore by accident", updated_at: 10 }],
  });
  assert.ok((await db.getSnippetById("old")).deleted_at);
  const sender = {
    id: chrome.runtime.id,
    url: "https://example.test/article",
    tab: { id: 1 },
  };
  await assert.rejects(
    api.authorizeMessage(
      { action: "getSetting", key: "syncConfig" },
      sender,
      db,
    ),
    /unavailable/,
  );
  await assert.rejects(
    api.authorizeMessage({ action: "clearAllData" }, sender, db),
    /unavailable/,
  );
  await assert.rejects(
    api.authorizeMessage(
      { action: "getSetting", key: "language" },
      { ...sender, id: "other" },
      db,
    ),
    /Untrusted/,
  );
  for (const action of [
    "getClipboardHistory",
    "deleteClipboardEntry",
    "clearClipboardHistory",
    "promoteClipboardEntry",
    "getGoogleAuthStatus",
    "connectGoogleDrive",
    "connectGoogleDriveWeb",
    "getClipboardConsentStatus",
    "setClipboardConsent",
  ]) {
    await assert.rejects(
      api.authorizeMessage({ action }, sender, db),
      /unavailable/,
    );
  }
  const captureMessage = await api.authorizeMessage(
    {
      action: "captureClipboard",
      data: {
        text: "temporary only",
        url: "https://spoof.test",
        id: "spoof",
        title: "Source",
      },
    },
    sender,
    db,
  );
  assert.equal(captureMessage.data.url, sender.url);
  assert.equal(captureMessage.data.id, undefined);
  assert.equal((await api.handleMessage(db, captureMessage)).changed, false,
    "Neither install nor upgrade may capture before consent");
  assert.equal((await api.handleMessage(db, { action: "getClipboardConsentStatus" })).needsNotice, true);
  assert.equal((await api.handleMessage(db, { action: "getSetting", key: "clipboardCaptureEnabled", defaultValue: true })).value, false);
  assert.equal((await api.handleMessage(db, { action: "setSetting", key: "clipboardCaptureEnabled", value: true })).code, "CLIPBOARD_CONSENT_REQUIRED");
  await db.importData({ snippets: [], settings: { clipboardCaptureConsent: { version: 1, choice: "accepted" }, clipboardCaptureEnabled: true } });
  assert.equal((await api.handleMessage(db, captureMessage)).changed, false, "An imported backup cannot authorize capture");
  assert.equal((await api.handleMessage(db, { action: "setSetting", key: "clipboardCaptureConsent", value: { version: 1, choice: "accepted" } })).success, false);
  assert.equal((await api.handleMessage(db, { action: "setClipboardConsent", choice: "invalid" })).success, false);
  const consented = await api.handleMessage(db, { action: "setClipboardConsent", choice: "accepted" });
  assert.equal(consented.enabled, true);
  assert.equal(consented.needsNotice, false);
  assert.equal(
    (await api.handleMessage(db, captureMessage)).changed,
    true,
    "Capture starts after the explicit affirmative choice",
  );
  await assert.rejects(
    db.setSetting("clipboardCaptureEnabled", "true"),
    /Invalid/,
  );
  await api.handleMessage(db, {
    action: "setSetting",
    key: "clipboardCaptureEnabled",
    value: true,
  });
  assert.equal((await api.handleMessage(db, captureMessage)).changed, true);
  const clipboardResult = await api.handleMessage(db, {
    action: "getClipboardHistory",
  });
  assert.equal(clipboardResult.items.length, 1);
  assert.equal(clipboardResult.enabled, true);
  const temporaryId = clipboardResult.items[0].id;
  const cleanExport = await api.buildBackupBundle(db, "export");
  assert.equal(JSON.stringify(cleanExport).includes("temporary only"), false);
  assert.equal(cleanExport.settings.clipboardCaptureEnabled, undefined);
  assert.equal(cleanExport.settings.clipboardCaptureConsent, undefined);
  const incognito = await api.authorizeMessage(
    { action: "captureClipboard", data: { text: "private" } },
    { ...sender, tab: { id: 2, incognito: true } },
    db,
  );
  assert.equal((await api.handleMessage(db, incognito)).changed, false);
  const promoted = await api.handleMessage(db, {
    action: "promoteClipboardEntry",
    entryId: temporaryId,
  });
  assert.equal(promoted.success, true);
  assert.equal(promoted.snippet.type, "note");
  assert.equal(
    (await api.handleMessage(db, { action: "getClipboardHistory" })).items
      .length,
    0,
  );
  assert.ok(
    (await api.buildBackupBundle(db, "export")).snippets.some(
      (item) => item.text === "temporary only",
    ),
  );
  await api.handleMessage(db, {
    action: "setSetting",
    key: "clipboardCaptureEnabled",
    value: false,
  });
  assert.equal((await api.handleMessage(db, captureMessage)).changed, false);
  assert.equal((await api.handleMessage(db, { action: "getClipboardConsentStatus" })).needsNotice, false,
    "Pausing does not repeatedly prompt a user who has already chosen");
  const clipped = await api.authorizeMessage(
    {
      action: "saveSnippet",
      data: {
        id: "old",
        text: "Clip",
        url: "https://other.test",
        deleted_at: 1,
      },
    },
    sender,
    db,
  );
  assert.equal(clipped.data.url, sender.url);
  assert.equal(clipped.data.id, undefined);
  const highlights = await api.authorizeMessage(
    { action: "getHighlightsForUrl", url: "https://other.test" },
    sender,
    db,
  );
  assert.equal(highlights.url, sender.url);
  await db.setSetting("blockedSites", ["example.test"]);
  await assert.rejects(
    api.authorizeMessage(
      { action: "saveSnippet", data: { text: "blocked" } },
      { ...sender, url: "https://sub.example.test/a" },
      db,
    ),
    /disabled/,
  );
  assert.equal(
    (
      await api.authorizeMessage(
        { action: "getSetting", key: "blockedSites" },
        sender,
        db,
      )
    ).key,
    "blockedSites",
  );
  await assert.rejects(
    api.authorizeMessage(
      { action: "captureClipboard", data: { text: "blocked" } },
      sender,
      db,
    ),
    /disabled/,
  );
  await db.setSetting("clipboardCaptureEnabled", true);
  assert.equal((await api.handleMessage(db, captureMessage)).changed, false);
  const futureClock = Date.now() + 100000;
  await db.saveSnippet({
    id: "future-clock",
    text: "Clock",
    type: "note",
    updated_at: futureClock,
  });
  await db.updateSnippet("future-clock", { text: "Newer local edit" });
  assert.ok(
    (await db.getSnippetById("future-clock")).updated_at > futureClock,
    "Local edits and folder moves must advance an existing content revision",
  );
  const folderA = await api.handleMessage(db, {
    action: "createSpace",
    name: "  Work  ",
  });
  assert.equal(folderA.success, true);
  assert.equal(folderA.space.name, "Work");
  assert.equal(
    (await api.handleMessage(db, { action: "createSpace", name: "work" }))
      .success,
    false,
  );
  await assert.rejects(db.createSpace({ name: " " }), /folder name/);
  await assert.rejects(db.createSpace({ name: "a".repeat(41) }), /folder name/);
  await assert.rejects(db.updateSpace("inbox", { name: "Changed" }), /Inbox/);
  const originalId = folderA.space.id;
  await api.handleMessage(db, {
    action: "updateSpace",
    spaceId: originalId,
    name: "Projects",
  });
  assert.equal(
    (await db.getStoredSpaces()).find((space) => space.id === originalId).name,
    "Projects",
  );
  await db.saveSnippet({
    id: "filed",
    type: "note",
    text: "Keep full body".repeat(500),
    spaceId: originalId,
    created_at: 500,
  });
  assert.equal(
    (
      await api.handleMessage(db, {
        action: "getLibraryPage",
        query: { filter: "folder", spaceId: originalId },
      })
    ).cards[0].text.length,
    1000,
  );
  const full = await api.handleMessage(db, {
    action: "getSnippet",
    cardId: "filed",
  });
  assert.equal(full.snippet.text.length, "Keep full body".repeat(500).length);
  const exportedFolder = await api.buildBackupBundle(db, "export");
  assert.ok(
    exportedFolder.spaces.some(
      (space) => space.id === originalId && space.name === "Projects",
    ),
  );
  const folderB = await db.createSpace({ name: "Reading" });
  assert.equal(
    (
      await api.handleMessage(db, {
        action: "moveSnippet",
        cardId: "filed",
        spaceId: folderB.space.id,
      })
    ).success,
    true,
  );
  assert.equal((await db.getSnippetById("filed")).spaceId, folderB.space.id);
  assert.equal(
    (
      await api.handleMessage(db, {
        action: "moveSnippet",
        cardId: "filed",
        spaceId: "missing",
      })
    ).success,
    false,
  );
  await db.softDeleteSnippet("filed");
  await api.handleMessage(db, {
    action: "deleteSpace",
    spaceId: folderB.space.id,
  });
  assert.equal((await db.getSnippetById("filed")).spaceId, "inbox");
  assert.ok((await db.getSnippetById("filed")).deleted_at);
  assert.equal(local["shadowSnippet:filed"].spaceId, "inbox");
  const deletedFolder = (await db.getStoredSpaces()).find(
    (space) => space.id === folderB.space.id,
  );
  assert.ok(deletedFolder.deleted_at);
  assert.equal(
    (await db.getSpaces()).some((space) => space.id === folderB.space.id),
    false,
  );
  await assert.rejects(
    db.updateSpace(folderB.space.id, { name: "Resurrect" }),
    (error) => /not found/.test(error.error),
  );
  await assert.rejects(db.moveSnippet("filed", folderB.space.id), /not found/);
  await db.importData({ snippets: [], spaces: [folderB.space] });
  assert.ok(
    (await db.getStoredSpaces()).find((space) => space.id === folderB.space.id)
      .deleted_at,
    "Importing old metadata must retain the deletion marker",
  );
  await db.restoreSnippet("filed");
  assert.equal(
    (await db.getSnippetById("filed")).text,
    "Keep full body".repeat(500),
  );
  assert.equal(
    (await api.handleMessage(db, { action: "deleteSpace", spaceId: "inbox" }))
      .success,
    false,
  );
  await db.replaceDataFromBackup(exportedFolder);
  assert.ok(
    (await db.getStoredSpaces()).some((space) => space.id === originalId),
  );
  assert.equal((await db.getSnippetById("filed")).spaceId, originalId);
  let finishMaintenance;
  const maintenance = api.withDataMaintenance(
    () =>
      new Promise((resolve) => {
        finishMaintenance = resolve;
      }),
  );
  await Promise.resolve();
  assert.equal((await api.performSync()).success, false);
  assert.equal((await api.performBackup()).success, false);
  finishMaintenance();
  await maintenance;
  api.auth.detectBrave = async () => false;
  const detected = await api.handleMessage(db, { action: "getGoogleAuthStatus", browser: "brave" });
  assert.equal(detected.method, "web");
  assert.equal(detected.connected, false);
  await api.handleMessage(db, { action: "setSetting", key: "syncConfig", value: {
    type: "googledrive", autoSyncInterval: "off", autoBackupInterval: "daily",
  } });
  let nativeClears = 0;
  let webFlows = 0;
  chrome.identity.clearAllCachedAuthTokens = async () => {
    nativeClears++;
  };
  chrome.identity.launchWebAuthFlow = (options, callback) => {
    webFlows++;
    const url = new URL(options.url);
    callback(
      chrome.identity.getRedirectURL("google") +
        "#" +
        new URLSearchParams({
          state: url.searchParams.get("state"),
          access_token: "PRIVATE_WEB_TOKEN",
          token_type: "Bearer",
          expires_in: "3600",
        }),
    );
  };
  const webConnected = await api.handleMessage(db, {
    action: "connectGoogleDrive",
  });
  assert.equal(webConnected.success, true);
  assert.equal(webConnected.connected, true);
  assert.equal(
    JSON.stringify(webConnected).includes("PRIVATE_WEB_TOKEN"),
    false,
  );
  assert.equal(
    JSON.stringify(await api.buildBackupBundle(db, "export")).includes(
      "PRIVATE_WEB_TOKEN",
    ),
    false,
  );
  await api.handleMessage(db, { action: "setSetting", key: "syncConfig", value: {
    ...(await db.getSetting("syncConfig")), type: "none",
  } });
  assert.equal(session.googleWebAccessToken, undefined);
  assert.equal(local.googleAuthMethod, undefined);
  assert.equal(local.googleAuthBrowser, "brave");
  assert.equal((await db.getSetting("syncConfig")).autoBackupInterval, "daily");
  assert.equal((await api.handleMessage(db, { action: "getGoogleAuthStatus" })).connected, false);
  assert.equal((await api.handleMessage(db, { action: "connectGoogleDrive" })).success, false,
    "Connecting is unavailable while sync is off");
  await api.handleMessage(db, { action: "setSetting", key: "syncConfig", value: {
    ...(await db.getSetting("syncConfig")), type: "googledrive",
  } });
  assert.equal((await api.handleMessage(db, { action: "getGoogleAuthStatus" })).needsReconnect, false);
  assert.equal((await api.handleMessage(db, { action: "connectGoogleDrive" })).connected, true);
  assert.equal(webFlows, 2, "Off → Drive → Connect starts a fresh web connection");
  assert.equal(
    (await api.handleMessage(db, { action: "disconnectGoogleDrive" })).success,
    true,
  );
  assert.equal(
    nativeClears,
    0,
    "Web disconnect does not revoke native browser credentials or other devices",
  );
  assert.equal(session.googleWebAccessToken, undefined);
  assert.equal(local.googleAuthMethod, undefined);
  const queuedSave = api.handleMessage(db, {
    action: "saveSnippet",
    data: { id: "before-clear", text: "Must be cleared too" },
  });
  const queuedClear = api.handleMessage(db, { action: "clearAllData" });
  assert.equal((await queuedSave).success, true);
  assert.equal((await queuedClear).success, true);
  assert.equal((await db.getAllSnippetsIncludingDeleted()).length, 0);
  assert.equal(Object.keys(local).length, 0);
  db.db.close();
  console.log(
    "background.test.js: ok (v5 upgrade, import, transaction merge, privacy, routing, maintenance)",
  );
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
