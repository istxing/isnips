const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { IDBFactory, IDBKeyRange } = require("fake-indexeddb");
const settle = async () => {
  for (let i = 0; i < 20; i++)
    await new Promise((resolve) => setImmediate(resolve));
};
async function run() {
  const local = {},
    alarms = new Map(),
    events = {},
    broadcasts = [],
    created = [];
  let now = 1800000000000,
    failSnapshot = false,
    failCreate = false,
    failClear = false;
  const event = (name) => ({
    addListener: (listener) => {
      events[name] = listener;
    },
  });
  const chrome = {
    runtime: {
      id: "test",
      getURL: (p) => "chrome-extension://test/" + p,
      onMessage: event("message"),
      onInstalled: event("install"),
      onStartup: event("startup"),
      sendMessage: async (message) => {
        broadcasts.push(message);
      },
    },
    storage: {
      local: {
        setAccessLevel: async () => {},
        get(keys, cb) {
          const result =
            keys == null
              ? structuredClone(local)
              : Object.fromEntries(
                  (Array.isArray(keys) ? keys : [keys]).map((key) => [
                    key,
                    structuredClone(local[key]),
                  ]),
                );
          cb(result);
        },
        set(values, cb) {
          if (
            failSnapshot &&
            Object.keys(values).some((key) => key.startsWith("backupSnapshot:"))
          ) {
            chrome.runtime.lastError = { message: "Snapshot quota exceeded" };
            cb();
            delete chrome.runtime.lastError;
            return;
          }
          Object.assign(local, structuredClone(values));
          cb();
        },
        remove(keys, cb) {
          keys.forEach((key) => delete local[key]);
          cb();
        },
        clear: async () => {
          Object.keys(local).forEach((key) => delete local[key]);
        },
      },
    },
    alarms: {
      get: async (name) => alarms.get(name),
      create: async (name, options) => {
        if (failCreate) throw new Error("Alarm scheduling failed");
        alarms.set(name, {
          ...options,
          scheduledTime: now + options.delayInMinutes * 60000,
        });
        created.push(name);
      },
      clear(name, cb) {
        if (failClear) {
          chrome.runtime.lastError = { message: "Alarm clear failed" };
          cb(false);
          delete chrome.runtime.lastError;
          return;
        }
        cb(alarms.delete(name));
      },
      onAlarm: event("alarm"),
    },
    tabs: {
      query: (_options, cb) => {
        cb?.([]);
        return Promise.resolve([]);
      },
      sendMessage: async () => {},
    },
    contextMenus: { onClicked: event("context") },
    action: { onClicked: event("action") },
    commands: { onCommand: event("command") },
  };
  class ClockDate extends Date {
    static now() {
      return now;
    }
  }
  const context = vm.createContext({
    chrome,
    indexedDB: new IDBFactory(),
    IDBKeyRange,
    Date: ClockDate,
    console: { warn() {}, error() {} },
    URL,
    crypto,
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
      "\nthis.api = { getDatabase, scheduleAutoBackupAlarm, performBackup, listBackupSnapshots, restoreBackupSnapshot };",
    context,
  );
  const { api } = context,
    db = await api.getDatabase();
  await settle();
  assert.equal(alarms.has("autoBackup"), false);
  await db.setSetting("syncConfig", {
    type: "none",
    autoBackupInterval: "30m",
    password: "private",
  });
  await db.saveSnippet({ id: "record", text: "Back me up", type: "note" });
  await db.storeHighlight({
    id: "highlight",
    text: "quote",
    url: "https://example.test",
  });
  const native = await db.initialize();
  await new Promise((resolve, reject) => {
    const tx = native.transaction("spaces", "readwrite");
    tx.objectStore("spaces").put({ id: "space", name: "Existing space" });
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
  await api.scheduleAutoBackupAlarm();
  const scheduledTime = alarms.get("autoBackup").scheduledTime;
  assert.equal(alarms.get("autoBackup").periodInMinutes, 30);
  now += 60000;
  await api.scheduleAutoBackupAlarm();
  events.startup();
  await settle();
  assert.equal(
    alarms.get("autoBackup").scheduledTime,
    scheduledTime,
    "Worker/startup must not reset a pending alarm",
  );
  assert.equal(created.filter((name) => name === "autoBackup").length, 1);
  alarms.delete("autoBackup");
  events.startup();
  await settle();
  assert.equal(
    created.filter((name) => name === "autoBackup").length,
    2,
    "Missing alarms must be recreated on startup",
  );
  events.alarm({ name: "autoBackup" });
  await settle();
  assert.equal(
    local.backupSnapshotIds.length,
    1,
    "An actual alarm event must create a local snapshot with sync off",
  );
  const firstId = local.backupSnapshotIds[0],
    first = local["backupSnapshot:" + firstId];
  assert.equal(first.source, "auto");
  assert.equal(first.snippets[0].text, "Back me up");
  assert.equal(first.highlights[0].id, "highlight");
  assert.equal(first.spaces[0].id, "space");
  assert.equal(JSON.stringify(first).includes("private"), false);
  assert.equal(await db.getSetting("lastBackupTime"), now);
  assert.equal(broadcasts.at(-1).action, "backupCompleted");
  now += 60000;
  const parallel = await Promise.all([
    api.performBackup("auto"),
    api.performBackup("auto"),
  ]);
  assert.equal(
    parallel[0].snapshotId,
    parallel[1].snapshotId,
    "Overlapping triggers coalesce",
  );
  assert.equal(local.backupSnapshotIds.length, 2);
  const lastSuccess = await db.getSetting("lastBackupTime");
  const beforeFailure = [...local.backupSnapshotIds];
  now += 60000;
  failSnapshot = true;
  const failed = await api.performBackup("auto");
  assert.equal(failed.success, false);
  assert.match(failed.error, /quota/);
  assert.equal(await db.getSetting("lastBackupTime"), lastSuccess);
  assert.deepEqual(local.backupSnapshotIds, beforeFailure);
  failSnapshot = false;
  assert.equal(
    (await api.performBackup("auto")).success,
    true,
    "A failed backup must release the in-flight lock",
  );
  for (let i = 0; i < 49; i++) {
    now += 60000;
    assert.equal((await api.performBackup("auto")).success, true);
  }
  assert.equal(local.backupSnapshotIds.length, 48);
  assert.equal(
    Object.keys(local).filter((key) => key.startsWith("backupSnapshot:"))
      .length,
    48,
  );
  assert.equal(
    local["backupSnapshot:" + firstId],
    undefined,
    "Old snapshots must be removed",
  );
  assert.equal((await api.listBackupSnapshots(20)).snapshots.length, 20);
  const restoreId = local.backupSnapshotIds[0];
  await db.updateSnippet("record", { text: "Later edit" });
  const restored = await api.restoreBackupSnapshot(restoreId);
  assert.equal(restored.success, true);
  assert.equal((await db.getSnippetById("record")).text, "Back me up");
  assert.equal((await db.getSetting("syncConfig")).password, "private");
  await db.setSetting("syncConfig", {
    type: "none",
    autoBackupInterval: "off",
  });
  failClear = true;
  await assert.rejects(api.scheduleAutoBackupAlarm(), /Alarm clear failed/);
  failClear = false;
  await api.scheduleAutoBackupAlarm();
  assert.equal(alarms.has("autoBackup"), false);
  const count = local.backupSnapshotIds.length;
  events.alarm({ name: "autoBackup" });
  await settle();
  assert.equal(
    local.backupSnapshotIds.length,
    count,
    "Queued events must be ignored after disabling auto backup",
  );
  assert.equal(
    (await api.performBackup("manual")).success,
    true,
    "Manual backup must work when auto backup is off",
  );
  await db.setSetting("syncConfig", { type: "none", autoBackupInterval: "1h" });
  failCreate = true;
  await assert.rejects(
    api.scheduleAutoBackupAlarm(),
    /Alarm scheduling failed/,
  );
  failCreate = false;
  await api.scheduleAutoBackupAlarm();
  assert.equal(alarms.get("autoBackup").periodInMinutes, 60);
  db.db.close();
  console.log(
    "backup.test.js: ok (alarm stability, startup recovery, actual alarm trigger, retention, failed writes, overlap, restore, disable)",
  );
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
