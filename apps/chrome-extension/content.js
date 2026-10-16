// Content script for iSnips extension
// Handles copy event detection and text highlighting

class iSnipsContent {
  constructor() {
    this.highlights = [];
    this.currentLanguage = 'en';
    this.translations = {};
    this.registeredHighlights = new Set();
    this.capturing = false;
    this.preferenceRevision = 0;
    this.clipboardEnabled = false;
    this.clipboardCapture = new ClipboardCapture({
      document, window,
      enabled: () => !this.blocked && this.clipboardEnabled,
      onCapture: data => chrome.runtime.sendMessage({ action: 'captureClipboard', data })
    });
    this.clipboardCapture.start();
    this.init();
  }

  async init() {
    this.loadTranslations();
    // Keep listening on disabled sites so enabling capture takes effect without a reload.
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    await this.refreshPreferences();
  }

  async refreshPreferences() {
    const revision = ++this.preferenceRevision;
    this.clipboardEnabled = false;
    const blocked = await this.checkIfSiteBlocked();
    if (revision !== this.preferenceRevision) return;
    this.blocked = blocked;
    this.clearHighlights();
    if (blocked) return;
    try {
      const capture = await chrome.runtime.sendMessage({ action: 'getSetting', key: 'clipboardCaptureEnabled', defaultValue: false });
      if (revision !== this.preferenceRevision) return;
      this.clipboardEnabled = capture?.success && capture.value === true;
      const result = await chrome.runtime.sendMessage({ action: 'getSetting', key: 'language', defaultValue: 'en' });
      this.currentLanguage = result?.success ? result.value : 'en';
      await this.loadHighlights(revision);
    } catch { /* The next capture retries preferences. */ }
  }

  clearHighlights() {
    for (const name of this.registeredHighlights) CSS.highlights?.delete(name);
    this.registeredHighlights.clear();
    this.highlights = [];
    document.getElementById('isnips-highlight-styles')?.remove();
  }

  async checkIfSiteBlocked() {
    try {
      const domain = this.extractDomain(window.location.href);
      const result = await chrome.runtime.sendMessage({
        action: 'getSetting',
        key: 'blockedSites',
        defaultValue: []
      });

      if (!result || typeof result !== 'object') {
        console.warn('Invalid response from getSetting:', result);
        return true;
      }

      if (!result.success) return true;
      const blockedSites = result.value;
      return Array.isArray(blockedSites) && blockedSites.some(site => typeof site === 'string' && (domain === site.toLowerCase() || domain.endsWith('.' + site.toLowerCase())));
    } catch (error) {
      console.error('Failed to check if site is blocked:', error);
      return true;
    }
  }

  loadTranslations() {
    this.translations = {
      'zh-CN': {
        no_text_selected: '尚未选中网页内容',
        clip_saved: '已记录',
        save_error: '记录片段出错',
        highlight_title: 'iSnips: 点击查看片段详情'
      },
      'en': {
        no_text_selected: 'No snippet selected',
        clip_saved: 'Snippet saved',
        save_error: 'Error saving snippet',
        highlight_title: 'iSnips: Click to view details'
      },
      'ja': {
        no_text_selected: 'スニペットが選択されていません',
        clip_saved: 'スニペットを保存しました',
        save_error: 'スニペットの保存に失敗しました',
        highlight_title: 'iSnips: クリックして詳細を表示'
      }
    };
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  async handleCapture() {
    if (this.capturing) return;
    this.capturing = true;
    const selectedText = this.getSelectedText();
    const selection = window.getSelection();
    const selectedRange = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    try {
      if (await this.checkIfSiteBlocked()) { this.clearHighlights(); return; }
      if (selectedText) {
        if (await this.saveClip(selectedText)) this.highlightSelection(selectedText, selectedRange);
      } else {
        const t = this.translations[this.currentLanguage] || this.translations.en;
        this.showToast(t.no_text_selected, false);
      }
    } finally { this.capturing = false; }
  }

  getSelectedText() {
    const selection = window.getSelection();
    return selection ? selection.toString().trim() : '';
  }

  async saveClip(text) {
    try {
      const cardData = {
        type: 'web',
        text,
        url: window.location.href,
        domain: this.extractDomain(window.location.href),
        title: document.title,
        created_at: Date.now(),
        updated_at: Date.now(),
        deleted_at: null,
        purged_at: null
      };

      const result = await chrome.runtime.sendMessage({
        action: 'saveSnippet',
        data: cardData
      });

      const t = this.translations[this.currentLanguage] || this.translations['en'];
      if (result.success) {
        this.showToast(t.clip_saved || 'Snippet saved', true);
        return true;
      } else {
        this.showToast(t.save_error || 'Failed to save snippet', false);
        return false;
      }
    } catch (error) {
      console.error('iSnips: Failed to save clip:', error);
      const t = this.translations[this.currentLanguage] || this.translations['en'];
      this.showToast(t.save_error || 'Failed to save snippet', false);
      return false;
    }
  }

  highlightSelection(text, savedRange = null) {
    const selection = window.getSelection();
    if (!savedRange && !selection?.rangeCount) return;

    // Check if CSS Custom Highlight API is supported
    if (!CSS.highlights) {
      selection.removeAllRanges();
      return;
    }

    // Clone the range to avoid modifying the original
    const range = savedRange || selection.getRangeAt(0).cloneRange();
    const highlightId = crypto.randomUUID();
    const anchor = this.getTextAnchor(range);

    // Inject highlight styles if not already present
    this.injectHighlightStyles();

    // Add style rule for this highlight
    this.addHighlightStyleRule(highlightId);

    // Create a new Highlight object and register it
    const highlight = new Highlight(range);
    CSS.highlights.set(`isnips-highlight-${highlightId}`, highlight);
    this.registeredHighlights.add(`isnips-highlight-${highlightId}`);

    // Store highlight info for persistence (range info for potential restoration)
    this.highlights.push({
      id: highlightId,
      text: text,
      url: window.location.href,
      timestamp: Date.now(),
      ...anchor
    });

    // Clear selection
    selection.removeAllRanges();

    // Store highlight for persistence
    this.storeHighlight({
      id: highlightId,
      text: text,
      url: window.location.href,
      timestamp: Date.now(),
      ...anchor
    });
  }

  getTextAnchor(range) {
    try {
      const prefix = document.createRange();
      prefix.setStart(document.body, 0);
      prefix.setEnd(range.startContainer, range.startOffset);
      const selected = document.createRange();
      selected.setStart(document.body, 0);
      selected.setEnd(range.endContainer, range.endOffset);
      const rawText = range.toString();
      const leadingWhitespace = rawText.length - rawText.trimStart().length;
      const trailingWhitespace = rawText.length - rawText.trimEnd().length;
      return {
        textStart: prefix.toString().length + leadingWhitespace,
        textEnd: selected.toString().length - trailingWhitespace,
        // Selection.toString() adds layout newlines between blocks, the DOM text does not;
        // keep the raw DOM text so restoreHighlight can compare like with like.
        quote: rawText.trim()
      };
    } catch {
      return {};
    }
  }

  injectHighlightStyles() {
    if (document.getElementById('isnips-highlight-styles')) return;

    const style = document.createElement('style');
    style.id = 'isnips-highlight-styles';
    document.head.appendChild(style);
  }

  addHighlightStyleRule(highlightId) {
    let style = document.getElementById('isnips-highlight-styles');
    if (!style) {
      this.injectHighlightStyles();
      style = document.getElementById('isnips-highlight-styles');
    }

    // Add a rule for this specific highlight
    const ruleName = `isnips-highlight-${highlightId}`;
    const rule = `::highlight(${ruleName}) { background-color: #ffeb3b; color: inherit; }`;

    // Avoid duplicate rules
    if (!style.textContent.includes(ruleName)) {
      style.textContent += rule + '\n';
    }
  }

  async loadHighlights(revision = this.preferenceRevision) {
    try {
      const result = await chrome.runtime.sendMessage({
        action: 'getHighlightsForUrl',
        url: window.location.href
      });

      if (revision !== this.preferenceRevision || this.blocked) return;
      if (result && result.success && result.highlights && result.highlights.length) {
        // Walk the document once for all highlights instead of once per highlight
        const index = this.buildTextIndex();
        result.highlights.forEach(highlight => {
          this.restoreHighlight(highlight, index);
        });
      }
    } catch (error) {
      console.error('iSnips: Failed to load highlights:', error);
    }
  }

  buildTextIndex() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const nodes = [];
    let text = '';
    let node;
    while ((node = walker.nextNode())) {
      nodes.push({ node, start: text.length, end: text.length + node.textContent.length });
      text += node.textContent;
    }
    return { nodes, text };
  }

  restoreHighlight(highlight, index = this.buildTextIndex()) {
    // Check if CSS Custom Highlight API is supported
    if (!CSS.highlights || typeof highlight.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(highlight.id)) {
      return;
    }

    // Inject highlight styles if not already present
    this.injectHighlightStyles();

    // Rebuild a range from text offsets. Older records have only a quote, so
    // choose the matching occurrence closest to any saved start offset.
    const { nodes, text } = index;
    // Prefer the raw DOM quote: highlight.text may contain layout newlines from Selection.toString()
    const needle = highlight.quote || highlight.text;
    if (!nodes.length || !needle) return;

    let start = -1;
    let end = -1;
    if (Number.isInteger(highlight.textStart) && Number.isInteger(highlight.textEnd) &&
        highlight.textStart >= 0 && highlight.textEnd <= text.length &&
        text.slice(highlight.textStart, highlight.textEnd) === needle) {
      start = highlight.textStart;
      end = highlight.textEnd;
    } else {
      let candidate = text.indexOf(needle);
      while (candidate !== -1) {
        if (start === -1 || (Number.isInteger(highlight.textStart) &&
            Math.abs(candidate - highlight.textStart) < Math.abs(start - highlight.textStart))) {
          start = candidate;
        }
        candidate = text.indexOf(needle, candidate + 1);
      }
      end = start + needle.length;
    }
    if (start < 0) return;
    const first = nodes.find(part => part.end > start);
    const last = nodes.find(part => part.end >= end);
    if (!first || !last) return;
    const range = document.createRange();
    range.setStart(first.node, start - first.start);
    range.setEnd(last.node, end - last.start);
    this.addHighlightStyleRule(highlight.id);
    CSS.highlights.set(`isnips-highlight-${highlight.id}`, new Highlight(range));
    this.registeredHighlights.add(`isnips-highlight-${highlight.id}`);
  }

  async storeHighlight(highlight) {
    try {
      await chrome.runtime.sendMessage({
        action: 'storeHighlight',
        highlight: highlight
      });
    } catch (error) {
      console.error('iSnips: Failed to store highlight:', error);
    }
  }

  showToast(message, isSuccess) {
    const toast = document.createElement('div');
    toast.className = `isnips-toast ${isSuccess ? 'success' : 'error'}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${isSuccess ? '#4CAF50' : '#f44336'};
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      animation: isnips-toast-slide-in 0.3s ease-out;
    `;

    // Add keyframes if not exist
    if (!document.getElementById('isnips-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'isnips-toast-styles';
      style.textContent = `
        @keyframes isnips-toast-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  handleMessage(message, sender, sendResponse) {
    if (sender.id !== chrome.runtime.id) return;
    if (message.action === 'captureSnippet') {
      void this.handleCapture();
    } else if (message.action === 'capturePreferencesChanged') {
      void this.refreshPreferences();
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new iSnipsContent();
  });
} else {
  new iSnipsContent();
}
