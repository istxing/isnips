# Dev OAuth Setup

Use this path when Google Drive sync must be tested in a local unpacked build without reusing the Chrome Web Store extension ID.

## Why

- Reusing the Chrome Web Store ID in a local unpacked build can be blocked by Chrome.
- Google Sign-In can also reject automated test browsers.
- The reliable local path is a separate dev extension ID with a matching Chrome Extension OAuth client.

Chrome's extension docs note that when you use `oauth2`, you should also set a stable manifest `key` so the extension ID stays consistent:
https://developer.chrome.com/docs/extensions/reference/manifest/oauth2

## 1. Generate a dev extension key

Generate a private key once and keep it outside the repo:

```bash
mkdir -p ~/.config/isnips
openssl genrsa -out ~/.config/isnips/dev-extension.pem 2048
```

## 2. Derive the manifest key and dev extension ID

```bash
node scripts/dev-oauth.js --pem ~/.config/isnips/dev-extension.pem
```

Example output:

```json
{
  "manifestKey": "BASE64_PUBLIC_KEY",
  "extensionId": "abcdefghijklmnopabcdefghijklmnop"
}
```

You can also print a single field:

```bash
node scripts/dev-oauth.js --pem ~/.config/isnips/dev-extension.pem --field manifestKey
node scripts/dev-oauth.js --pem ~/.config/isnips/dev-extension.pem --field extensionId
```

## 3. Create the OAuth client in Google Cloud Console

Create a new **Chrome Extension** OAuth client and set its application ID to the `extensionId` from step 2.

Use the resulting client ID as the dev `oauth2.client_id`.

## 4. Build a dev OAuth version

Build `dist/` with the dev manifest key and dev client ID:

```bash
ISNIPS_MANIFEST_KEY="$(node scripts/dev-oauth.js --pem ~/.config/isnips/dev-extension.pem --field manifestKey)" \
ISNIPS_OAUTH_CLIENT_ID="YOUR_DEV_EXTENSION_CLIENT_ID.apps.googleusercontent.com" \
node build.js
```

Optional: add a visible suffix to the extension name while testing:

```bash
ISNIPS_NAME_SUFFIX="(Dev)" \
ISNIPS_MANIFEST_KEY="$(node scripts/dev-oauth.js --pem ~/.config/isnips/dev-extension.pem --field manifestKey)" \
ISNIPS_OAUTH_CLIENT_ID="YOUR_DEV_EXTENSION_CLIENT_ID.apps.googleusercontent.com" \
node build.js
```

## 5. Load and test in normal Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load unpacked `dist/`.
4. Open iSnips settings.
5. Sign in to Google Drive manually.

Avoid logging in through an automated browser session. Google may reject that flow with "This browser or app may not be secure."
