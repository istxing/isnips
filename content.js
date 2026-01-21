// Content script for iSnips extension
// Handles copy event detection and text highlighting

class iSnipsContent {
  constructor() {
    this.highlights = [];
    this.currentLanguage = 'zh-CN';
    this.translations = {};
    this.init();
  }

  async init() {
    console.log('iSnips: Content script initializing...');

    try {
      // Check if site is blocked
      const isBlocked = await this.checkIfSiteBlocked();
      console.log('iSnips: Site blocked check result:', isBlocked);

      if (isBlocked) {
        console.log('iSnips: Site is blocked, not initializing');
        return;
      }

      // Get language setting
      const langResult = await chrome.runtime.sendMessage({
        action: 'getSetting',
        key: 'language',
        defaultValue: 'zh-CN'
      });
      this.currentLanguage = langResult.success ? langResult.value : 'zh-CN';
      this.loadTranslations();

      // Listen for messages from background (including captureSnippet command)
      chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

      // Load existing highlights for this page
      await this.loadHighlights();

      // Clean up on page unload
      window.addEventListener('beforeunload', this.cleanup.bind(this));

      console.log('iSnips: Content script initialization complete');
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
        no_text_selected: '尚未选中任何思维片段',
        clip_saved: '已记录思维瞬间',
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
    console.log('iSnips: Capture command detected');
    const selectedText = this.getSelectedText();

    if (selectedText && selectedText.trim().length > 0) {
      console.log('iSnips: Selected text found, saving snippet');
      const text = selectedText.trim().substring(0, 144);
      await this.saveClip(text);
      this.highlightSelection(text);
    } else {
      console.log('iSnips: No text selected, ignoring');
      const t = this.translations[this.currentLanguage] || this.translations['zh-CN'];
      this.showToast(t.no_text_selected || '尚未选中任何思维片段', false);
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
        text: text.slice(0, 144),
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

      const t = this.translations[this.currentLanguage] || this.translations['zh-CN'];
      if (result.success) {
        console.log('iSnips: Clip saved successfully');
        this.showToast(t.clip_saved || '已记录思维瞬间', true);
      } else {
        console.log('iSnips: Failed to save clip');
        this.showToast(t.save_error || '记录片段出错', false);
      }
    } catch (error) {
      console.error('iSnips: Failed to save clip:', error);
      const t = this.translations[this.currentLanguage] || this.translations['zh-CN'];
      this.showToast(t.save_error || '记录片段出错', false);
    }
  }

  highlightSelection(text) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const highlightElement = document.createElement('span');
    highlightElement.className = 'isnips-highlight';
    highlightElement.textContent = text;
    highlightElement.style.backgroundColor = '#ffeb3b';
    highlightElement.style.borderRadius = '2px';
    highlightElement.style.padding = '2px 4px';
    highlightElement.style.cursor = 'pointer';
    const t = this.translations[this.currentLanguage] || this.translations['zh-CN'];
    highlightElement.title = t.highlight_title || 'iSnips: 点击查看片段详情';

    // Store highlight info for persistence
    const highlightId = Date.now().toString();
    highlightElement.dataset.highlightId = highlightId;

    highlightElement.addEventListener('click', () => {
      // Open library with this clip highlighted
      chrome.runtime.sendMessage({
        action: 'openLibraryWithHighlight',
        highlightId: highlightId,
        url: window.location.href
      });
    });

    // Replace the selected text with highlighted version
    range.deleteContents();
    range.insertNode(highlightElement);

    // Clear selection
    selection.removeAllRanges();

    // Store highlight for persistence
    this.storeHighlight({
      id: highlightId,
      text: text,
      url: window.location.href,
      timestamp: Date.now()
    });
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
    // Find text in document and highlight it
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.includes(highlight.text)) {
        const index = node.textContent.indexOf(highlight.text);
        if (index !== -1) {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + highlight.text.length);

          const highlightElement = document.createElement('span');
          highlightElement.className = 'isnips-highlight';
          highlightElement.textContent = highlight.text;
          highlightElement.style.backgroundColor = '#ffeb3b';
          highlightElement.style.borderRadius = '2px';
          highlightElement.style.padding = '2px 4px';
          highlightElement.style.cursor = 'pointer';
          const t = this.translations[this.currentLanguage] || this.translations['zh-CN'];
          highlightElement.title = t.highlight_title || 'iSnips: 点击查看片段详情';
          highlightElement.dataset.highlightId = highlight.id;

          highlightElement.addEventListener('click', () => {
            chrome.runtime.sendMessage({
              action: 'openLibraryWithHighlight',
              highlightId: highlight.id,
              url: window.location.href
            });
          });

          range.deleteContents();
          range.insertNode(highlightElement);
          break; // Only highlight first occurrence
        }
      }
    }
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
    console.log('iSnips: showPopupCard called with text length:', text.length, 'isPageIndex:', isPageIndex);

    // Remove existing popup if any - ensure complete cleanup
    this.removePopupCard();

    try {
      console.log('iSnips: Creating new PopupCard...');
      // Create new popup card
      this.popupCard = new PopupCard(text, isPageIndex, this);
      console.log('iSnips: PopupCard created, calling init...');
      await this.popupCard.init();
      console.log('iSnips: PopupCard init complete, calling show...');
      this.popupCard.show();
      console.log('iSnips: PopupCard show called');
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
