(function (root) {
  const SCOPE = "https://www.googleapis.com/auth/drive.file";
  const TOKEN_KEY = "googleWebAccessToken",
    MODE_KEY = "googleAuthMethod",
    BROWSER_KEY = "googleAuthBrowser",
    NATIVE_KEY = "googleNativeConnected";
  async function detectGoogleBrowser(browserNavigator = root.navigator) {
    try {
      if (await browserNavigator?.brave?.isBrave?.()) return "brave";
    } catch {}
    const brands = browserNavigator?.userAgentData?.brands || [];
    if (brands.some(({ brand }) => /brave/i.test(brand))) return "brave";
    if (brands.some(({ brand }) => brand === "Google Chrome")) return "chrome";
    return "unknown";
  }
  class GoogleAuthError extends Error {
    constructor(code) {
      super(code);
      this.code = code;
    }
  }
  class GoogleDriveAuth {
    constructor({
      chrome,
      clientId = "",
      now = () => Date.now(),
      detectBrave,
      crypto = root.crypto,
    }) {
      this.chrome = chrome;
      this.clientId = clientId;
      this.now = now;
      this.crypto = crypto;
      this.detectBrave =
        detectBrave ||
        (async () => (await detectGoogleBrowser()) === "brave");
      this.pending = null;
      this.interactivePending = null;
      this.epoch = 0;
    }
    async method() {
      const saved = await this.chrome.storage.local.get(MODE_KEY);
      if (saved[MODE_KEY] === "web") return "web";
      try {
        if (await this.detectBrave()) return "web";
      } catch {}
      const browser = await this.chrome.storage.local.get(BROWSER_KEY);
      if (browser[BROWSER_KEY] === "brave") return "web";
      return "native";
    }
    async noteBrowser(browser) {
      if (browser !== "brave" && browser !== "chrome") return;
      const saved = await this.chrome.storage.local.get(BROWSER_KEY);
      if (saved[BROWSER_KEY] !== browser)
        await this.chrome.storage.local.set({ [BROWSER_KEY]: browser });
    }
    async status() {
      const method = await this.method(),
        stored = await this.chrome.storage.session.get(TOKEN_KEY);
      const token = stored[TOKEN_KEY];
      const saved = await this.chrome.storage.local.get(MODE_KEY),
        native = await this.chrome.storage.session.get(NATIVE_KEY);
      return {
        method,
        webConfigured:
          /^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(
            this.clientId,
          ),
        connected:
          method === "web" ? this.valid(token) : native[NATIVE_KEY] === true,
        needsReconnect:
          method === "web" && saved[MODE_KEY] === "web" && !this.valid(token),
        redirectUrl: this.chrome.identity.getRedirectURL("google"),
      };
    }
    valid(token) {
      return (
        !!token?.accessToken &&
        token.clientId === this.clientId &&
        token.expiresAt > this.now() + 60000
      );
    }
    async getToken(interactive = true) {
      if (this.interactivePending) return this.interactivePending;
      if ((await this.method()) === "web") return this.webToken(interactive);
      try {
        return await this.nativeToken(interactive);
      } catch (error) {
        if (error.code !== "AUTH_NATIVE_UNAVAILABLE") throw error;
        return this.webToken(interactive);
      }
    }
    async nativeToken(interactive) {
      if (!this.chrome.identity.getAuthToken)
        throw new GoogleAuthError("AUTH_NATIVE_UNAVAILABLE");
      const epoch = this.epoch;
      let token;
      try {
        token = await new Promise((resolve, reject) => {
          this.chrome.identity.getAuthToken({ interactive }, (value) => {
            const error = this.chrome.runtime.lastError;
            if (error)
              reject(
                /not supported|not implemented|not available|unsupported/i.test(error.message)
                  ? new GoogleAuthError("AUTH_NATIVE_UNAVAILABLE")
                  : new Error(error.message),
              );
            else {
              const token = typeof value === "string" ? value : value?.token;
              token ? resolve(token) : reject(new Error("No Google token"));
            }
          });
        });
      } catch (error) {
        await this.chrome.storage.session.remove(NATIVE_KEY);
        throw error;
      }
      if (epoch !== this.epoch) throw new GoogleAuthError("AUTH_CHANGED");
      await this.chrome.storage.session.set({ [NATIVE_KEY]: true });
      if (epoch !== this.epoch) {
        await this.chrome.storage.session.remove(NATIVE_KEY);
        throw new GoogleAuthError("AUTH_CHANGED");
      }
      return token;
    }
    connect() {
      if (this.interactivePending) return this.interactivePending;
      const operation = this.getToken(true);
      const pending = operation.finally(() => {
        if (this.interactivePending === pending) this.interactivePending = null;
      });
      this.interactivePending = pending;
      return pending;
    }
    connectWeb() {
      if (this.interactivePending) return this.interactivePending;
      const operation = this.webToken(true, true);
      const pending = operation.finally(() => {
        if (this.interactivePending === pending) this.interactivePending = null;
      });
      this.interactivePending = pending;
      return pending;
    }
    webToken(interactive, force = false) {
      if (this.pending) {
        if (!force) return this.pending;
        return this.pending
          .catch(() => {})
          .then(() => this.webToken(interactive, force));
      }
      const epoch = this.epoch;
      const operation = (async () => {
        if (
          !/^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(
            this.clientId,
          )
        )
          throw new GoogleAuthError("AUTH_WEB_NOT_CONFIGURED");
        if (!this.chrome.identity.launchWebAuthFlow)
          throw new GoogleAuthError("AUTH_WEB_UNAVAILABLE");
        const stored = await this.chrome.storage.session.get(TOKEN_KEY);
        if (!force && this.valid(stored[TOKEN_KEY]))
          return stored[TOKEN_KEY].accessToken;
        const bytes = this.crypto.getRandomValues(new Uint8Array(32));
        const state = Array.from(bytes, (value) =>
          value.toString(16).padStart(2, "0"),
        ).join("");
        const redirect = this.chrome.identity.getRedirectURL("google");
        const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        for (const [key, value] of Object.entries({
          client_id: this.clientId,
          redirect_uri: redirect,
          response_type: "token",
          scope: SCOPE,
          state,
          prompt: interactive ? "select_account" : "none",
        }))
          auth.searchParams.set(key, value);
        const result = await new Promise((resolve, reject) => {
          const options = { url: auth.href, interactive };
          if (!interactive)
            Object.assign(options, {
              abortOnLoadForNonInteractive: false,
              timeoutMsForNonInteractive: 10000,
            });
          this.chrome.identity.launchWebAuthFlow(options, (url) => {
            // Provider errors can contain URLs and tokens. Never log or forward them.
            if (this.chrome.runtime.lastError || !url)
              reject(
                new GoogleAuthError(
                  interactive ? "AUTH_CANCELED" : "AUTH_RECONNECT",
                ),
              );
            else resolve(url);
          });
        });
        if (epoch !== this.epoch) throw new GoogleAuthError("AUTH_CHANGED");
        let returned;
        try {
          returned = new URL(result);
        } catch {
          throw new GoogleAuthError("AUTH_INVALID_RESPONSE");
        }
        const target = new URL(redirect);
        if (
          returned.origin !== target.origin ||
          returned.pathname !== target.pathname ||
          returned.username ||
          returned.password
        )
          throw new GoogleAuthError("AUTH_INVALID_RESPONSE");
        const values = new URLSearchParams(returned.search);
        for (const [key, value] of new URLSearchParams(returned.hash.slice(1)))
          values.append(key, value);
        for (const key of [
          "state",
          "access_token",
          "expires_in",
          "token_type",
          "error",
          "scope",
        ])
          if (values.getAll(key).length > 1)
            throw new GoogleAuthError("AUTH_INVALID_RESPONSE");
        if (values.get("state") !== state)
          throw new GoogleAuthError("AUTH_INVALID_RESPONSE");
        if (values.has("error"))
          throw new GoogleAuthError(
            values.get("error") === "access_denied"
              ? "AUTH_CANCELED"
              : "AUTH_RECONNECT",
          );
        const accessToken = values.get("access_token"),
          seconds = Number(values.get("expires_in"));
        if (
          !accessToken ||
          accessToken.length > 16384 ||
          /[\s\u0000-\u001f]/.test(accessToken) ||
          values.get("token_type")?.toLowerCase() !== "bearer" ||
          !Number.isFinite(seconds) ||
          seconds <= 60 ||
          seconds > 86400
        )
          throw new GoogleAuthError("AUTH_INVALID_RESPONSE");
        if (
          values.has("scope") &&
          !values.get("scope").split(/\s+/).includes(SCOPE)
        )
          throw new GoogleAuthError("AUTH_INSUFFICIENT_SCOPE");
        const token = {
          accessToken,
          expiresAt: this.now() + seconds * 1000,
          clientId: this.clientId,
        };
        if (epoch !== this.epoch) throw new GoogleAuthError("AUTH_CHANGED");
        await this.chrome.storage.session.set({ [TOKEN_KEY]: token });
        if (epoch !== this.epoch) {
          await this.chrome.storage.session.remove(TOKEN_KEY);
          throw new GoogleAuthError("AUTH_CHANGED");
        }
        await this.chrome.storage.local.set({ [MODE_KEY]: "web" });
        if (epoch !== this.epoch) {
          await this.forgetWeb();
          throw new GoogleAuthError("AUTH_CHANGED");
        }
        return accessToken;
      })();
      const pending = operation.finally(() => {
        if (this.pending === pending) this.pending = null;
      });
      this.pending = pending;
      return pending;
    }
    async invalidate(token) {
      const stored = await this.chrome.storage.session.get(TOKEN_KEY);
      if (stored[TOKEN_KEY]?.accessToken === token)
        await this.chrome.storage.session.remove(TOKEN_KEY);
    }
    async invalidateNative() {
      await this.chrome.storage.session.remove(NATIVE_KEY);
    }
    async forgetWeb() {
      this.epoch++;
      await this.chrome.storage.session.remove([TOKEN_KEY, NATIVE_KEY]);
      await this.chrome.storage.local.remove(MODE_KEY);
    }
  }
  root.GoogleDriveAuth = GoogleDriveAuth;
  root.GoogleAuthError = GoogleAuthError;
  root.detectGoogleBrowser = detectGoogleBrowser;
  if (typeof module !== "undefined")
    module.exports = { GoogleDriveAuth, GoogleAuthError, TOKEN_KEY, MODE_KEY, BROWSER_KEY, NATIVE_KEY, detectGoogleBrowser };
})(globalThis);
