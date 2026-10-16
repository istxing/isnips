const assert = require("node:assert/strict");

global.importScripts = () => {};
Object.assign(global, require("../merge"));
const syncService = require("../sync");

function response(status, body = null, etag = null) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: { get: (key) => (key.toLowerCase() === "etag" ? etag : null) },
    json: async () => body,
    text: async () =>
      body === null
        ? ""
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
  };
}

async function run() {
  const reportError = console.error;
  console.error = () => {}; // The cases below intentionally exercise failed syncs.
  try {
    let requests = [];
    const config = {
      type: "webdav",
      url: "https://dav.example.test",
      username: "user",
      password: "pass",
    };
    syncService.setDatabase({
      getAllSnippetsIncludingDeleted: async () => [
        { id: "local", text: "local", updated_at: 1 },
      ],
      getSetting: async () => config,
      setSetting: async () => ({ success: true }),
    });

    global.fetch = async (...args) => {
      requests.push(args);
      return response(200);
    };
    const insecure = await syncService.syncWebDAV({
      ...config,
      url: "http://dav.example.test",
    });
    assert.equal(insecure.success, false);
    assert.equal(requests.length, 0);

    requests = [];
    global.fetch = async (url, options = {}) => {
      requests.push({ url, method: options.method || "GET" });
      if (options.method === "PROPFIND") return response(207);
      return response(200, { invalid: true }, '"old"');
    };
    const invalid = await syncService.syncWebDAV(config);
    assert.equal(invalid.success, false);
    assert.match(invalid.error, /Invalid remote data/);
    assert.equal(
      requests.some((item) => item.method === "PUT"),
      false,
    );

    // An empty remote file must be treated as "no remote data" and be overwritten.
    requests = [];
    global.fetch = async (url, options = {}) => {
      requests.push({ url, method: options.method || "GET" });
      if (options.method === "PROPFIND") return response(207);
      if (options.method === "PUT") return response(201, null, '"new"');
      return response(200, null, '"empty"');
    };
    const emptyRemote = await syncService.syncWebDAV(config);
    assert.equal(emptyRemote.success, true);
    assert.equal(
      requests.some((item) => item.method === "PUT"),
      true,
    );

    // A missing remote file must clear a stale ETag, or the PUT carries a dead If-Match and
    // every later sync fails with 412. Non-ASCII credentials must be sent UTF-8 encoded.
    let stored = {
      ...config,
      username: "用户",
      password: "密码",
      last_remote_etag: '"stale"',
    };
    syncService.setDatabase({
      getAllSnippetsIncludingDeleted: async () => [
        { id: "local", text: "local", updated_at: 1 },
      ],
      getSetting: async () => stored,
      setSetting: async (_key, value) => {
        stored = value;
        return { success: true };
      },
    });
    let putHeaders = null;
    let authHeader = null;
    global.fetch = async (url, options = {}) => {
      if (options.method === "PROPFIND") {
        authHeader = options.headers.get("Authorization");
        return response(207);
      }
      if (options.method === "PUT") {
        putHeaders = options.headers;
        return response(201, null, '"fresh"');
      }
      return response(404);
    };
    const afterRemoteDeleted = await syncService.syncWebDAV(stored);
    assert.equal(afterRemoteDeleted.success, true);
    assert.equal(putHeaders["If-Match"], undefined);
    assert.equal(putHeaders["If-None-Match"], "*");
    assert.equal(
      authHeader,
      "Basic " + Buffer.from("用户:密码", "utf8").toString("base64"),
    );
    assert.equal(stored.last_remote_etag, '"fresh"');

    for (const url of [
      "https://user:secret@example.test/dav",
      "https://example.test/dav?token=secret",
      "https://example.test/dav#path",
    ]) {
      let contacted = false;
      global.fetch = async () => {
        contacted = true;
        return response(200);
      };
      assert.equal(
        (await syncService.syncWebDAV({ ...config, url })).success,
        false,
      );
      assert.equal(contacted, false);
    }
    let transportOptions;
    global.fetch = async (_url, options) => {
      transportOptions = options;
      return response(200);
    };
    await syncService._fetchWebDAV("https://example.test");
    assert.equal(transportOptions.redirect, "error");
    assert.ok(transportOptions.signal instanceof AbortSignal);
    let removedToken;
    global.chrome = {
      identity: {
        removeCachedAuthToken: async ({ token }) => {
          removedToken = token;
        },
      },
    };
    global.fetch = async () => response(401);
    await syncService._fetch("https://www.googleapis.com/drive/v3/files", {
      headers: { Authorization: "Bearer expired" },
    });
    assert.equal(removedToken, "expired");

    syncService._getGoogleToken = async () => "token";
    syncService._ensureGoogleDriveFolder = async () => "folder";
    syncService._findGoogleDriveFile = async () => null;
    global.fetch = async () => response(500);
    const failedCreate = await syncService.syncGoogleDrive();
    assert.equal(failedCreate.success, false);
    assert.match(failedCreate.error, /create failed: 500/);

    syncService._findGoogleDriveFile = async () => ({
      id: "file",
      modifiedTime: "2026-01-01",
    });
    const failedDownload = await syncService.syncGoogleDrive();
    assert.equal(failedDownload.success, false);
    assert.match(failedDownload.error, /download failed: 500/);
    // A web-token 401 silently renews once; a second 401 never loops or opens a login window.
    let renewed = 0,
      invalidated = [],
      interactiveFlags = [];
    syncService.setGoogleAuth({
      method: async () => "web",
      invalidate: async (token) => invalidated.push(token),
      getToken: async (interactive) => {
        interactiveFlags.push(interactive);
        renewed++;
        return "renewed-token";
      },
    });
    global.fetch = async (_url, options) =>
      response(
        options.headers.Authorization === "Bearer old-web-token" ? 401 : 200,
      );
    assert.equal(
      (
        await syncService._fetch("https://www.googleapis.com/drive/v3/files", {
          headers: { Authorization: "Bearer old-web-token" },
        })
      ).status,
      200,
    );
    assert.deepEqual(interactiveFlags, [false]);
    assert.equal(renewed, 1);
    global.fetch = async () => response(401);
    await assert.rejects(
      syncService._fetch("https://www.googleapis.com/drive/v3/files", {
        headers: { Authorization: "Bearer bad-web-token" },
      }),
      (error) => error.code === "AUTH_RECONNECT",
    );
    assert.equal(renewed, 2);
    assert.equal(invalidated.at(-1), "renewed-token");
    // Missing old files need an explicit choice in web mode. Native creation retains its behavior.
    syncService._getGoogleToken = async () => "web-token";
    syncService._ensureGoogleDriveFolder = async () => "folder";
    syncService._findGoogleDriveFile = async () => null;
    let writes = 0;
    global.fetch = async () => {
      writes++;
      return response(201);
    };
    const missingFile = await syncService.syncGoogleDrive({
      interactive: false,
    });
    assert.equal(missingFile.code, "AUTH_CREATE_SYNC_REQUIRED");
    assert.equal(writes, 0);
    assert.equal(
      (await syncService.syncGoogleDrive({ allowCreate: true })).success,
      true,
    );
    assert.equal(writes, 1);
    syncService.setGoogleAuth(null);
  } finally {
    console.error = reportError;
  }
  console.log("sync.test.js: ok");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
