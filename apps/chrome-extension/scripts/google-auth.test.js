const assert = require("node:assert/strict");
const { GoogleDriveAuth, TOKEN_KEY, MODE_KEY, BROWSER_KEY, NATIVE_KEY, detectGoogleBrowser } = require("../google-auth");
function setup(options = {}) {
  const local = {},
    session = {},
    calls = [];
  let now = 100000,
    flow;
  const area = (values) => ({
    get: async (key) => ({ [key]: values[key] }),
    set: async (data) => Object.assign(values, structuredClone(data)),
    remove: async (key) => {
      for (const name of Array.isArray(key) ? key : [key]) delete values[name];
    },
  });
  const chrome = {
    storage: { local: area(local), session: area(session) },
    runtime: {},
    identity: {
      getRedirectURL: (path) => "https://extension.chromiumapp.org/" + path,
      getAuthToken: (options, cb) => {
        calls.push({ native: options });
        cb("native-token");
      },
      launchWebAuthFlow: (options, cb) => {
        calls.push(options);
        flow ? flow(options, cb) : success(options, cb);
      },
    },
  };
  function success(options, cb, token = "web-token") {
    const request = new URL(options.url),
      params = new URLSearchParams({
        state: request.searchParams.get("state"),
        access_token: token,
        token_type: "Bearer",
        expires_in: "3600",
        scope: "https://www.googleapis.com/auth/drive.file",
      });
    cb(chrome.identity.getRedirectURL("google") + "#" + params);
  }
  const auth = new GoogleDriveAuth({
    chrome,
    clientId: "123-public.apps.googleusercontent.com",
    now: () => now,
    detectBrave: async () => options.brave === true,
    ...options,
  });
  return {
    auth,
    local,
    session,
    calls,
    chrome,
    setFlow: (value) => {
      flow = value;
    },
    success,
    setTime: (value) => {
      now = value;
    },
  };
}
async function run() {
  assert.equal(await detectGoogleBrowser({ brave: { isBrave: async () => true } }), "brave");
  assert.equal(await detectGoogleBrowser({ userAgentData: { brands: [{ brand: "Brave" }] } }), "brave");
  assert.equal(await detectGoogleBrowser({
    brave: { isBrave: async () => { throw new Error("Unavailable"); } },
    userAgentData: { brands: [{ brand: "Google Chrome" }] },
  }), "chrome");
  assert.equal(await detectGoogleBrowser({ userAgent: "Chrome/141.0" }), "unknown",
    "A Chrome user-agent string alone does not identify the browser");
  let h = setup();
  assert.equal((await h.auth.status()).connected, false);
  assert.equal(await h.auth.connect(), "native-token");
  assert.deepEqual(
    h.calls,
    [{ native: { interactive: true } }],
    "Chrome keeps its native authorization path",
  );
  assert.equal((await h.auth.status()).method, "native");
  assert.equal((await h.auth.status()).connected, true);
  await h.auth.invalidateNative();
  assert.equal(h.session[NATIVE_KEY], undefined);
  assert.equal((await h.auth.status()).connected, false);
  h = setup();
  await h.auth.noteBrowser("brave");
  await h.auth.connect();
  assert.equal(h.calls.some((call) => call.native), false,
    "The settings-page Brave signal reaches a worker without navigator.brave");
  await h.auth.forgetWeb();
  assert.equal(h.local[BROWSER_KEY], "brave");
  assert.equal((await h.auth.status()).connected, false);
  assert.equal((await h.auth.status()).needsReconnect, false);
  await h.auth.connect();
  assert.equal(h.calls.length, 2, "Re-enabling Drive can connect again through web");
  h = setup();
  h.chrome.identity.getAuthToken = (_options, cb) => {
    h.chrome.runtime.lastError = { message: "getAuthToken is not supported" };
    cb();
    delete h.chrome.runtime.lastError;
  };
  assert.equal(await h.auth.connect(), "web-token");
  assert.equal(await h.auth.method(), "web");
  h = setup();
  h.chrome.identity.getAuthToken = (_options, cb) => {
    h.chrome.runtime.lastError = { message: "User did not approve access" };
    cb();
    delete h.chrome.runtime.lastError;
  };
  await assert.rejects(h.auth.connect(), /did not approve/);
  assert.equal(h.calls.length, 0, "Chrome cancellation must not start web authorization");
  h = setup({ brave: true });
  const tokens = await Promise.all([
    h.auth.getToken(true),
    h.auth.getToken(true),
  ]);
  assert.deepEqual(tokens, ["web-token", "web-token"]);
  assert.equal(h.calls.length, 1, "Concurrent requests share one web window");
  const request = new URL(h.calls[0].url);
  assert.equal(request.searchParams.get("response_type"), "token");
  assert.equal(
    request.searchParams.get("scope"),
    "https://www.googleapis.com/auth/drive.file",
  );
  assert.equal(request.searchParams.get("prompt"), "select_account");
  assert.ok(request.searchParams.get("state").length >= 64);
  assert.equal(h.local[MODE_KEY], "web");
  assert.equal(Object.values(h.local).includes("web-token"), false);
  assert.ok(h.session[TOKEN_KEY].accessToken);
  assert.equal(await h.auth.getToken(false), "web-token");
  assert.equal(
    h.calls.length,
    1,
    "Valid session token is reused without a window",
  );
  h.setTime(4000000);
  assert.equal(await h.auth.getToken(false), "web-token");
  assert.equal(h.calls.at(-1).interactive, false);
  assert.equal(new URL(h.calls.at(-1).url).searchParams.get("prompt"), "none");
  assert.equal(h.calls.at(-1).abortOnLoadForNonInteractive, false);
  await h.auth.invalidate("other-token");
  assert.ok(h.session[TOKEN_KEY]);
  await h.auth.invalidate("web-token");
  assert.equal(h.session[TOKEN_KEY], undefined);
  h.setFlow((_options, cb) => {
    h.chrome.runtime.lastError = {
      message: "Provider URL contains sensitive data",
    };
    cb();
    delete h.chrome.runtime.lastError;
  });
  await assert.rejects(
    h.auth.getToken(false),
    (error) =>
      error.code === "AUTH_RECONNECT" && !error.message.includes("sensitive"),
  );
  assert.equal(
    h.calls.at(-1).interactive,
    false,
    "Automatic sync never opens an interactive login",
  );

  for (const variant of [
    "origin",
    "path",
    "state",
    "duplicate",
    "expiry",
    "scope",
    "tokenType",
  ]) {
    h = setup({ brave: true });
    h.setFlow((options, cb) => {
      const request = new URL(options.url),
        params = new URLSearchParams({
          state: request.searchParams.get("state"),
          access_token: "secret",
          token_type: "Bearer",
          expires_in: "3600",
        });
      if (variant === "state") params.set("state", "wrong");
      if (variant === "duplicate") params.append("access_token", "second");
      if (variant === "expiry") params.set("expires_in", "NaN");
      if (variant === "scope") params.set("scope", "openid");
      if (variant === "tokenType") params.set("token_type", "Other");
      cb(
        (variant === "origin"
          ? "https://attacker.test/google"
          : variant === "path"
            ? "https://extension.chromiumapp.org/wrong"
            : h.chrome.identity.getRedirectURL("google")) +
          "#" +
          params,
      );
    });
    await assert.rejects(h.auth.connectWeb(), (error) =>
      ["AUTH_INVALID_RESPONSE", "AUTH_INSUFFICIENT_SCOPE"].includes(error.code),
    );
    assert.deepEqual(h.local, {});
    assert.deepEqual(h.session, {});
  }
  h = setup({ brave: true, clientId: "" });
  await assert.rejects(
    h.auth.getToken(true),
    (error) => error.code === "AUTH_WEB_NOT_CONFIGURED",
  );
  assert.equal(h.calls.length, 0);
  h = setup();
  await h.auth.connectWeb();
  assert.equal(
    await h.auth.method(),
    "web",
    "Explicit web connection also works when Brave detection is hidden",
  );
  await h.auth.forgetWeb();
  assert.deepEqual(h.session, {});
  assert.equal(await h.auth.method(), "native");

  h = setup({ brave: true });
  let complete;
  h.setFlow((options, cb) => {
    complete = () => h.success(options, cb, "late-token");
  });
  const pending = h.auth.connectWeb();
  while (!complete) await new Promise((resolve) => setImmediate(resolve));
  await h.auth.forgetWeb();
  complete();
  await assert.rejects(pending, (error) => error.code === "AUTH_CHANGED");
  assert.deepEqual(
    h.session,
    {},
    "A late callback cannot restore credentials after disconnect or clear",
  );
  console.log(
    "google-auth.test.js: ok (native Chrome unchanged, web state/redirect/scope validation, session-only tokens, silent renewal, concurrency, late callback)",
  );
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
