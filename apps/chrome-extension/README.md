# iSnips Chrome Extension

iSnips 2.0 is a Manifest V3 Chrome extension for saving web selections and quick notes. It includes a redesigned side panel, library, and settings page.

## Upgrade compatibility

Version 2.0 keeps the extension key and the iSnipsIndexDB database at schema version 5. Chrome therefore retains the existing extension ID, snippets, highlights, spaces, and settings when the published extension is updated in place. Existing records use the same id, type, text, url, domain, created_at, updated_at, deleted_at, and purged_at fields. The settings keys language, appearance, columnCount, blockedSites, and syncConfig are unchanged.

The import tool also accepts older JSON files with cards, clipText, createdAt, and updatedAt. Import merges by record ID and keeps records not present in the file. Local snapshots restore the saved collection; the portable JSON export includes records, highlights, spaces, and settings. **Portable exports may contain WebDAV credentials.** Keep them private.

## Build and test

    npm test
    npm run build

Load the resulting dist/ directory as an unpacked extension in an isolated Chrome profile for a final browser check. The build starts from a clean dist/ directory so removed source files cannot remain in the package.

The manifest version is 2.0.0. Before uploading an update to the Chrome Web Store, verify that this version is higher than the currently published one and review the store listing and privacy disclosures.

## Notes on data and sync

- Notes, web clips, highlights, spaces, and settings are stored locally. Sync sends snippets only when enabled.
- WebDAV and Google Drive synchronization currently exchange **snippets**. Local snapshots and portable exports include highlights and spaces as well.
- WebDAV requires HTTPS, except for localhost. Existing HTTP WebDAV configurations remain stored but must be changed before syncing.
- The extension uses broad site access for capture and automatic highlight restoration. Users can disable it on specific domains in Settings.
- Local snapshots live in the browser profile. Export a portable JSON file for an independent copy.
