// Popup script for iSnippets extension
// Handles the toolbar popup UI

class iSnippetsPopup {
  constructor() {
    this.currentLanguage = 'zh-CN';
    this.translations = {};
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadLanguage();
    this.loadData();
    this.loadShortcutHint();
  }

  bindEvents() {
    document.getElementById('openLibraryBtn').addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('library.html') });
    });

    document.getElementById('openSettingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    const closePanelBtn = document.getElementById('closePanelBtn');
    if (closePanelBtn) {
      closePanelBtn.addEventListener('click', () => {
        window.close();
      });
    }

    // Note functionality
    const noteTextarea = document.getElementById('noteTextarea');
    const charCount = document.getElementById('charCount');
    const includeLinkToggle = document.getElementById('includeLinkToggle');

    if (noteTextarea && charCount) {
      noteTextarea.addEventListener('input', () => {
        const length = noteTextarea.value.length;
        charCount.textContent = length;
        charCount.style.color = length >= 144 ? '#ef4444' : '#94a3b8';
      });
    }

    if (includeLinkToggle) {
      includeLinkToggle.addEventListener('change', (e) => {
        chrome.runtime.sendMessage({
          action: 'setSetting',
          key: 'includeLinkInNote',
          value: e.target.checked
        });
      });

      // Load initial state
      chrome.runtime.sendMessage({
        action: 'getSetting',
        key: 'includeLinkInNote',
        defaultValue: true
      }).then(result => {
        if (result.success) {
          includeLinkToggle.checked = result.value;
        }
      });
    }

    document.getElementById('saveNoteBtn').addEventListener('click', () => {
      this.saveNote();
    });

    document.getElementById('clearNoteBtn').addEventListener('click', () => {
      this.clearNote();
    });

    // Listen for messages from background
    if (chrome && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'languageChanged') {
          console.log('Popup: Language changed via runtime message:', message.language);
          this.currentLanguage = message.language;
          this.loadTranslations();
          this.updateUI();
        } else if (message.action === 'cardSaved') {
          console.log('Popup: New card saved, refreshing list');
          this.loadRecentItems();
        }
        return false;
      });
      console.log('Popup: Runtime message listener added');
    }
  }

  async loadLanguage() {
    try {
      const result = await chrome.runtime.sendMessage({
        action: 'getSetting',
        key: 'language',
        defaultValue: 'zh-CN'
      });
      this.currentLanguage = result.success ? result.value : 'zh-CN';
      this.loadTranslations();
      this.updateUI();
    } catch (error) {
      console.error('Failed to load language:', error);
    }
  }

  loadTranslations() {
    this.translations = {
      'zh-CN': {
        popup_title: 'iSnippets',
        popup_desc: '记下你真正想记住的内容',
        all_snippets: '全部片段',
        recent_snippets: '最近片段',
        take_note: '记下',
        take_note_placeholder: '记下你的片段内容...',
        link_page: '关联网页',
        settings: '设置',
        search_placeholder: '搜索…',
        total_clips: '总片段数',
        today_saved: '今日保存',
        no_items: '暂无条目',
        page_index: '记下',
        load_data_error: '加载数据失败',
        load_stats_error: '加载统计失败',
        load_recent_error: '加载最近条目失败'
      },
      'en': {
        popup_title: 'iSnippets',
        popup_desc: 'Note down what you really want to remember',
        all_snippets: 'All Snippets',
        recent_snippets: 'Recent Snippets',
        take_note: 'Take Note',
        take_note_placeholder: 'Note down your snippet content...',
        link_page: 'Link Page',
        settings: 'Settings',
        search_placeholder: 'Search…',
        total_clips: 'Total Snippets',
        today_saved: 'Saved today',
        no_items: 'No items yet',
        page_index: 'Jotted',
        load_data_error: 'Failed to load data',
        load_stats_error: 'Failed to load stats',
        load_recent_error: 'Failed to load recent items'
      },
      'ja': {
        popup_title: 'iSnippets',
        popup_desc: '本当に覚えたいことをメモする',
        all_snippets: 'すべてのスニペット',
        recent_snippets: '最近のスニペット',
        take_note: 'メモする',
        take_note_placeholder: 'スニペットの内容をメモする...',
        link_page: 'ページをリンク',
        settings: '設定',
        search_placeholder: '検索…',
        total_clips: 'スニペット総数',
        today_saved: '今日保存',
        no_items: 'アイテムがありません',
        page_index: '記した',
        load_data_error: 'データの読み込みに失败しました',
        load_stats_error: '統計の読み込みに失敗しました',
        load_recent_error: '最近のアイテムの読み込みに失敗しました'
      }
    };
  }

  updateUI() {
    const t = this.translations[this.currentLanguage] || this.translations['zh-CN'];

    // Update elements with data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (t[key]) {
        el.textContent = t[key];
      }
    });

    this.loadShortcutHint();
  }

  async loadShortcutHint() {
    try {
      if (chrome && chrome.commands) {
        const commands = await chrome.commands.getAll();
        const captureCommand = commands.find(c => c.name === 'capture-snippet');

        const hintEl = document.getElementById('shortcutHint');
        if (hintEl && captureCommand) {
          const shortcut = captureCommand.shortcut || (this.currentLanguage === 'zh-CN' ? '未设置' : (this.currentLanguage === 'ja' ? '未設定' : 'Not set'));

          if (this.currentLanguage === 'zh-CN') {
            hintEl.innerHTML = `在网页选中文字后按 <kbd>${shortcut}</kbd> 即可快速记下片段`;
          } else if (this.currentLanguage === 'ja') {
            hintEl.innerHTML = `テキストを選択し、<kbd>${shortcut}</kbd> を押すと片段を保存します`;
          } else {
            hintEl.innerHTML = `Select text and press <kbd>${shortcut}</kbd> to save a snippet`;
          }
        }
      }
    } catch (error) {
      console.error('Failed to load shortcut hint:', error);
    }
  }

  async loadData() {
    try {
      // Load recent items
      await this.loadRecentItems();
    } catch (error) {
      console.error('Failed to load popup data:', error);
      this.showError(this.translations[this.currentLanguage]?.load_data_error || '加载数据失败');
    }
  }

  async loadStats() {
    try {
      console.log('iSnippets: Loading stats...');
      const cardsResult = await chrome.runtime.sendMessage({ action: 'getSnippets' });
      console.log('iSnippets: Stats result:', cardsResult);

      if (cardsResult && cardsResult.success) {
        const cards = cardsResult.cards || [];

        const t = this.translations[this.currentLanguage] || this.translations['zh-CN'];
        const statsHtml = `
          <div class="stat-item">
            <span class="stat-label">${t.total_clips}</span>
            <span class="stat-value">${cards.length}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">${t.today_saved}</span>
            <span class="stat-value">${this.getTodayCount(cards)}</span>
          </div>
        `;

        document.getElementById('stats').innerHTML = statsHtml;
      } else {
        throw new Error('Failed to load stats: ' + (cardsResult ? cardsResult.error : 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      const t = this.translations[this.currentLanguage] || this.translations['zh-CN'];
      document.getElementById('stats').innerHTML = `<div class="error">${t.load_stats_error}: ${error.message}</div>`;
    }
  }

  async loadRecentItems() {
    try {
      console.log('iSnippets: Loading recent items...');
      const result = await chrome.runtime.sendMessage({
        action: 'getSnippets',
        filters: {}
      });

      if (result && result.success) {
        const recentCards = (result.cards || []).slice(0, 9);
        const t = this.translations[this.currentLanguage] || this.translations['zh-CN'];

        if (recentCards.length === 0) {
          document.getElementById('recentItems').innerHTML = `<div style="text-align: center; color: #999; padding: 20px;">${t.no_items}</div>`;
          return;
        }

        const itemsHtml = recentCards.map(card => {
          const hasUrl = card.url && card.url.length > 0;
          const sourceLink = hasUrl ? `<span class="source-link" data-url="${card.url}">${this.escapeHtml(card.domain)}</span>` :
            `<span class="source-link" style="cursor: default; color: inherit;">${t.page_index}</span>`;

          return `
            <div class="recent-item" data-card-id="${card.id}">
              <button class="delete-item-btn" data-id="${card.id}" title="删除">✕</button>
              <div class="recent-text">
                ${card.text ? this.escapeHtml(card.text) : t.page_index}
              </div>
              <div class="recent-meta">
                ${sourceLink}
                <span>${this.formatDate(card.created_at)}</span>
              </div>
            </div>
          `;
        }).join('');

        document.getElementById('recentItems').innerHTML = itemsHtml;

        // Bind link events
        document.querySelectorAll('.source-link[data-url]').forEach(link => {
          link.addEventListener('click', (e) => {
            e.stopPropagation();
            chrome.tabs.create({ url: e.target.dataset.url });
          });
        });

        // Bind delete events
        document.querySelectorAll('.delete-item-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const cardId = e.target.dataset.id;
            await this.deleteItem(cardId);
          });
        });

        // Bind card click for copy
        document.querySelectorAll('.recent-item').forEach(item => {
          item.addEventListener('click', (e) => {
            // Don't trigger if clicking buttons or links
            if (e.target.closest('.delete-item-btn') || e.target.closest('.source-link')) {
              return;
            }

            const cardId = item.dataset.cardId;
            const card = recentCards.find(c => c.id == cardId);
            if (card && card.text) {
              navigator.clipboard.writeText(card.text).then(() => {
                this.showToast('已复制内容', true);
              });
            }
          });
        });
      } else {
        throw new Error('Failed to load recent items: ' + (result ? result.error : 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to load recent items:', error);
      const t = this.translations[this.currentLanguage] || this.translations['zh-CN'];
      document.getElementById('recentItems').innerHTML = `<div class="error">${t.load_recent_error}: ${error.message}</div>`;
    }
  }

  async deleteItem(cardId) {
    try {
      const result = await chrome.runtime.sendMessage({
        action: 'softDeleteSnippet',
        cardId: cardId
      });

      if (result.success) {
        // Refresh the list
        await this.loadRecentItems();
      } else {
        console.error('Failed to delete item:', result.error);
      }
    } catch (error) {
      console.error('Delete item error:', error);
    }
  }

  getTodayCount(cards) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    return cards.filter(card => card.created_at >= todayTime).length;
  }

  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) { // Less than 1 minute
      return '刚刚';
    } else if (diff < 3600000) { // Less than 1 hour
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) { // Less than 1 day
      return `${Math.floor(diff / 3600000)}小时前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;

    const content = document.querySelector('.content');
    content.insertBefore(errorDiv, content.firstChild);

    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 3000);
  }

  async saveNote() {
    const noteTextarea = document.getElementById('noteTextarea');
    const noteText = noteTextarea.value.trim();
    if (!noteText) {
      alert('随笔内容不能为空');
      return;
    }

    try {
      let url = null;
      let domain = null;

      const includeLink = document.getElementById('includeLinkToggle').checked;
      if (includeLink) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const isInternalPage = tab.url.startsWith('chrome') ||
          tab.url.startsWith('edge') ||
          tab.url.startsWith('brave') ||
          tab.url.startsWith('about:');
        if (tab && tab.url && !isInternalPage) {
          url = tab.url;
          try {
            domain = new URL(tab.url).hostname;
          } catch (e) {
            domain = null;
          }
        }
      }

      const cardData = {
        type: 'note',
        text: noteText.slice(0, 144),
        url,
        domain,
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
        this.clearNote();
        this.showToast('随笔保存成功', true);
      } else {
        alert('保存随笔失败：' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('Save note error:', error);
      alert('保存随笔失败：' + error.message);
    }
  }

  clearNote() {
    const noteTextarea = document.getElementById('noteTextarea');
    noteTextarea.value = '';
    const charCount = document.getElementById('charCount');
    if (charCount) {
      charCount.textContent = '0';
      charCount.style.color = '#94a3b8';
    }
  }

  showToast(message, isSuccess) {
    const toast = document.createElement('div');
    toast.className = `toast ${isSuccess ? 'success' : 'error'}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${isSuccess ? '#10b981' : '#ef4444'};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 1000;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new iSnippetsPopup();
});
