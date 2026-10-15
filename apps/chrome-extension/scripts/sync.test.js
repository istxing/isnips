const assert = require("node:assert/strict");

global.importScripts = () => {};
global.mergeSnippets = require("../merge").mergeSnippets;
const syncService = require("../sync");

function response(status, body = null, etag = null) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: { get: (key) => (key.toLowerCase() === "etag" ? etag : null) },
    json: async () => body,
    text: async () => (body === null ? "" : typeof body === "string" ? body : JSON.stringify(body)),
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
    let stored = { ...config, username: "用户", password: "密码", last_remote_etag: '"stale"' };
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
    assert.equal(
      authHeader,
      "Basic " + Buffer.from("用户:密码", "utf8").toString("base64"),
    );
    assert.equal(stored.last_remote_etag, '"fresh"');

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
  } finally {
    console.error = reportError;
  }
  console.log("sync.test.js: ok");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
