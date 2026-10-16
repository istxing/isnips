# iSnips Chrome Extension

iSnips 2.0.0 saves web selections and quick notes in a local library. Requires Chrome 116+. The interface supports English, Simplified Chinese and Japanese, with light and dark themes.

## Use

- Select text and use the context menu or Alt+C to clip it. Alt+S opens the side panel; shortcuts can be changed in Chrome.
- The compact side-panel composer stays at the top; only the list scrolls. Switch between **Recent** and **Clipboard**, each showing up to 10 newest entries. Recent shows saved notes and web clips; Clipboard shows only temporary history. Saving a clipboard entry as a note moves it into Recent. **View all** opens the matching library category.
- Write a quick note in the panel. Ctrl/⌘+Enter saves notes and edits.
- The interface uses `#e9eeea` as its main color. Library columns default to 5, with preferences from 3 to 7; narrow windows adapt automatically. Legacy two-column preferences display as three.
- The library groups records by their local creation date, with compact cards that grow to fit their preview. Trash uses deletion dates. Editing a record keeps it in its original date group.
- Library cards show at most five text lines and lift slightly on hover; side-panel cards use the original compact two-line preview and gentle zoom. Both reveal floating actions, with motion disabled when reduced motion is preferred.
- Click the text, date or blank area of a record to read its full text. Source links and action buttons keep their own actions. Click outside the reader or use its close button to dismiss it. The reader places the source link at the bottom left; clipboard readers offer **Save as note** after **Copy**. Copy, edit and trash controls appear on hover or keyboard focus; touch devices show them below the record.
- Moving a record to Trash offers Undo. Emptying Trash and clearing/restoring data require confirmation.
- The side panel keeps support, item count and shortcut in a compact footer. The existing View all action stays beside the list tabs, with another View all action after the last card inside the scrolling list; both open the corresponding library category. It has a close button in its header; it saves the quick-note draft before closing. Quick-note drafts remain for the browser session. Unfinished editor changes prompt before closing.

## Library browsing and folders

The library reads 200 previews per page from an IndexedDB cursor; it replaces the previous page instead of growing the DOM. Each preview contains at most 1,000 text code units. Opening, copying or editing a record requests its full body, so previews never overwrite the stored text. The side panel uses the same endpoint for its 10 recent previews. Clipboard history remains bounded at 99 entries and also uses previews in list messages.

The toolbar switches between Day, Week, Month and All and remembers the last selection. All defaults to masonry; grouped views retain the original date headings and card grids. Grouping uses local calendar dates (Monday–Sunday weeks), or deletion dates in Trash, and applies only to the current page. A period can continue on the next page. Changing the view does not fetch the full library or reset the current page.

Search and counts currently scan records one at a time without collecting all bodies. A pending query is canceled when a newer query for that window starts; search is debounced. This bounds retained browsing data, but scan time still depends on library size. Export, sync and full backups remain separate bulk operations. No real-browser heap benchmark has been performed.

Use **+** beside **Folders** to create a folder. Its menu supports rename and delete. A record’s folder icon moves it directly; its editor also has a folder selector. New notes created inside a folder are filed there. Deleting a folder returns its active and trashed records to Unfiled and preserves their text and deletion state. Folders use the existing `spaces` / `spaceId` data, with no database upgrade. Folder names, ordering, record assignments and folder deletion markers are included in your configured WebDAV or Google Drive synchronization, as well as JSON exports and local backup snapshots. Renames keep the newer folder revision; deleting a folder keeps a tombstone so offline renames and old files cannot resurrect it. Records returned to Unfiled retain their content revision, allowing offline text edits to merge without being discarded by a folder deletion.

## Clipboard history

First use and upgrades show a prominent notice with **Agree and enable** and **Not now**. Capture stays off until an affirmative choice; dismissal never gives consent. Agreeing enables **Auto-save copies**, which can be paused in the library’s **Clipboard** category. An explicitly paused preference is retained. The versioned consent choice is local and is not imported, exported or synchronized. Normal copy/cut gestures on web pages create local entries only after consent. The most recent 99 unique texts are retained; repeated text moves to the front. Copied text appears only in the side panel’s Clipboard list until saved as a note. Each clipboard card has a **Save as note** icon in its upper-right actions that saves a regular note before removing its temporary history entry. Pause, delete or clear history from the same category.

History and its capture preference are excluded from exports, backup snapshots and synchronization. Converted notes follow the regular record rules. Capture respects disabled domains, skips password inputs and incognito tabs, and never reads the system clipboard or other applications. Chrome-protected pages, embedded frames and website copy buttons that bypass native copy events are unsupported. Existing open pages need an extension reload/page refresh after installing this content-script change.

## Compatibility

The published extension key and ID remain unchanged. `iSnipsIndexDB` stays at schema version 5, preserving existing snippets, highlights, spaces and settings during an in-place upgrade. Legacy `cards`, `clipText`, `createdAt` and `updatedAt` backup fields remain supported.

Import merges by ID and keeps newer data, including deletion state. Equal timestamps retain the local copy. It applies only supported display preferences; it never enables a sync service or imports credentials. Snapshots restore the saved records, highlights and spaces, leaving current connection settings intact. Always export before an upgrade or a destructive restore.

## Build and release

Requires Node.js 22.12+; packaging also uses `zip` and `unzip`.

```sh
npm ci
npm test
npm run build
npm run check:release
npm run release
```

The build writes a clean `dist/`. Release generates `release/isnips-2.0.0.zip`, SHA-256 and a package report, rejecting development identity overrides. Tests use mocked network APIs, in-memory IndexedDB and offline DOM simulation; they do not launch Chrome or verify real cloud accounts.

See [RELEASE.md](RELEASE.md) for release notes, store copy, permission explanations and the remaining manual acceptance steps. A built ZIP does not by itself confirm store approval or browser acceptance.

## Data and sync

Records are local until you enable synchronization. WebDAV and Google Drive exchange snippets and folders, including deletion markers and record assignments. Highlights are included in exports and local snapshots but do not sync; preferences and temporary clipboard history also stay local. New exports and snapshots omit sync configuration and credentials. The backup payload versions (`3.2.0` for sync, `3.1.0` for exports) describe existing file formats; the extension version is `2.0.0`.

Sync accepts legacy record-only files without clearing local folders. Update every device to this build for folder synchronization; older clients can omit folder fields when rewriting the shared file. Folder and record merges commit in one local transaction, and folder payloads exclude unrelated imported properties.

WebDAV requires a final HTTPS endpoint with no embedded credentials, query or fragment. HTTP is allowed for localhost only. Redirects are rejected, requests time out after 20 seconds, and ETags are used when available. Without server validators, remote concurrent edits cannot be fully protected. Google Drive uses an ordinary `iSnips` folder with `drive.file` access. The Connect action selects Chrome's native identity authorization or Brave's browser-managed web connection automatically. Turning sync off clears the local Google connection. See [Google web authorization](GOOGLE_WEB_AUTH.md) for configuration, renewal limits and real-browser acceptance.

Blocked domains and their subdomains immediately stop clipping and highlight restoration on open pages. Content scripts cannot read sync settings or another page’s highlights. Clearing local data stops local sync and removes local copies; it does not delete cloud files or exported backups.

The packaged [privacy policy](privacy.html) is also maintained in the repository root and Web public directory. Deploy that public policy separately before submitting a store update.

## Store artwork

The editable icon master is `design/icon-master.svg`. Runtime PNG icons are rendered at each target size from its curves; the former raster extractor is archived. `npm run assets:render` regenerates icons and store artwork in an environment with `sharp` (or with `ISNIPS_SHARP_MODULE` set to its entry file).

[Store artwork](store-assets/README.md) includes the store icon and promotional tiles. Actual browser screenshots remain pending; the artwork archive does not replace them.
