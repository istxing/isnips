# iSnips

> **A minimalist and efficient browser information collection tool.**

iSnips is a browser extension designed for rapid information gathering. It supports quick text captures, snippet saving, and seamless cloud synchronization via Google Drive and WebDAV, ensuring your data is always available across devices.

---

## 📂 Repository Structure

To maintain a clean project structure and efficient hosting for GitHub Pages, this repository uses a dual-branch strategy:

*   **`source` (Current Branch)**: Contains the full source code for the extension. This is where active development, feature updates, and bug fixes happen.
*   **`master`**: Dedicated to hosting the [iSnips Landing Page](https://istxing.github.io/isnips/). It contains only static HTML files and domain verification assets required for the live site.

## 🚀 Development & Building

Follow these steps if you wish to build the extension from source:

### 1. Install Dependencies
This project uses [Bun](https://bun.sh/) as the package manager (though npm/yarn works as well):
```bash
bun install
```

### 2. Build the Extension
Run the build script to generate the production-ready directory:
```bash
bun run build
```
The compiled assets will be generated in the `dist/` directory.

### 3. Load into Browser
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable "Developer mode" in the top right corner.
3. Click "Load unpacked" and select the generated `dist/` folder.

## 🔐 Permissions Overview

*   **`storage`**: Used for local data persistence and settings.
*   **`identity`**: Required for secure OAuth2 authentication with Google Drive sync.
*   **`activeTab` & `tabs`**: Allows capturing selected text from the active website.
*   **`contextMenus`**: Provides right-click capture functionality.

## ☕ Support

If you find iSnips helpful, consider supporting its development!

<a href="https://buymeacoffee.com/istxingv" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## 🌐 Useful Links

*   **Official Homepage**: [https://istxing.github.io/isnips/](https://istxing.github.io/isnips/)
*   **Chrome Web Store**: [Visit Store](https://chromewebstore.google.com/detail/isnips/bjemnabegidmkbkdepanilbcidpbnpmj)
*   **Privacy Policy**: [Read Privacy Policy](https://istxing.github.io/isnips/privacy.html)

---
*Created with ❤️ by istxing & Antigravity AI*
