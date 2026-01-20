// ClipIndex Settings Page Script

class ClipIndexSettings {
  constructor() {
    this.currentLanguage = 'zh-CN';
    this.translations = {};
    this.loadTranslations(); // Load translations immediately
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadLanguage();
    this.loadSettings();
    this.loadBlockedSites();
    this.loadShortcuts();
    this.loadSyncSettings();
  }

  bindEvents() {
    // Language selector
    document.getElementById('languageSelect').addEventListener('change', (e) => {
      this.setLanguage(e.target.value);
    });

    // Column count selector
    document.getElementById('columnCountSelect').addEventListener('change', (e) => {
      this.saveSetting('columnCount', parseInt(e.target.value));
    });

    // Data operations
    document.getElementById('exportDataBtn').addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('importDataBtn').addEventListener('click', () => {
      document.getElementById('importDataInput').click();
    });

    document.getElementById('importDataInput').addEventListener('change', (e) => {
      this.importData(e.target.files[0]);
    });

    document.getElementById('clearDataBtn').addEventListener('click', () => {
      this.confirmClearData();
    });

    // Shortcuts management
    const openShortcutsBtn = document.getElementById('openShortcutsBtn');
    if (openShortcutsBtn) {
      openShortcutsBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
      });
    }

    // Modal events
    this.bindModalEvents();

    // Sync events
    this.bindSyncEvents();

    // Listen for language change messages from background
    if (chrome && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'languageChanged') {
          console.log('Settings: Language changed via runtime message:', message.language);
          this.currentLanguage = message.language;
          this.loadTranslations();
          this.updateUI();
        }
        return false;
      });
      console.log('Settings: Runtime message listener added');
    }
  }

  bindModalEvents() {
    const confirmModal = document.getElementById('confirmModal');
    const confirmModalClose = confirmModal.querySelector('.modal-close');
    const confirmCancel = document.getElementById('confirmCancel');
    const confirmOk = document.getElementById('confirmOk');

    [confirmModalClose, confirmCancel].forEach(btn => {
      btn.addEventListener('click', () => this.hideConfirmModal());
    });

    confirmOk.addEventListener('click', () => this.confirmAction());

    // Close modal on outside click
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) {
        this.hideConfirmModal();
      }
    });
  }

  async loadSettings() {
    try {
      // Load language setting
      const language = await this.getSetting('language', 'zh-CN');
      document.getElementById('languageSelect').value = language;

      // Load column count setting
      const columnCount = await this.getSetting('columnCount', 3);
      document.getElementById('columnCountSelect').value = columnCount;
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.showMessage('load_error', 'error');
    }
  }

  async loadBlockedSites() {
    try {
      const blockedSites = await this.getSetting('blockedSites', []);
      this.renderBlockedSites(blockedSites);
    } catch (error) {
      console.error('Failed to load blocked sites:', error);
      document.getElementById('blockedSitesList').innerHTML = `<div class="error">${this.translations[this.currentLanguage]?.load_blocked_error || '加载禁用站点失败'}</div>`;
    }
  }

  async loadShortcuts() {
    try {
      if (chrome && chrome.commands) {
        const commands = await chrome.commands.getAll();
        console.log('Settings: Loaded commands:', commands);

        const captureCommand = commands.find(c => c.name === 'capture-snippet');
        const sidebarCommand = commands.find(c => c.name === '_execute_action');

        if (captureCommand) {
          const display = document.getElementById('captureShortcutDisplay');
          if (display) {
            display.textContent = captureCommand.shortcut || (this.translations[this.currentLanguage]?.not_set || '未设置');
          }
        }

        if (sidebarCommand) {
          const display = document.getElementById('sidebarShortcutDisplay');
          if (display) {
            display.textContent = sidebarCommand.shortcut || (this.translations[this.currentLanguage]?.not_set || '未设置');
          }
        }
      }
    } catch (error) {
      console.error('Failed to load shortcuts:', error);
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
        settings_title: 'iSnippets - 设置',
        settings_header_title: 'iSnippets 设置',
        settings_header_desc: '记下你真正想记住的内容',
        language_section: '语言设置',
        language_label: '界面语言',
        language_desc: '选择您偏好的界面语言',
        privacy_section: '数据管理',
        storage_label: '数据存储',
        storage_desc: '所有数据仅存储在您的本地浏览器中，不会上传到任何服务器',
        local_storage: '本地存储',
        export_label: '数据导出',
        export_desc: '将您的所有摘录数据导出为 JSON 文件',
        export_btn: '导出数据',
        import_label: '数据导入',
        import_desc: '从 JSON 文件导入摘录数据',
        import_btn: '导入数据',
        clear_label: '清除所有数据',
        clear_desc: '删除所有摘录数据和设置。此操作无法撤销',
        clear_btn: '清除数据',
        blocking_section: '站点禁用',
        block_current_label: '禁用当前站点',
        block_current_desc: '在当前网站上禁用 ClipIndex，不再自动保存摘录',
        block_current_btn: '禁用当前站点',
        blocked_sites_title: '已禁用站点',
        no_blocked_sites: '暂无禁用站点',
        about_section: '关于',
        version_label: '版本',
        version_desc: 'iSnippets v2.0.2 - 智能摘录工具',
        features_label: '功能说明',
        features_desc: '选中网页文本后按下 Alt+C 自动保存，支持多语言界面和瀑布流展示',
        privacy_label: '隐私声明',
        privacy_desc: '仅在您主动复制内容时读取选中文本，所有数据存储在本地',
        confirm_title: '确认操作',
        confirm_cancel: '取消',
        confirm_ok: '确认',
        load_error: '加载设置失败',
        load_blocked_error: '加载禁用站点失败',
        shortcuts_section: '快捷键设置',
        capture_shortcut_label: '自动记下片段',
        capture_shortcut_desc: '选中网页文本后按下此快捷键自动保存',
        sidebar_shortcut_label: '打开侧边栏',
        sidebar_shortcut_desc: '快速呼出插件侧边栏',
        shortcut_change_tip: '提示：您可以在浏览器的“扩展程序 -> 快捷键”设置中修改这些热键',
        manage_shortcuts_btn: '管理快捷键',
        display_section: '显示设置',
        columns_label: '片段库栏数',
        columns_desc: '设置片段库在宽屏下的列数展示',
        save_lang_success: '语言设置已保存',
        save_lang_error: '保存语言设置失败',
        save_success: '设置已保存',
        save_error: '保存设置失败',
        not_set: '未设置',
        export_success: '数据导出成功',
        export_error: '数据导出失败',
        import_success: '数据导入成功',
        import_error: '数据导入失败',
        import_invalid: '数据导入失败：文件格式错误',
        clear_success: '所有数据已清除',
        clear_error: '清除数据失败',
        clear_confirm: '确定要清除所有数据吗？此操作无法撤销，包括所有摘录和设置。',
        import_confirm: '确定要导入数据吗？这将覆盖现有的所有摘录数据。',
        block_success: '已禁用站点：{0}',
        block_already: '此站点已被禁用',
        block_current_error: '无法获取当前网站信息',
        block_system_error: '无法禁用 Chrome 系统页面',
        block_error: '禁用站点失败',
        unblock_success: '已取消禁用站点：{0}',
        unblock_error: '取消禁用失败',
        no_results: '无匹配结果',
        sync_section: '数据同步',
        sync_method_label: '同步方法',
        sync_method_desc: '选择您偏好的同步服务',
        sync_method_none: '禁用同步',
        webdav_url: 'WebDAV 地址',
        webdav_user: '用户名',
        webdav_pass: '密码',
        save_sync_config: '保存配置',
        gdrive_login: '登录 Google Drive',
        gdrive_logout: '断开连接',
        gdrive_connected: '✓ 已连接 Google Drive',
        sync_now_label: '立即同步',
        last_sync_desc: '上次同步时间：{0}',
        sync_now_btn: '立即同步',
        sync_success: '同步成功',
        sync_error: '同步失败：{0}',
        config_save_success: '配置已保存',
        not_synced: '尚未同步'
      },
      'en': {
        settings_title: 'iSnippets - Settings',
        settings_header_title: 'iSnippets Settings',
        settings_header_desc: 'Note down what you really want to remember',
        language_section: 'Language Settings',
        language_label: 'Interface Language',
        language_desc: 'Select your preferred interface language',
        privacy_section: 'Data Management',
        storage_label: 'Data Storage',
        storage_desc: 'All data is stored locally in your browser and is not uploaded to any server',
        local_storage: 'Local Storage',
        export_label: 'Data Export',
        export_desc: 'Export all your clip data as a JSON file',
        export_btn: 'Export Data',
        import_label: 'Data Import',
        import_desc: 'Import clip data from a JSON file',
        import_btn: 'Import Data',
        clear_label: 'Clear All Data',
        clear_desc: 'Delete all clip data and settings. This action cannot be undone',
        clear_btn: 'Clear Data',
        blocking_section: 'Site Blocking',
        block_current_label: 'Block Current Site',
        block_current_desc: 'Disable ClipIndex on the current website, no longer automatically save clips',
        block_current_btn: 'Block Current Site',
        blocked_sites_title: 'Blocked Sites',
        no_blocked_sites: 'No blocked sites',
        about_section: 'About',
        version_label: 'Version',
        version_desc: 'iSnippets v2.0.2 - Intelligent clipping tool',
        features_label: 'Features',
        features_desc: 'Automatically save snippets when selecting text on web pages and pressing Alt+C, supports multi-language interface and waterfall layout',
        privacy_label: 'Privacy Statement',
        privacy_desc: 'Only reads selected text when you actively copy content, all data is stored locally',
        confirm_title: 'Confirm Action',
        confirm_cancel: 'Cancel',
        confirm_ok: 'Confirm',
        load_error: 'Failed to load settings',
        load_blocked_error: 'Failed to load blocked sites',
        shortcuts_section: 'Shortcuts',
        capture_shortcut_label: 'Capture Snippet',
        capture_shortcut_desc: 'Save selected text automatically when pressing this shortcut',
        sidebar_shortcut_label: 'Open Sidebar',
        sidebar_shortcut_desc: 'Quickly show the extension sidebar',
        shortcut_change_tip: 'Tip: You can modify these hotkeys in the browser\'s "Extensions -> Shortcuts" settings',
        manage_shortcuts_btn: 'Manage Shortcuts',
        display_section: 'Display',
        columns_label: 'Library Columns',
        columns_desc: 'Set the number of columns in the Snippet Library on wide screens',
        save_lang_success: 'Language settings saved',
        save_lang_error: 'Failed to save language settings',
        save_success: 'Settings saved',
        save_error: 'Failed to save settings',
        not_set: 'Not set',
        export_success: 'Data exported successfully',
        export_error: 'Failed to export data',
        import_success: 'Data imported successfully',
        import_error: 'Failed to import data',
        import_invalid: 'Data import failed: invalid file format',
        clear_success: 'All data cleared',
        clear_error: 'Failed to clear data',
        clear_confirm: 'Are you sure you want to clear all data? This action cannot be undone, including all clips and settings.',
        import_confirm: 'Are you sure you want to import data? This will overwrite all existing clip data.',
        block_success: 'Site blocked: {0}',
        block_already: 'This site is already blocked',
        block_current_error: 'Unable to get current website information',
        block_system_error: 'Unable to block Chrome system pages',
        block_error: 'Failed to block site',
        unblock_success: 'Site unblocked: {0}',
        unblock_error: 'Failed to unblock site',
        no_results: 'No matching results',
        sync_section: 'Synchronization',
        sync_method_label: 'Sync Method',
        sync_method_desc: 'Select your preferred sync service',
        sync_method_none: 'Disable Sync',
        webdav_url: 'WebDAV URL',
        webdav_user: 'Username',
        webdav_pass: 'Password',
        save_sync_config: 'Save Config',
        gdrive_login: 'Login with Google Drive',
        gdrive_logout: 'Disconnect',
        gdrive_connected: '✓ Connected to Google Drive',
        sync_now_label: 'Sync Now',
        last_sync_desc: 'Last sync: {0}',
        sync_now_btn: 'Sync Now',
        sync_success: 'Sync successful',
        sync_error: 'Sync failed: {0}',
        config_save_success: 'Configuration saved',
        not_synced: 'Never synced'
      },
      'ja': {
        settings_title: 'iSnippets - 設定',
        settings_header_title: 'iSnippets 設定',
        settings_header_desc: '本当に覚えたいことをメモする',
        language_section: '言語設定',
        language_label: 'インターフェース言語',
        language_desc: 'お好みのインターフェース言語を選択してください',
        privacy_section: 'データ管理',
        storage_label: 'データストレージ',
        storage_desc: 'すべてのデータはブラウザのローカルに保存され、サーバーにアップロードされません',
        local_storage: 'ローカルストレージ',
        export_label: 'データエクスポート',
        export_desc: 'すべてのクリップデータをJSONファイルとしてエクスポート',
        export_btn: 'データをエクスポート',
        import_label: 'データインポート',
        import_desc: 'JSONファイルからクリップデータをインポート',
        import_btn: 'データをインポート',
        clear_label: 'すべてのデータをクリア',
        clear_desc: 'すべてのクリップデータと設定を削除。この操作は元に戻せません',
        clear_btn: 'データをクリア',
        blocking_section: 'サイトブロック',
        block_current_label: '現在のサイトをブロック',
        block_current_desc: '現在のウェブサイトでClipIndexを無効化、クリップの自動保存を停止',
        block_current_btn: '現在のサイトをブロック',
        blocked_sites_title: 'ブロックされたサイト',
        no_blocked_sites: 'ブロックされたサイトはありません',
        about_section: 'について',
        version_label: 'バージョン',
        version_desc: 'iSnippets v2.0.2 - インテリジェントなクリッピングツール',
        features_label: '機能説明',
        features_desc: 'ウェブページのテキストを選択してAlt+Cを押すと自動的に片段を保存、多言語インターフェースとウォーターフォールレイアウトをサポート',
        privacy_label: 'プライバシーポリシー',
        privacy_desc: 'アクティブにコンテンツをコピーする場合にのみ選択されたテキストを読み取り、すべてのデータはローカルに保存されます',
        confirm_title: '操作の確認',
        confirm_cancel: 'キャンセル',
        confirm_ok: '確認',
        load_error: '設定の読み込みに失敗しました',
        load_blocked_error: 'ブロックされたサイトの読み込みに失敗しました',
        shortcuts_section: 'ショートカット',
        capture_shortcut_label: 'スニペットをキャプチャ',
        capture_shortcut_desc: 'テキストを選択してこのショートカットを押すと自動的に保存されます',
        sidebar_shortcut_label: 'サイドバーを開く',
        sidebar_shortcut_desc: '拡張機能のサイドバーを素早く表示します',
        shortcut_change_tip: 'ヒント：ブラウザの「拡張機能 -> ショートカット」設定でこれらのホットキーを変更できます',
        manage_shortcuts_btn: 'ショートカットを管理',
        display_section: '表示設定',
        columns_label: 'ライブラリの列数',
        columns_desc: 'ワイドスクリーンでのスニペットライブラリの列数を設定します',
        save_lang_success: '言語設定が保存されました',
        save_lang_error: '言語設定の保存に失敗しました',
        save_success: '設定が保存されました',
        save_error: '設定の保存に失敗しました',
        not_set: '未設定',
        export_success: 'データのエクスポートに成功しました',
        export_error: 'データのエクスポートに失敗しました',
        import_success: 'データのインポートに成功しました',
        import_error: 'データのインポートに失敗しました',
        import_invalid: 'データのインポートに失敗しました：無効なファイル形式',
        clear_success: 'すべてのデータがクリアされました',
        clear_error: 'データのクリアに失敗しました',
        clear_confirm: 'すべてのデータをクリアしてもよろしいですか？この操作は元に戻せません、すべてのクリップと設定を含む。',
        import_confirm: 'データをインポートしてもよろしいですか？これにより既存のすべてのクリップデータが上書きされます。',
        block_success: 'サイトをブロックしました：{0}',
        block_already: 'このサイトはすでにブロックされています',
        block_current_error: '現在のウェブサイト情報を取得できません',
        block_system_error: 'Chromeシステムページをブロックできません',
        block_error: 'サイトのブロックに失敗しました',
        unblock_success: 'サイトのブロックを解除しました：{0}',
        unblock_error: 'サイトのブロック解除に失敗しました',
        no_results: '一致する結果がありません',
        sync_section: 'データ同期',
        sync_method_label: '同期方法',
        sync_method_desc: 'お好みの同期サービスを選択してください',
        sync_method_none: '同期を無効にする',
        webdav_url: 'WebDAV アドレス',
        webdav_user: 'ユーザー名',
        webdav_pass: 'パスワード',
        save_sync_config: '設定を保存',
        gdrive_login: 'Google Drive でログイン',
        gdrive_logout: '切断する',
        gdrive_connected: '✓ Google Drive に接続済み',
        sync_now_label: '今すぐ同期',
        last_sync_desc: '最終同期：{0}',
        sync_now_btn: '今すぐ同期',
        sync_success: '同期に成功しました',
        sync_error: '同期に失敗しました：{0}',
        config_save_success: '設定を保存しました',
        not_synced: '未同期'
      }
    };
  }

  updateUI() {
    const t = this.translations[this.currentLanguage] || this.translations['zh-CN'];

    // Update document title
    document.title = t.settings_title;

    // Update elements with data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (t[key]) {
        el.textContent = t[key];
      }
    });

    // Update header
    document.querySelector('.settings-header h1').textContent = t.settings_header_title;
    document.querySelector('.settings-header p').textContent = t.settings_header_desc;

    // Update status text
    const statusEl = document.querySelector('.status-indicator');
    if (statusEl && t.local_storage) {
      statusEl.textContent = t.local_storage;
    }

    // No manual button updates needed as they use data-i18n

    // Update blocked sites section
    const blockedTitle = document.querySelector('.blocked-sites h3');
    if (blockedTitle && t.blocked_sites_title) {
      blockedTitle.textContent = t.blocked_sites_title;
    }
  }

  renderBlockedSites(blockedSites) {
    const container = document.getElementById('blockedSitesList');
    const t = this.translations[this.currentLanguage] || this.translations['zh-CN'] || {};

    if (blockedSites.length === 0) {
      container.innerHTML = `<div style="color: #6b7280; font-size: 14px;">${t.no_blocked_sites || '暂无禁用站点'}</div>`;
      return;
    }

    const html = blockedSites.map(domain => `
      <div class="blocked-site-item">
        <span class="blocked-site-domain">${this.escapeHtml(domain)}</span>
        <button class="blocked-site-remove" data-domain="${this.escapeHtml(domain)}" title="${t.unblock_success ? t.unblock_success.replace('：', '') : '取消禁用'}">×</button>
      </div>
    `).join('');

    container.innerHTML = html;

    // Bind remove events
    container.querySelectorAll('.blocked-site-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        this.unblockSite(btn.dataset.domain);
      });
    });
  }

  async setLanguage(lang) {
    console.log('Settings: Setting language to', lang);
    try {
      // Update both IndexedDB and chrome.storage.local for real-time sync
      const dbResult = await chrome.runtime.sendMessage({
        action: 'setSetting',
        key: 'language',
        value: lang
      });
      console.log('Settings: DB save result:', dbResult);

      // Also set directly to chrome.storage.local to trigger onChanged listeners
      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ language: lang }, () => {
          if (chrome.runtime.lastError) {
            console.error('Settings: chrome.storage.local error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            console.log('Settings: chrome.storage.local saved successfully');
            resolve();
          }
        });
      });

      // Broadcast language change to all extension pages
      const broadcastResult = await chrome.runtime.sendMessage({
        action: 'languageChanged',
        language: lang
      });
      console.log('Settings: Broadcast result:', broadcastResult);

      this.showMessage('save_lang_success', 'success');
    } catch (error) {
      console.error('Failed to save language:', error);
      this.showMessage('save_lang_error', 'error');
    }
  }

  async saveSetting(key, value) {
    try {
      await chrome.runtime.sendMessage({
        action: 'setSetting',
        key,
        value
      });
      this.showMessage('save_success', 'success');
    } catch (error) {
      console.error('Failed to save setting:', error);
      this.showMessage('save_error', 'error');
    }
  }

  async getSetting(key, defaultValue) {
    try {
      const result = await chrome.runtime.sendMessage({
        action: 'getSetting',
        key,
        defaultValue
      });
      return result.success ? result.value : defaultValue;
    } catch (error) {
      console.error('Failed to get setting:', error);
      return defaultValue;
    }
  }

  async exportData() {
    try {
      // Get all data
      const [cardsResult, highlightsResult, settingsResult] = await Promise.all([
        chrome.runtime.sendMessage({ action: 'getAllSnippets' }),
        this.getAllHighlights(),
        this.getAllSettings()
      ]);

      if (!cardsResult.success) {
        throw new Error('Failed to export data');
      }

      const exportData = {
        version: '3.0.0',
        exportDate: new Date().toISOString(),
        snippets: cardsResult.cards,
        highlights: highlightsResult,
        settings: settingsResult
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clipindex-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showMessage('export_success', 'success');
    } catch (error) {
      console.error('Failed to export data:', error);
      this.showMessage('export_error', 'error');
    }
  }

  async importData(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      // Validate data structure
      if (!importData.snippets && !importData.cards) {
        throw new Error('Invalid data format');
      }

      // Confirm import
      this.pendingAction = async () => {
        await this.performImport(importData);
      };

      document.getElementById('confirmMessage').textContent = this.translations[this.currentLanguage]?.import_confirm || '确定要导入数据吗？这将覆盖现有的所有摘录数据。';
      this.showConfirmModal();

      // Clear file input
      document.getElementById('importDataInput').value = '';
    } catch (error) {
      console.error('Failed to import data:', error);
      this.showMessage('import_invalid', 'error');
      document.getElementById('importDataInput').value = '';
    }
  }

  async performImport(importData) {
    try {
      // Import cards
      const rawSnippets = importData.snippets || importData.cards || [];
      for (const card of rawSnippets) {
        try {
          const normalized = card.text ? card : {
            id: card.id,
            type: card.url ? 'web' : 'note',
            text: (card.clipText || card.title || '').slice(0, 144),
            url: card.url || null,
            domain: card.domain || null,
            created_at: card.createdAt || Date.now(),
            updated_at: card.updatedAt || card.createdAt || Date.now(),
            deleted_at: card.deletedAt || null,
            purged_at: null
          };
          await chrome.runtime.sendMessage({
            action: 'saveSnippet',
            data: normalized
          });
        } catch (e) {
          console.error('Failed to import card:', card.id, e);
        }
      }

      // Import highlights if available
      if (importData.highlights) {
        for (const highlight of importData.highlights) {
          try {
            await chrome.runtime.sendMessage({
              action: 'storeHighlight',
              highlight: highlight
            });
          } catch (e) {
            console.error('Failed to import highlight:', highlight.id, e);
          }
        }
      }

      this.showMessage('import_success', 'success');

      // Reload page to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Failed to perform import:', error);
      this.showMessage('import_error', 'error');
    }
  }

  async getAllHighlights() {
    // This would need to be implemented in background.js if we want to export highlights
    return [];
  }

  async getAllSettings() {
    const settings = {};
    const settingKeys = [
      'language',
      'blockedSites'
    ];

    for (const key of settingKeys) {
      settings[key] = await this.getSetting(key, null);
    }

    return settings;
  }

  confirmClearData() {
    this.pendingAction = () => this.clearAllData();
    document.getElementById('confirmMessage').textContent = this.translations[this.currentLanguage]?.clear_confirm || '确定要清除所有数据吗？此操作无法撤销，包括所有摘录和设置。';
    this.showConfirmModal();
  }

  async clearAllData() {
    try {
      // Clear IndexedDB
      const db = await this.openDatabase();
      const stores = ['snippets', 'indexCards', 'highlights', 'settings', 'spaces'];

      for (const storeName of stores) {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        await new Promise((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      db.close();

      this.showMessage('clear_success', 'success');

      // Reload page
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Failed to clear data:', error);
      this.showMessage('clear_error', 'error');
    }
  }

  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ClipIndexDB', 3);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async blockCurrentSite() {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) {
        this.showMessage('block_current_error', 'error');
        return;
      }

      const url = new URL(tab.url);
      const domain = url.hostname;

      const protocol = url.protocol;
      if (protocol === 'chrome:' || protocol === 'chrome-extension:' || protocol === 'about:') {
        this.showMessage('block_system_error', 'error');
        return;
      }

      // Get current blocked sites
      const blockedSites = await this.getSetting('blockedSites', []);
      if (blockedSites.includes(domain)) {
        this.showMessage('block_already', 'error');
        return;
      }

      // Add to blocked sites
      blockedSites.push(domain);
      await this.saveSetting('blockedSites', blockedSites);

      // Refresh blocked sites list
      this.loadBlockedSites();

      this.showMessage('block_success', 'success', domain);
    } catch (error) {
      console.error('Failed to block site:', error);
      this.showMessage('block_error', 'error');
    }
  }

  async unblockSite(domain) {
    try {
      const blockedSites = await this.getSetting('blockedSites', []);
      const updatedSites = blockedSites.filter(site => site !== domain);

      await this.saveSetting('blockedSites', updatedSites);
      this.loadBlockedSites();

      this.showMessage('unblock_success', 'success', domain);
    } catch (error) {
      console.error('Failed to unblock site:', error);
      this.showMessage('unblock_error', 'error');
    }
  }

  showConfirmModal() {
    document.getElementById('confirmModal').classList.add('open');
  }

  hideConfirmModal() {
    document.getElementById('confirmModal').classList.remove('open');
    this.pendingAction = null;
  }

  async confirmAction() {
    if (this.pendingAction) {
      await this.pendingAction();
      this.hideConfirmModal();
    }
  }

  bindSyncEvents() {
    // Radio button group for sync method
    const syncMethodRadios = document.querySelectorAll('input[name="syncMethod"]');
    syncMethodRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.toggleSyncArea(e.target.value);
        this.saveSyncConfig({ type: e.target.value });
        if (e.target.value === 'googledrive') {
          this.checkGoogleDriveStatus();
        }
      });
    });

    document.getElementById('saveWebdavBtn').addEventListener('click', () => {
      const config = {
        type: 'webdav',
        url: document.getElementById('webdavUrl').value,
        username: document.getElementById('webdavUser').value,
        password: document.getElementById('webdavPass').value
      };
      this.saveSyncConfig(config);
    });

    document.getElementById('gdriveLoginBtn').addEventListener('click', async () => {
      await this.syncNow('googledrive');
      await this.checkGoogleDriveStatus();
    });

    document.getElementById('gdriveLogoutBtn').addEventListener('click', async () => {
      await this.logoutGoogleDrive();
    });

    document.getElementById('syncNowBtn').addEventListener('click', () => {
      const checkedRadio = document.querySelector('input[name="syncMethod"]:checked');
      const type = checkedRadio ? checkedRadio.value : 'none';
      if (type === 'none') return;
      this.syncNow(type);
    });
  }

  toggleSyncArea(type) {
    document.querySelectorAll('.sync-config-area').forEach(el => el.style.display = 'none');
    const targetArea = document.getElementById(type + 'Config');
    if (targetArea) targetArea.style.display = 'block';
  }

  async loadSyncSettings() {
    const config = await this.getSetting('syncConfig', { type: 'none' });

    // Set the correct radio button
    const radio = document.querySelector(`input[name="syncMethod"][value="${config.type}"]`);
    if (radio) radio.checked = true;

    this.toggleSyncArea(config.type);

    if (config.type === 'webdav') {
      document.getElementById('webdavUrl').value = config.url || '';
      document.getElementById('webdavUser').value = config.username || '';
      document.getElementById('webdavPass').value = config.password || '';
    }

    if (config.type === 'googledrive') {
      await this.checkGoogleDriveStatus();
    }

    const lastSyncTime = await this.getSetting('lastSyncTime', null);
    this.updateLastSyncDisplay(lastSyncTime);
  }

  async checkGoogleDriveStatus() {
    try {
      // Try to get token without interactive mode to check if already logged in
      const token = await new Promise((resolve) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
          resolve(token || null);
        });
      });

      const notLoggedIn = document.getElementById('gdriveNotLoggedIn');
      const loggedIn = document.getElementById('gdriveLoggedIn');

      if (token) {
        notLoggedIn.style.display = 'none';
        loggedIn.style.display = 'flex';
      } else {
        notLoggedIn.style.display = 'flex';
        loggedIn.style.display = 'none';
      }
    } catch (error) {
      console.error('Failed to check Google Drive status:', error);
    }
  }

  async logoutGoogleDrive() {
    try {
      const token = await new Promise((resolve) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
          resolve(token || null);
        });
      });

      if (token) {
        // Revoke the token
        await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
        // Remove cached token
        await new Promise((resolve) => {
          chrome.identity.removeCachedAuthToken({ token }, resolve);
        });
      }

      // Update UI
      document.getElementById('gdriveNotLoggedIn').style.display = 'flex';
      document.getElementById('gdriveLoggedIn').style.display = 'none';

      this.showMessage('gdrive_disconnected', 'success');
    } catch (error) {
      console.error('Failed to logout from Google Drive:', error);
    }
  }

  async saveSyncConfig(config) {
    const currentConfig = await this.getSetting('syncConfig', {});
    const newConfig = { ...currentConfig, ...config };
    await this.saveSetting('syncConfig', newConfig);
    this.showMessage('config_save_success', 'success');
  }

  async syncNow(type) {
    const btn = document.getElementById('syncNowBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '...';

    try {
      const action = type === 'webdav' ? 'syncWebDAV' : 'syncGoogleDrive';
      const result = await chrome.runtime.sendMessage({ action });
      if (result.success) {
        const now = Date.now();
        await this.saveSetting('lastSyncTime', now);
        this.updateLastSyncDisplay(now);
        this.showMessage('sync_success', 'success');
      } else {
        this.showMessage('sync_error', 'error', result.error);
      }
    } catch (error) {
      this.showMessage('sync_error', 'error', error.message);
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  updateLastSyncDisplay(timestamp) {
    const el = document.getElementById('lastSyncTime');
    if (!el) return;

    const t = this.translations[this.currentLanguage] || this.translations['zh-CN'] || {};
    if (timestamp) {
      const dateStr = new Date(timestamp).toLocaleString();
      el.textContent = (t.last_sync_desc || '上次同步时间：{0}').replace('{0}', dateStr);
    } else {
      el.textContent = t.not_synced || '尚未同步';
    }
  }

  showMessage(message, type = 'info', ...args) {
    // Use translated message if key is provided
    let displayMessage = message;
    if (this.translations[this.currentLanguage] && this.translations[this.currentLanguage][message]) {
      displayMessage = this.translations[this.currentLanguage][message];
    }

    // Replace placeholders with arguments
    if (args.length > 0) {
      args.forEach((arg, index) => {
        displayMessage = displayMessage.replace(`{${index}}`, arg);
      });
    }

    // Create message element
    const msgEl = document.createElement('div');
    msgEl.className = 'message ' + type;
    msgEl.textContent = displayMessage;
    msgEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6b7280'};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      z-index: 10000;
      font-size: 14px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    `;

    document.body.appendChild(msgEl);

    // Auto remove
    setTimeout(() => {
      if (msgEl.parentNode) {
        msgEl.parentNode.removeChild(msgEl);
      }
    }, 5000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize settings when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ClipIndexSettings();
});
