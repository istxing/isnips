# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

ClipIndex is a Chrome browser extension (Manifest V3) for intelligent web text clipping and management. It automatically saves selected text when users copy (Ctrl+C), highlights saved text on pages, and provides a library view with multi-language support and waterfall layout.

**Tech Stack**: React 18 + TypeScript + Tailwind CSS, built with esbuild and Bun

## Build and Development Commands

### Installation
```bash
bun install
```

### Development Build (with watch mode)
```bash
node build.js --watch
```

### Production Build
```bash
node build.js
```

The build process:
1. Uses esbuild to bundle React/TypeScript from `src/pages/index.ts` → `dist/library.js`
2. Copies `library.html` and `library.css` to `dist/`
3. Output goes to `dist/` directory which is loaded as an unpacked extension

### Loading Extension in Chrome
1. Build the project: `node build.js`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked extension"
5. Select the `dist/` directory

### Type Checking
```bash
npx tsc --noEmit
```

Note: There are no test files, linting, or formatting scripts currently configured.

## Architecture

### Chrome Extension Structure

**Manifest V3 Architecture** with four main components:

1. **Background Service Worker** (`background.js`)
   - Manages IndexedDB database (`ClipIndexDB`) with three object stores:
     - `indexCards`: Stores clipped text with metadata (url, domain, title, timestamps)
     - `highlights`: Stores highlight positions for page restoration
     - `settings`: Stores user preferences (language, blockedSites)
   - Handles all message routing between content scripts, popup, and library
   - Key actions: `saveIndexCard`, `getIndexCards`, `setSetting`, `getSetting`

2. **Content Script** (`content.js`)
   - Injected into all web pages via `manifest.json`
   - Listens for copy events and automatically saves selected text (truncated to 144 chars)
   - Highlights selected text on the page with yellow background
   - Persists highlights across page reloads
   - Respects blocked sites list from settings

3. **Popup** (`popup.html` + `popup.js`)
   - Browser action popup showing quick stats and recent clips
   - Displays total clip count and today's count
   - Shows 5 most recent items
   - Quick access to library and settings

4. **Settings Page** (`settings.html` + `settings.js`)
   - Options page for extension configuration
   - Language selection (zh-CN, en, ja)
   - Block/unblock sites
   - Data export/import as JSON
   - Clear all data functionality

5. **Library Page** (`library.html` + React app in `src/`)
   - Full-featured clip management interface
   - Built with React 18 + TypeScript
   - Waterfall layout (3 columns) grouped by date (Today, Yesterday, This Week, etc.)
   - Search functionality
   - Click cards to navigate to original URL

### TypeScript/React Source Structure

Located in `src/`:

- **`types/index.ts`**: Core TypeScript interfaces
  - `ClipCard`: Clip data structure
  - `Highlight`: Highlight metadata
  - `Settings`: User settings
  - `MessageRequest/Response`: Chrome messaging types

- **`pages/Library.tsx`**: Main library component
  - Manages cards state and filtering
  - Groups cards by date (today/yesterday/this week/older)
  - Handles language switching and search
  - Implements waterfall grid layout

- **`components/`**: React components
  - `ClipCard.tsx`: Individual card display
  - `SearchBar.tsx`: Search input
  - `EmptyState.tsx`: No clips placeholder

- **`hooks/`**: Custom React hooks
  - `useChromeMessaging.ts`: Wrapper for `chrome.runtime.sendMessage`
  - `useI18n.ts`: Internationalization with React Context
    - Manages language state (zh-CN, en, ja)
    - Listens to `chrome.storage.onChanged` for real-time language updates
    - Provides `t()` function for translations

### Data Flow

1. User selects text on webpage → Content script detects copy event
2. Content script sends `saveIndexCard` message → Background worker
3. Background worker saves to IndexedDB and returns success
4. Content script highlights text on page and stores highlight info
5. Library page queries cards via `getIndexCards` message
6. Cards are filtered, grouped by date, and displayed in waterfall layout

### Key Design Patterns

- **Chrome Extension Messaging**: All components communicate through `chrome.runtime.sendMessage` with standardized message format (`action`, `data`, response with `success` boolean)
- **IndexedDB for Storage**: Used instead of chrome.storage.local for better performance with large datasets
- **React without JSX Runtime**: Custom bundler (`bundler.js`) strips ES6 imports/exports and creates a minimal React runtime
- **I18n Context Pattern**: Centralized translations with React Context, synced across all extension pages via chrome.storage events

## Important Implementation Notes

### Character Limit
All clipped text is automatically truncated to **144 characters** in `content.js` line 79-81. This is a hard limit applied before saving.

### Blocked Sites
Sites can be blocked from the settings page. Content script checks `blockedSites` setting on initialization and will not attach copy listener if site is blocked.

### Highlight Persistence
Highlights are stored separately from clips and restored on page load. The restoration logic in `content.js` uses `TreeWalker` to find text nodes matching saved highlights.

### Build System
The project uses a custom build setup (not a typical bundler):
- `build.js`: Runs esbuild for React/TypeScript compilation
- `bundler.js`: Legacy custom bundler (appears unused in current build flow)
- All output goes to `dist/` directory

### Language Switching
Language changes propagate in real-time across all extension pages using `chrome.storage.onChanged` listeners. The setting is stored in both IndexedDB (via background worker) and `chrome.storage.local` for synchronization.

## Common Workflows

### Adding a New Translation Key
1. Add key to all three language objects in `src/hooks/useI18n.ts` (zh-CN, en, ja)
2. Use in component: `const { t } = useI18n(); const text = t('your_key', 'fallback')`

### Modifying Card Schema
1. Update `ClipCard` interface in `src/types/index.ts`
2. Update IndexedDB schema version in `background.js` constructor (line 8)
3. Add migration logic in `onupgradeneeded` handler (line 32-58)

### Adding a New Message Action
1. Add action handler in `background.js` message listener
2. Update `MessageRequest` type in `src/types/index.ts` if needed
3. Call from any component using `useChromeMessaging` hook

### Debugging
- Background worker: `chrome://extensions/` → Inspect views: service worker
- Content script: Regular devtools on webpage
- Library page: Open as tab, use regular devtools
- Check console logs prefixed with "ClipIndex:"
