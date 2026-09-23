// Content script for iSnips extension
// Handles copy event detection and text highlighting

class iSnipsContent {
  constructor() {
    this.highlights = [];
    this.currentLanguage = 'en';
    this.translations = {};
    this.init();
  }

  async init() {

    try {
      // Check if site is blocked
      const isBlocked = await this.checkIfSiteBlocked();

      if (isBlocked) {
        return;
      }

      // Get language setting
      const langResult = await chrome.runtime.sendMessage({
        action: 'getSetting',
        key: 'language',
        defaultValue: 'en'
      });
      this.currentLanguage = langResult.success ? langResult.value : 'zh-CN';
      this.loadTranslations();

      // Listen for messages from background (including captureSnippet command)
      chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

      // Load existing highlights for this page
      await this.loadHighlights();

      // Clean up on page unload
      window.addEventListener('beforeunload', this.cleanup.bind(this));

    } catch (error) {
      console.error('iSnips: Failed to initialize content script:', error);
    }
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
        return false;
      }

      const blockedSites = result.success ? result.value : [];
      return Array.isArray(blockedSites) && blockedSites.includes(domain);
    } catch (error) {
      console.error('Failed to check if site is blocked:', error);
      return false;
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
    const selectedText = this.getSelectedText();

    if (selectedText && selectedText.trim().length > 0) {
      const text = selectedText.trim();
      const selection = window.getSelection();
      const selectedRange = selection && selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
      if (await this.saveClip(text)) {
        this.highlightSelection(text, selectedRange);
      }
    } else {
      const t = this.translations[this.currentLanguage] || this.translations['en'];
      this.showToast(t.no_text_selected || 'No text selected', false);
    }
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
    if (!savedRange && !selection.rangeCount) return;

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
        textEnd: selected.toString().length - trailingWhitespace
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

  async loadHighlights() {
    try {
      const result = await chrome.runtime.sendMessage({
        action: 'getHighlightsForUrl',
        url: window.location.href
      });

      if (result.success && result.highlights) {
        result.highlights.forEach(highlight => {
          this.restoreHighlight(highlight);
        });
      }
    } catch (error) {
      console.error('iSnips: Failed to load highlights:', error);
    }
  }

  restoreHighlight(highlight) {
    // Check if CSS Custom Highlight API is supported
    if (!CSS.highlights) {
      return;
    }

    // Inject highlight styles if not already present
    this.injectHighlightStyles();

    // Rebuild a range from text offsets. Older records have only a quote, so
    // choose the matching occurrence closest to any saved start offset.
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
    if (!nodes.length || !highlight.text) return;

    let start = -1;
    let end = -1;
    if (Number.isInteger(highlight.textStart) && Number.isInteger(highlight.textEnd) &&
        highlight.textStart >= 0 && highlight.textEnd <= text.length &&
        text.slice(highlight.textStart, highlight.textEnd) === highlight.text) {
      start = highlight.textStart;
      end = highlight.textEnd;
    } else {
      let candidate = text.indexOf(highlight.text);
      while (candidate !== -1) {
        if (start === -1 || (Number.isInteger(highlight.textStart) &&
            Math.abs(candidate - highlight.textStart) < Math.abs(start - highlight.textStart))) {
          start = candidate;
        }
        candidate = text.indexOf(highlight.text, candidate + 1);
      }
      end = start + highlight.text.length;
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

  async showPopupCard(text, isPageIndex) {

    // Remove existing popup if any - ensure complete cleanup
    this.removePopupCard();

    try {
      // Create new popup card
      this.popupCard = new PopupCard(text, isPageIndex, this);
      await this.popupCard.init();
      this.popupCard.show();
    } catch (error) {
      console.error('iSnips: Failed to create popup card:', error);
    }
  }

  removePopupCard() {
    if (this.popupCard) {
      this.popupCard.remove();
      this.popupCard = null;
    }
  }

  async saveSnippet(cardData) {
    try {
      const result = await chrome.runtime.sendMessage({
        action: 'saveSnippet',
        data: cardData
      });
      return result;
    } catch (error) {
      console.error('Failed to save snippet:', error);
      return { success: false, error: error.message };
    }
  }

  handleMessage(message, sender, sendResponse) {
    if (message.action === 'captureSnippet') {
      this.handleCapture();
    }
  }

  cleanup() {
    // Cleanup highlights if needed
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
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
