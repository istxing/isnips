// iSnips Settings Page Script

class iSnipsSettings {
  constructor() {
    this.currentLanguage = 'en';
    this.translations = {};
    this.loadTranslations(); // Load translations immediately
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadLanguage();
    this.loadSettings();
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

    // Appearance (Theme) selector
    const appearanceRadios = document.querySelectorAll('input[name="appearance"]');
    appearanceRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.setAppearance(e.target.value);
      });
    });
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
      const language = await this.getSetting('language', 'en');
      document.getElementById('languageSelect').value = language;

      // Load column count setting
      const columnCount = await this.getSetting('columnCount', 5);
      document.getElementById('columnCountSelect').value = columnCount;

      // Load appearance setting
      const appearance = await this.getSetting('appearance', 'auto');
      const appearanceRadio = document.querySelector(`input[name="appearance"][value="${appearance}"]`);
      if (appearanceRadio) appearanceRadio.checked = true;
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.showMessage('load_error', 'error');
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
            const t = this.translations[this.currentLanguage] || this.translations['en'] || {};
            display.textContent = captureCommand.shortcut || (t.not_set || 'Not set');
          }
        }

        if (sidebarCommand) {
          const display = document.getElementById('sidebarShortcutDisplay');
          if (display) {
            const t = this.translations[this.currentLanguage] || this.translations['en'] || {};
            display.textContent = sidebarCommand.shortcut || (t.not_set || 'Not set');
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
        defaultValue: 'en'
      });
      this.currentLanguage = result.success ? result.value : 'en';
      this.loadTranslations();
      this.updateUI();
    } catch (error) {
      console.error('Failed to load language:', error);
      this.currentLanguage = 'en';
      this.loadTranslations();
      this.updateUI();
    }
  }

  loadTranslations() {
    this.translations = {
      'zh-CN': {
        settings_title: 'iSnips · 偏好设置',
        settings_header_title: 'iSnips · 片语',
        settings_header_desc: '一键闪记网页片段与想法，自动保留来源，随时可回顾。',
        language_section: '语言与显示',
        language_label: '界面语言',
        language_desc: '选择您偏好的界面语言',
        privacy_section: '数据安全',
        storage_label: '数据存储',
        storage_desc: '您的思维数据仅存储在本地设备，确保绝对隐私',
        local_storage: '本地安全存储',
        export_label: '片段备份',
        export_desc: '导出所有摘录与闪记，用于外部备份或迁移',
        export_btn: '导出备份',
        import_label: '恢复片段',
        import_desc: '从备份文件恢复您的知识片段',
        import_btn: '导入文件',
        clear_label: '清除所有记录',
        clear_desc: '彻底删除所有数据。一旦执行，您的所有记录将无法找回',
        clear_btn: '彻底清除',
        appearance_section: '外观显示',
        appearance_label: '外观模式',
        appearance_desc: '切换浅色、深色或随系统自动切换',
        appearance_light: '浅色',
        appearance_dark: '深色',
        appearance_auto: '跟随系统',
        support_section: '赞助支持',
        support_desc: '如果您喜欢 iSnips，欢迎请作者喝杯咖啡，支持后续功能的开发！',
        support_btn_label: '赞助支持 (Buy Me a Coffee)',

        about_section: '关于插件',
        version_label: '插件版本',
        version_desc: 'iSnips v1.0.0',
        features_label: '插件愿景',
        features_desc: '在网页浏览时快速记录片段或灵感瞬息，助您后期索源回顾，掌握自己的思维瞬间。',
        privacy_label: '隐私承诺',
        privacy_desc: '仅在您主动执行“记录”操作时读取选中文本',
        confirm_title: '核实操作',
        confirm_cancel: '暂不执行',
        confirm_ok: '确认执行',
        load_error: '配置加载失败',

        shortcuts_section: '交互热键',
        capture_shortcut_label: '捕捉网页片段',
        capture_shortcut_desc: '选中内容后按下此键，将其记录在您的片段库中',
        sidebar_shortcut_label: '呼出侧边栏',
        sidebar_shortcut_desc: '快速开启您的知识侧边视角',
        shortcut_change_tip: '提示：您可以随时在浏览器“快捷键”设置中调整这些热键',
        manage_shortcuts_btn: '自定义热键',
        display_section: '展示偏好',
        columns_label: '片段展示规模',
        columns_desc: '调整片段库在大屏幕上的列数展示效果',
        save_lang_success: '语言偏好已就绪',
        save_lang_error: '语言设置同步失败',
        save_success: '配置已更新',
        save_error: '配置更新失败',
        not_set: '未绑定',
        export_success: '片段导出成功',
        export_error: '导出过程中断',
        import_success: '片段恢复成功',
        import_error: '恢复失败',
        import_invalid: '文件校验错误',
        clear_success: '所有记录已抹除',
        clear_error: '抹除失败',
        clear_confirm: '这是危险操作：您确定要抹除所有记录的思维瞬间吗？此过程不可逆。',
        import_confirm: '核实警告：导入操作将覆盖您当前的本地片段库，是否继续？',
        empty_trash_confirm: '确定要清空回收站吗？此操作不可撤销。',
        delete_confirm: '确定要删除这个摘录吗？',
        restore_confirm: '确定要恢复这个摘录吗？',

        no_results: '无匹配结果',
        sync_section: '数据同步',
        sync_method_label: '同步方法',
        sync_method_desc: '选择您偏好的同步服务',
        sync_method_none: '禁用同步',
        sync_method_webdav: 'WebDAV',
        sync_method_googledrive: 'Google Drive',
        webdav_url: 'WebDAV 地址',
        webdav_user: '用户名',
        webdav_pass: '密码',
        save_sync_config: '保存配置',
        gdrive_login: '登录 Google Drive',
        gdrive_logout: '断开连接',
        gdrive_connected: '✓ 已连接 Google Drive',
        gdrive_disconnected: '已断开 Google Drive 连接',
        sync_now_label: '立即同步',
        last_sync_desc: '上次同步时间：{0}',
        sync_now_btn: '立即同步',
        sync_success: '同步成功',
        sync_error: '同步失败：{0}',
        config_save_success: '配置已保存',
        not_synced: '尚未同步',
        col_3: '3 栏',
        col_4: '4 栏',
        col_5: '5 栏',
        col_6: '6 栏'
      },
      'en': {
        settings_title: 'iSnips · Preferences',
        settings_header_title: 'iSnips',
        settings_header_desc: 'Save web snippets and thoughts with one click, automatically preserve sources, and revisit anytime.',
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
        appearance_section: 'Appearance',
        appearance_label: 'Appearance Mode',
        appearance_desc: 'Switch between Light, Dark, or System mode',
        appearance_light: 'Light',
        appearance_dark: 'Dark',
        appearance_auto: 'Auto',
        support_section: 'Support',
        support_desc: 'If you love iSnips, consider buying me a coffee to support future development!',
        support_btn_label: 'Buy Me a Coffee',

        about_section: 'About',
        version_label: 'Version',
        version_desc: 'iSnips v1.0.0',
        block_current_desc: 'Disable iSnips on the current website, no longer automatically save clips',
        features_label: 'Features',
        features_desc: 'Automatically save snippets when selecting text on web pages and pressing Alt+C, supports multi-language interface and waterfall layout',
        privacy_label: 'Privacy Statement',
        privacy_desc: 'Only reads selected text when you actively copy content, all data is stored locally',
        confirm_title: 'Confirm Action',
        confirm_cancel: 'Cancel',
        confirm_ok: 'Confirm',
        load_error: 'Failed to load settings',

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

        no_results: 'No matching results',
        sync_section: 'Synchronization',
        sync_method_label: 'Sync Method',
        sync_method_desc: 'Select your preferred sync service',
        sync_method_none: 'Disable Sync',
        sync_method_webdav: 'WebDAV',
        sync_method_googledrive: 'Google Drive',
        webdav_url: 'WebDAV URL',
        webdav_user: 'Username',
        webdav_pass: 'Password',
        save_sync_config: 'Save Config',
        gdrive_login: 'Login with Google Drive',
        gdrive_logout: 'Disconnect',
        gdrive_connected: '✓ Connected to Google Drive',
        gdrive_disconnected: 'Disconnected from Google Drive',
        sync_now_label: 'Sync Now',
        last_sync_desc: 'Last sync: {0}',
        sync_now_btn: 'Sync Now',
        sync_success: 'Sync successful',
        sync_error: 'Sync failed: {0}',
        config_save_success: 'Configuration saved',
        not_synced: 'Never synced',
        col_3: '3 Columns',
        col_4: '4 Columns',
        col_5: '5 Columns',
        col_6: '6 Columns'
      },
      'ja': {
        settings_title: 'iSnips - 設定',
        settings_header_title: 'iSnips 設定',
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
        appearance_section: '外観',
        appearance_label: '外観モード',
        appearance_desc: 'ライト、ダーク、またはシステム設定に従うかを選択します',
        appearance_light: 'ライト',
        appearance_dark: 'ダーク',
        appearance_auto: 'システムに従う',
        support_section: 'サポート',
        support_desc: 'iSnipsがお役に立ったら、作者にコーヒーをご馳走して開発を応援してください！',
        support_btn_label: 'Buy Me a Coffee',

        about_section: 'について',
        version_label: 'バージョン',
        version_desc: 'iSnips v1.0.0',
        features_label: '機能説明',
        features_desc: 'ウェブページのテキストを選択してAlt+Cを押すと自動的に片段を保存、多言語インターフェースとウォーターフォールレイアウトをサポート',
        privacy_label: 'プライバシーポリシー',
        privacy_desc: 'アクティブにコンテンツをコピーする場合にのみ選択されたテキストを読み取り、すべてのデータはローカルに保存されます',
        confirm_title: '操作の確認',
        confirm_cancel: 'キャンセル',
        confirm_ok: '確認',
        load_error: '設定の読み込みに失敗しました',

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

        no_results: '一致する結果がありません',
        sync_section: 'データ同期',
        sync_method_label: '同期方法',
        sync_method_desc: 'お好みの同期サービスを選択してください',
        sync_method_none: '同期を無効にする',
        sync_method_webdav: 'WebDAV',
        sync_method_googledrive: 'Google Drive',
        webdav_url: 'WebDAV アドレス',
        webdav_user: 'ユーザー名',
        webdav_pass: 'パスワード',
        save_sync_config: '設定を保存',
        gdrive_login: 'Google Drive でログイン',
        gdrive_logout: '切断する',
        gdrive_connected: '✓ Google Drive に接続済み',
        gdrive_disconnected: 'Google Drive から切断しました',
        sync_now_label: '今すぐ同期',
        last_sync_desc: '最終同期：{0}',
        sync_now_btn: '今すぐ同期',
        sync_success: '同期に成功しました',
        sync_error: '同期に失敗しました：{0}',
        config_save_success: '設定を保存しました',
        not_synced: '未同期',
        col_3: '3 列',
        col_4: '4 列',
        col_5: '5 列',
        col_6: '6 列'
      }
    };
  }

  updateUI() {
    // Get primary language code (e.g., 'en-US' -> 'en')
    const lang = this.currentLanguage;
    const baseLang = lang.split('-')[0];
    const t = this.translations[lang] || this.translations[baseLang] || this.translations['en'] || this.translations['en'];

    // Update document title
    document.title = t.settings_title;

    // Update elements with data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (t[key]) {
        el.textContent = t[key];
      }
    });

    // Elements with data-i18n attributes are now handled in the loop above.
    // Manual updates for elements without data-i18n or special cases below:

    // Update status text (ensure we target all indicators if multiple exist)
    document.querySelectorAll('.status-indicator').forEach(el => {
      if (el.dataset.i18n === 'gdrive_connected') return; // Handled by i18n loop
      if (t.local_storage) el.textContent = t.local_storage;
    });
  }


  async setAppearance(mode) {
    console.log('Settings: Setting appearance to', mode);
    try {
      await chrome.runtime.sendMessage({
        action: 'setSetting',
        key: 'appearance',
        value: mode
      });

      // Broadcast theme change
      chrome.runtime.sendMessage({
        action: 'themeChanged',
        theme: mode
      });

      this.showMessage('save_success', 'success');
      // Apply theme to current page as well
      if (window.applyTheme) window.applyTheme(mode);
    } catch (error) {
      console.error('Failed to save appearance:', error);
      this.showMessage('save_error', 'error');
    }
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

      // Update local state immediately for the current page
      this.currentLanguage = lang;
      this.loadTranslations();
      this.updateUI();

      // Broadcast language change to other extension pages
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

      const lang = this.currentLanguage;
      const baseLang = lang.split('-')[0];
      const t = this.translations[lang] || this.translations[baseLang] || this.translations['en'];

      document.getElementById('confirmMessage').textContent = t.import_confirm || 'Are you sure you want to import? This will overwrite all existing data.';
      this.showConfirmModal();

      // Clear file input
      document.getElementById('importDataInput').value = '';
    } catch (error) {
      console.error('Failed to import data:', error);
      const lang = this.currentLanguage;
      const baseLang = lang.split('-')[0];
      const t = this.translations[lang] || this.translations[baseLang] || this.translations['en'];
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
    const t = this.translations[this.currentLanguage] || this.translations['en'];
    document.getElementById('confirmMessage').textContent = t.clear_confirm || 'Are you sure you want to clear all data? This action cannot be undone.';
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
      const request = indexedDB.open('iSnipsIndexDB', 3);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
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

    const t = this.translations[this.currentLanguage] || this.translations['en'] || {};
    if (timestamp) {
      const dateStr = new Date(timestamp).toLocaleString();
      el.textContent = (t.last_sync_desc || 'Last synced: {0}').replace('{0}', dateStr);
    } else {
      el.textContent = t.not_synced || 'Not synced yet';
    }
  }

  showMessage(message, type = 'info', ...args) {
    // Get primary language code (e.g., 'en-US' -> 'en')
    const lang = this.currentLanguage;
    const baseLang = lang.split('-')[0];
    const t = this.translations[lang] || this.translations[baseLang] || this.translations['en'] || {};

    // Use translated message if key is provided
    let displayMessage = message;
    if (t[message]) {
      displayMessage = t[message];
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
  new iSnipsSettings();
});
