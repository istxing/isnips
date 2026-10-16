const assert = require("node:assert/strict");
const { IDBFactory } = require("fake-indexeddb");
global.importScripts = () => {};
Object.assign(global, require("../merge"));
const SyncService = require("../sync").constructor;
const factory = new IDBFactory();
async function device(name) {
  const request = factory.open(name, 5);
  request.onupgradeneeded = () => {
    for (const name of ["snippets", "spaces"])
      request.result.createObjectStore(name, { keyPath: "id" });
  };
  const native = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const settings = {};
  const db = {
    initialize: async () => native,
    async getSyncData() {
      const tx = native.transaction(["snippets", "spaces"], "readonly");
      let snippets, spaces;
      tx.objectStore("snippets").getAll().onsuccess = (event) => {
        snippets = event.target.result;
      };
      tx.objectStore("spaces").getAll().onsuccess = (event) => {
        spaces = event.target.result;
      };
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve({ snippets, spaces });
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
    },
    getSetting: async (key, fallback) => settings[key] ?? fallback,
    setSetting: async (key, value) => {
      settings[key] = value;
      return { success: true };
    },
    runShadowSnippetTask: async (_name, work) => work(),
    syncShadowSnippets: async () => {},
  };
  const service = new SyncService();
  await service.setDatabase(db);
  const put = async (store, value) => {
    const tx = native.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  };
  const get = async (store, id) => {
    const request = native.transaction(store).objectStore(store).get(id);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };
  return { native, db, service, put, get };
}
function response(status, body, etag) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: new Headers(etag ? { ETag: etag } : {}),
    text: async () => (body == null ? "" : JSON.stringify(body)),
    json: async () => body,
  };
}
async function run() {
  const devices = [],
    create = async (name) => {
      const value = await device(name);
      devices.push(value);
      return value;
    };
  try {
    const a = await create("A"),
      b = await create("B");
    await a.put("spaces", {
      id: "work",
      name: "Work",
      createdAt: 10,
      updated_at: 10,
      order: 0,
      privateToken: "must-not-upload",
    });
    await a.put("snippets", {
      id: "n",
      type: "note",
      text: "Original note",
      updated_at: 20,
      created_at: 20,
      spaceId: "work",
    });
    const first = await a.service.bundleData();
    assert.equal(first.version, "3.2.0");
    assert.equal(JSON.stringify(first).includes("must-not-upload"), false);
    assert.equal((await b.service.mergeData(first)).success, true);
    assert.equal((await b.get("spaces", "work")).name, "Work");
    assert.equal((await b.get("snippets", "n")).spaceId, "work");
    await b.put("spaces", {
      ...(await b.get("spaces", "work")),
      name: "Reading",
      updated_at: 30,
    });
    await a.service.mergeData(await b.service.bundleData());
    assert.equal((await a.get("spaces", "work")).name, "Reading");

    // Compare folders after a local rename transaction queued during the download.
    const tx = a.native.transaction("spaces", "readwrite");
    tx.objectStore("spaces").put({
      id: "work",
      name: "Local newer rename",
      createdAt: 10,
      updated_at: 100,
    });
    const committed = new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
    const merging = a.service.mergeData({
      snippets: [],
      spaces: [{ id: "work", name: "Stale download", updated_at: 40 }],
    });
    await Promise.all([committed, merging]);
    assert.equal((await a.get("spaces", "work")).name, "Local newer rename");
    await b.service.mergeData(await a.service.bundleData());
    assert.equal((await b.get("spaces", "work")).name, "Local newer rename");

    await a.put("spaces", {
      ...(await a.get("spaces", "work")),
      updated_at: 120,
      deleted_at: 120,
    });
    await a.put("snippets", {
      ...(await a.get("snippets", "n")),
      spaceId: "inbox",
    });
    await b.put("spaces", {
      ...(await b.get("spaces", "work")),
      name: "Offline rename after delete",
      updated_at: 200,
    });
    await b.put("snippets", {
      ...(await b.get("snippets", "n")),
      text: "Offline edit must survive",
      updated_at: 50,
    });
    await a.service.mergeData(await b.service.bundleData());
    assert.equal(
      (await a.get("spaces", "work")).deleted_at,
      120,
      "Offline renames cannot resurrect deleted folders",
    );
    assert.equal(
      (await a.get("snippets", "n")).text,
      "Offline edit must survive",
    );
    assert.equal((await a.get("snippets", "n")).spaceId, "inbox");
    assert.equal(
      (await a.get("snippets", "n")).updated_at,
      50,
      "Assignment cleanup does not advance the content clock",
    );
    await b.service.mergeData(await a.service.bundleData());
    assert.equal((await b.get("spaces", "work")).deleted_at, 120);
    assert.equal((await b.get("snippets", "n")).spaceId, "inbox");

    // Old sync files do not contain spaces. Their record edits still merge; local folders remain.
    await b.put("spaces", {
      id: "local-only",
      name: "Local folder",
      createdAt: 30,
    });
    await b.service.mergeData({
      version: "3.0.0",
      snippets: [
        { id: "n", text: "Old-client edit", updated_at: 60, spaceId: "work" },
      ],
    });
    assert.equal((await b.get("spaces", "local-only")).name, "Local folder");
    assert.equal((await b.get("snippets", "n")).text, "Old-client edit");
    assert.equal((await b.get("snippets", "n")).spaceId, "inbox");
    await b.service.mergeData({ snippets: [], spaces: [] });
    assert.ok(await b.get("spaces", "local-only"));
    for (const spaces of [
      null,
      [{ id: "bad", name: 3 }],
      [{ id: "bad", name: "Bad", updated_at: Infinity }],
    ]) {
      assert.equal(
        (
          await b.service.mergeData({
            snippets: [{ id: "not-written", text: "No partial commit" }],
            spaces,
          })
        ).success,
        false,
      );
      assert.equal(await b.get("snippets", "not-written"), undefined);
    }
    await assert.rejects(
      b.service.mergeData({
        spaces: [{ id: "rollback", name: "Rollback", updated_at: 1 }],
        snippets: [{ id: "uncloneable", text: "Abort all", bad() {} }],
      }),
    );
    assert.equal(
      await b.get("spaces", "rollback"),
      undefined,
      "A record write failure rolls back folder definitions too",
    );
    assert.equal(await b.get("snippets", "uncloneable"), undefined);

    for (const side of [a, b])
      await side.put("spaces", {
        id: "tie",
        name: side === a ? "Alpha" : "Beta",
        updated_at: 300,
      });
    const aTie = await a.service.bundleData(),
      bTie = await b.service.bundleData();
    await a.service.mergeData(bTie);
    await b.service.mergeData(aTie);
    assert.equal(
      (await a.get("spaces", "tie")).name,
      (await b.get("spaces", "tie")).name,
      "Timestamp ties converge deterministically",
    );

    const cloud = await a.service.bundleData();
    const webdav = await create("WebDAV");
    await webdav.db.setSetting("syncConfig", {
      type: "webdav",
      url: "https://dav.example.test",
      username: "name",
      password: "secret",
    });
    let uploaded;
    global.fetch = async (_url, options = {}) => {
      if (options.method === "PROPFIND") return response(207);
      if (options.method === "HEAD") return response(200, null, '"v1"');
      if (options.method === "PUT") {
        uploaded = JSON.parse(options.body);
        assert.equal(options.headers["If-Match"], '"v1"');
        return response(201, null, '"v2"');
      }
      return response(200, cloud, '"v1"');
    };
    assert.equal(
      (
        await webdav.service.syncWebDAV(
          await webdav.db.getSetting("syncConfig"),
        )
      ).success,
      true,
    );
    assert.ok(
      uploaded.spaces.some((space) => space.id === "work" && space.deleted_at),
    );
    assert.ok(
      uploaded.spaces.some((space) => space.id === "tie" && !space.deleted_at),
    );
    assert.equal((await webdav.get("snippets", "n")).spaceId, "inbox");
    assert.equal(JSON.stringify(uploaded).includes("secret"), false);

    const drive = await create("Drive");
    drive.service._getGoogleToken = async () => "token";
    drive.service._ensureGoogleDriveFolder = async () => "folder";
    drive.service._findGoogleDriveFile = async () => ({
      id: "file",
      modifiedTime: "v1",
    });
    drive.service._getGoogleDriveFileMeta = async () => ({
      modifiedTime: "v1",
    });
    uploaded = null;
    global.fetch = async (_url, options = {}) => {
      if (options.method === "PATCH") {
        uploaded = JSON.parse(options.body);
        assert.equal(options.headers["If-Match"], '"v1"');
        return response(200);
      }
      return response(200, cloud, '"v1"');
    };
    assert.equal((await drive.service.syncGoogleDrive()).success, true);
    assert.ok(uploaded.spaces.some((space) => space.id === "tie"));
    assert.equal((await drive.get("spaces", "work")).deleted_at, 120);
    drive.service._findGoogleDriveFile = async () => null;
    global.fetch = async (_url, options) => {
      uploaded = JSON.parse(await options.body.get("file").text());
      return response(201);
    };
    assert.equal((await drive.service.syncGoogleDrive()).success, true);
    assert.ok(uploaded.spaces.some((space) => space.id === "tie"));
    console.log(
      "folder-sync.test.js: ok (two devices, atomic folders+records, rename races, delete vs offline edits, legacy files, rollback, WebDAV and Drive transport)",
    );
  } finally {
    for (const device of devices) device.native.close();
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
