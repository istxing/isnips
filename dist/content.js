// Content script for ClipIndex extension
// Handles copy event detection and text highlighting

class ClipIndexContent {
  constructor() {
    this.highlights = [];
    this.init();
  }

  async init() {
    console.log('ClipIndex: Content script initializing...');

    try {
      // Check if site is blocked
      const isBlocked = await this.checkIfSiteBlocked();
      console.log('ClipIndex: Site blocked check result:', isBlocked);

      if (isBlocked) {
        console.log('ClipIndex: Site is blocked, not initializing');
        return;
      }

      // Listen for messages from background (including captureSnippet command)
      chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

      // Load existing highlights for this page
      await this.loadHighlights();

      // Clean up on page unload
      window.addEventListener('beforeunload', this.cleanup.bind(this));

      console.log('ClipIndex: Content script initialization complete');
    } catch (error) {
      console.error('ClipIndex: Failed to initialize content script:', error);
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

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  async handleCapture() {
    console.log('ClipIndex: Capture command detected');
    const selectedText = this.getSelectedText();

    if (selectedText && selectedText.trim().length > 0) {
      console.log('ClipIndex: Selected text found, saving snippet');
      const text = selectedText.trim().substring(0, 144);
      await this.saveClip(text);
      this.highlightSelection(text);
    } else {
      console.log('ClipIndex: No text selected, ignoring');
      this.showToast('请先选中文字', false);
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

      if (result.success) {
        console.log('ClipIndex: Clip saved successfully');
        this.showToast('已保存', true);
      } else {
        console.log('ClipIndex: Failed to save clip');
        this.showToast('保存失败', false);
      }
    } catch (error) {
      console.error('ClipIndex: Failed to save clip:', error);
      this.showToast('保存失败', false);
    }
  }

  highlightSelection(text) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const highlightElement = document.createElement('span');
    highlightElement.className = 'clipindex-highlight';
    highlightElement.textContent = text;
    highlightElement.style.backgroundColor = '#ffeb3b';
    highlightElement.style.borderRadius = '2px';
    highlightElement.style.padding = '2px 4px';
    highlightElement.style.cursor = 'pointer';
    highlightElement.title = 'ClipIndex: 点击跳转到详情';

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
      console.error('ClipIndex: Failed to load highlights:', error);
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
          highlightElement.className = 'clipindex-highlight';
          highlightElement.textContent = highlight.text;
          highlightElement.style.backgroundColor = '#ffeb3b';
          highlightElement.style.borderRadius = '2px';
          highlightElement.style.padding = '2px 4px';
          highlightElement.style.cursor = 'pointer';
          highlightElement.title = 'ClipIndex: 点击跳转到详情';
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
      console.error('ClipIndex: Failed to store highlight:', error);
    }
  }

  showToast(message, isSuccess) {
    const toast = document.createElement('div');
    toast.className = `clipindex-toast ${isSuccess ? 'success' : 'error'}`;
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
      animation: clipindex-toast-slide-in 0.3s ease-out;
    `;

    // Add keyframes if not exist
    if (!document.getElementById('clipindex-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'clipindex-toast-styles';
      style.textContent = `
        @keyframes clipindex-toast-slide-in {
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
    console.log('ClipIndex: showPopupCard called with text length:', text.length, 'isPageIndex:', isPageIndex);

    // Remove existing popup if any - ensure complete cleanup
    this.removePopupCard();

    try {
      console.log('ClipIndex: Creating new PopupCard...');
      // Create new popup card
      this.popupCard = new PopupCard(text, isPageIndex, this);
      console.log('ClipIndex: PopupCard created, calling init...');
      await this.popupCard.init();
      console.log('ClipIndex: PopupCard init complete, calling show...');
      this.popupCard.show();
      console.log('ClipIndex: PopupCard show called');
    } catch (error) {
      console.error('ClipIndex: Failed to create popup card:', error);
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
    new ClipIndexContent();
  });
} else {
  new ClipIndexContent();
}
