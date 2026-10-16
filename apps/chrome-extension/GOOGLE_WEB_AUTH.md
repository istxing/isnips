# Google Drive: Chrome native + Brave web connection

Updated 2026-10-16. This document distinguishes implementation, Cloud configuration and real-browser acceptance.

## Configuration already completed

- Google Cloud project: `icctwh` (`30003599100`).
- Existing production Chrome client remains `30003599100-psf5aqm5fh7s4n20sp7a9cqiilsf06us.apps.googleusercontent.com`.
- Added Web application client: **iSnips Brave Web**, `30003599100-g9h3a4mlutuej5vnn1t36so3chrv4bgc.apps.googleusercontent.com`.
- Registered redirect: `https://bjemnabegidmkbkdepanilbcidpbnpmj.chromiumapp.org/google`.
- Only the public Client ID is packaged. The project owner saved the one-time client secret separately. Never copy the secret or downloaded credential JSON into this repository or package.

The existing manifest key keeps the production extension ID stable in Chrome and Brave. Other development extension IDs need their own approved callback/client configuration. A build can override only the public web Client ID with `ISNIPS_WEB_OAUTH_CLIENT_ID`; `check:release` validates its shape and reports `googleWebAuthConfigured`.

## User flow

Settings shows one **Connect** action. Chrome continues to use its native `getAuthToken` behavior by default; Brave selects web authorization automatically. Detection checks the Brave API and User-Agent Client Hints brands. The settings page supplies the detected browser to the trusted background handler, which keeps this local browser hint for later worker starts. A generic Chrome user-agent string alone is not treated as proof of Chrome. If no browser signal is available and the native identity API explicitly reports that it is unsupported, authorization falls back to web; cancellation and ordinary Chrome sign-in failures do not open a second authorization flow. Merely opening Settings never requests a token or opens a login window.

Only a connected account shows **Disconnect**; otherwise the page shows **Connect**. Switching sync off or changing the sync service clears this browser's Google token and connection markers without globally revoking the grant. Selecting Google Drive again starts disconnected and can connect normally. The browser hint remains available for selecting the right method, while record data and the automatic-backup preference are preserved. Connection and sync actions temporarily disable conflicting settings controls. Other open settings pages refresh after an auth/configuration change.

The browser-managed flow opens Google's account chooser, requests only `drive.file`, validates a random state and the exact redirect, then caches the short-lived access token in trusted extension session storage. The cache is not exported or included in snapshots, cloud data or content-script settings. Explicit web connection persists only the selected method in local storage.

A valid token is reused. Expiry or a Drive 401 triggers one non-interactive attempt with `prompt=none`; a second 401 stops rather than looping. Timed sync never opens an interactive login window. If the Google web session or consent is unavailable, the user must reconnect. No refresh token is held by this implementation, and it does not promise unattended renewal after loss of the Google session. Browser restart clears the access-token cache, so reusing a Google web session must be tested separately.

Web disconnect clears this browser's web token and stops local sync without revoking authorizations on other devices. Chrome's existing native disconnect is retained. Users can separately revoke the project grant in their Google account. A callback arriving after disconnect/clear is discarded and cannot restore credentials.

Before any new folder/file is created in web mode, a missing accessible sync library requires an explicit choice. Check the selected account, project and old file authorization first. An empty list is not proof that an old library does not exist. Ordinary records/folders and the existing `iSnips/snippets.json` location are unchanged.

## Protocol decision and limits

This no-server compatibility path uses Google's front-end `response_type=token` flow through `launchWebAuthFlow`. It does not put a Web client secret in a public extension or pretend that PKCE removes a confidential client's secret requirements. Google currently strongly discourages new direct implicit-flow implementations and recommends Google Identity Services (GIS). This compatibility implementation must not be described as a validated production Brave integration solely because Cloud configuration and offline tests pass.

A future GIS-hosted bridge or authorization-code service is a separate deployment/security decision. If long-term offline refresh is required, use the appropriate Google-supported client type and an authorization-code/refresh design. Do not add a client secret to extension source to obtain it. Such a service must preserve state binding, authenticate refresh operations and protect long-lived credentials; it must not turn into a general token proxy.

## Required live acceptance

- Completed 2026-10-16: the owner reported successful connection after the requested Brave reload and manual web-authorization check, then clicked Sync Now and confirmed that sync succeeded and records were normal. These are owner-reported real Brave results.
- Verify explicit record changes upload and download across devices, as well as folder operations; the successful manual-sync result does not establish those individual cases.
- Test cancellation, denied scope, switching accounts, expired/revoked access, cleared Google web cookies and a browser restart.
- Confirm scheduled sync never displays a login window; a missing session produces a reconnect status.
- Confirm web disconnect does not revoke the Chrome authorization on another device.
- Rerun native Chrome authorization and sync regressions with the original client.
- Review Google project publishing/test-user status and OAuth consent verification. The Cloud console warns that new configuration can take time to propagate.

The in-app browser was used with the owner's approval to create the Web client. Brave web connection and successful manual Drive sync with normal records were subsequently confirmed by the owner. Silent renewal, restart behavior and cross-device changes remain unverified.

The later unified Connect action and off/on state repair have offline regression coverage; the earlier owner-reported Brave results predate this UI/state repair. The owner reported that the intermittent web-connection error had recovered before this repair was complete, so its cause has not been established.

References:
- https://developer.chrome.com/docs/extensions/reference/api/identity
- https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow
- https://developers.google.com/identity/oauth2/web/guides/overview
- https://developers.google.com/identity/protocols/oauth2/resources/best-practices
