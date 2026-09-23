(() => {
  "use strict";

  const page = document.body.dataset.page;
  const $ = (id) => document.getElementById(id);
  const strings = {
    en: {
      library: "Library",
      settings: "Settings",
      your_space: "YOUR SPACE",
      capture_thought: "Capture what matters.",
      panel_desc: "Your notes and web highlights, always within reach.",
      quick_note: "Quick note",
      note_placeholder: "What's on your mind?",
      attach_page: "Attach current page",
      save_note: "Save note",
      recent: "Recent",
      view_all: "View all →",
      saved_items: "saved items",
      to_clip: "to clip selection",
      workspace: "WORKSPACE",
      all_items: "All items",
      clips: "Clips",
      notes: "Notes",
      trash: "Trash",
      local_first: "Your space, on your terms.",
      search_placeholder: "Search your collection",
      new_note: "+ New note",
      library_eyebrow: "YOUR KNOWLEDGE, ORGANIZED",
      library_desc: "Everything worth keeping, in one place.",
      empty_trash: "Empty trash",
      newest: "Newest first",
      oldest: "Oldest first",
      nothing_here: "Nothing here yet",
      empty_desc: "Start with a note or save a selection from a page.",
      make_it_yours: "MAKE IT YOURS",
      edit_item: "Edit item",
      cancel: "Cancel",
      save_changes: "Save changes",
      back_to_library: "← Library",
      preferences: "PREFERENCES",
      general: "General",
      sync: "Sync",
      data_backup: "Data & backup",
      settings_desc:
        "Keep iSnips comfortable, portable, and under your control.",
      general_desc: "Display and capture preferences",
      language: "Language",
      language_desc: "Interface language",
      appearance: "Appearance",
      appearance_desc: "Choose your preferred theme",
      system: "System",
      light: "Light",
      dark: "Dark",
      columns: "Library columns",
      columns_desc: "Used on wider screens",
      shortcuts: "Keyboard shortcuts",
      manage: "Manage",
      blocked_sites: "Blocked sites",
      blocked_desc: "Clipping and highlights are disabled on these domains",
      domain_placeholder: "example.com",
      add: "Add",
      sync_desc: "Connect a service only when you choose",
      sync_method: "Sync method",
      sync_method_desc: "Your notes are local until sync is enabled",
      off: "Off",
      webdav_url: "WebDAV URL (HTTPS)",
      username: "Username",
      password: "Password",
      save_connection: "Save connection",
      disconnect: "Disconnect",
      auto_sync: "Automatic sync",
      auto_sync_desc: "Runs while Chrome is open",
      every_30m: "Every 30 min",
      every_1h: "Every hour",
      daily: "Daily",
      sync_now: "Sync now",
      backup_desc: "Export a copy and restore when needed",
      auto_backup: "Automatic local backups",
      backup_local_desc: "Snapshots are stored in this browser profile",
      create_backup: "Create snapshot",
      back_up_now: "Back up now",
      restore_snapshot: "Restore snapshot",
      restore_desc: "Replaces the current local collection",
      restore: "Restore",
      portable_backup: "Portable backup",
      portable_desc: "JSON file with items, highlights, spaces, and settings",
      export: "Export",
      import: "Import",
      clear_local: "Clear local data",
      clear_desc: "Removes items and settings from this browser",
      clear_data: "Clear data",
      privacy_note:
        "WebDAV and Google Drive sync are optional. Portable exports may contain connection credentials; keep the file private.",
      item_count: "{0} items",
      copied: "Copied to clipboard",
      copy: "Copy",
      sponsor: "Support iSnips",
      saved: "Saved",
      updated: "Changes saved",
      moved_to_trash: "Moved to trash",
      restored: "Restored",
      operation_failed: "Operation failed: {0}",
      empty_note: "Write something first",
      no_recent: "No saved items yet. Start with a note.",
      note: "Note",
      clip: "Clip",
      no_source: "No source",
      edit: "Edit",
      delete: "Move to trash",
      restore_action: "Restore",
      confirm_delete: "Move this item to trash?",
      confirm_empty: "Permanently remove all items in trash?",
      confirm_restore:
        "Restore this snapshot? Current local items will be replaced.",
      confirm_import:
        "Import this backup? Matching IDs will be updated; other items remain.",
      confirm_clear:
        "Clear all local items, settings, and backups? This cannot be undone.",
      invalid_domain: "Enter a valid domain without a path",
      invalid_url: "Enter a valid HTTPS WebDAV URL",
      not_configured: "Choose a sync method first",
      never_synced: "Never synced",
      never_backed_up: "No local snapshot yet",
      last_synced: "Last synced {0}",
      last_backed_up: "Last backed up {0}",
      snapshot_empty: "No snapshots available",
      backup_created: "Local snapshot created",
      backup_restored: "Snapshot restored",
      export_ready: "Backup downloaded",
      imported: "Imported {0} items",
      cleared: "Local data cleared",
      drive_ready: "Google Drive is selected. Use Sync now to connect.",
      drive_disconnected: "Google Drive disconnected",
      result_count: "{0} results",
      create_note: "New note",
      save: "Save",
      unknown_error: "Unknown error",
    },
    "zh-CN": {
      library: "片段库",
      settings: "设置",
      your_space: "你的空间",
      capture_thought: "留住值得记住的。",
      panel_desc: "摘录、灵感与来源，随手可得。",
      quick_note: "快速闪记",
      note_placeholder: "此刻想到了什么？",
      attach_page: "附上当前网页",
      save_note: "保存闪记",
      recent: "最近记录",
      view_all: "查看全部 →",
      saved_items: "条记录",
      to_clip: "记录选中文字",
      workspace: "工作空间",
      all_items: "全部记录",
      clips: "网页摘录",
      notes: "闪记",
      trash: "回收站",
      local_first: "你的知识，由你掌握。",
      search_placeholder: "搜索片段与来源",
      new_note: "+ 新建闪记",
      library_eyebrow: "让有价值的内容归于一处",
      library_desc: "你想留下的，都在这里。",
      empty_trash: "清空回收站",
      newest: "最新优先",
      oldest: "最早优先",
      nothing_here: "这里还没有记录",
      empty_desc: "写一条闪记，或从网页选中文字开始。",
      make_it_yours: "随时记录",
      edit_item: "编辑记录",
      cancel: "取消",
      save_changes: "保存修改",
      back_to_library: "← 返回片段库",
      preferences: "偏好设置",
      general: "通用",
      sync: "同步",
      data_backup: "数据与备份",
      settings_desc: "让 iSnips 更顺手，也让数据始终在你掌控中。",
      general_desc: "显示与剪藏偏好",
      language: "语言",
      language_desc: "界面显示语言",
      appearance: "外观",
      appearance_desc: "选择喜欢的主题",
      system: "跟随系统",
      light: "浅色",
      dark: "深色",
      columns: "片段库列数",
      columns_desc: "宽屏时使用",
      shortcuts: "键盘快捷键",
      manage: "管理",
      blocked_sites: "停用网站",
      blocked_desc: "在这些域名上停用剪藏与高亮",
      domain_placeholder: "example.com",
      add: "添加",
      sync_desc: "需要时再连接云端服务",
      sync_method: "同步方式",
      sync_method_desc: "开启同步前，记录仅保存在本机",
      off: "关闭",
      webdav_url: "WebDAV 地址（HTTPS）",
      username: "用户名",
      password: "密码",
      save_connection: "保存连接",
      disconnect: "断开连接",
      auto_sync: "自动同步",
      auto_sync_desc: "Chrome 运行时执行",
      every_30m: "每 30 分钟",
      every_1h: "每小时",
      daily: "每天",
      sync_now: "立即同步",
      backup_desc: "留一份副本，需要时可以恢复",
      auto_backup: "自动本地备份",
      backup_local_desc: "快照保存在当前浏览器配置中",
      create_backup: "创建快照",
      back_up_now: "立即备份",
      restore_snapshot: "恢复快照",
      restore_desc: "将替换当前本机记录",
      restore: "恢复",
      portable_backup: "可携带备份",
      portable_desc: "JSON 文件包含记录、高亮、空间和配置",
      export: "导出",
      import: "导入",
      clear_local: "清除本机数据",
      clear_desc: "删除此浏览器中的记录与配置",
      clear_data: "清除数据",
      privacy_note:
        "WebDAV 与 Google Drive 同步为可选功能。导出文件可能包含连接凭据，请妥善保管。",
      item_count: "{0} 条记录",
      copied: "已复制到剪贴板",
      copy: "复制",
      sponsor: "赞助 iSnips",
      saved: "已保存",
      updated: "修改已保存",
      moved_to_trash: "已移至回收站",
      restored: "已恢复",
      operation_failed: "操作失败：{0}",
      empty_note: "请先输入内容",
      no_recent: "还没有记录，从一条闪记开始吧。",
      note: "闪记",
      clip: "摘录",
      no_source: "无来源",
      edit: "编辑",
      delete: "移至回收站",
      restore_action: "恢复",
      confirm_delete: "将这条记录移至回收站？",
      confirm_empty: "永久删除回收站中的全部记录？",
      confirm_restore: "恢复此快照？当前本机记录将被替换。",
      confirm_import: "导入此备份？同 ID 记录将更新，其他记录保留。",
      confirm_clear: "清除全部本机记录、配置与备份？此操作不可撤销。",
      invalid_domain: "请输入不带路径的有效域名",
      invalid_url: "请输入有效的 HTTPS WebDAV 地址",
      not_configured: "请先选择同步方式",
      never_synced: "尚未同步",
      never_backed_up: "尚无本地快照",
      last_synced: "上次同步：{0}",
      last_backed_up: "上次备份：{0}",
      snapshot_empty: "暂无快照",
      backup_created: "已创建本地快照",
      backup_restored: "快照已恢复",
      export_ready: "备份文件已下载",
      imported: "已导入 {0} 条记录",
      cleared: "本机数据已清除",
      drive_ready: "已选择 Google Drive，点击“立即同步”连接。",
      drive_disconnected: "已断开 Google Drive",
      result_count: "{0} 条结果",
      create_note: "新建闪记",
      save: "保存",
      unknown_error: "未知错误",
    },
    ja: {
      library: "ライブラリ",
      settings: "設定",
      your_space: "あなたのスペース",
      capture_thought: "大切なことを残そう。",
      panel_desc: "メモとウェブの引用を、いつでも手元に。",
      quick_note: "クイックメモ",
      note_placeholder: "今、何を考えていますか？",
      attach_page: "現在のページを添付",
      save_note: "メモを保存",
      recent: "最近の記録",
      view_all: "すべて見る →",
      saved_items: "件の記録",
      to_clip: "選択テキストを保存",
      workspace: "ワークスペース",
      all_items: "すべて",
      clips: "引用",
      notes: "メモ",
      trash: "ゴミ箱",
      local_first: "あなたの記録はあなたのもの。",
      search_placeholder: "記録を検索",
      new_note: "+ 新しいメモ",
      library_eyebrow: "知識をひとつの場所に",
      library_desc: "残したいものを、ここに。",
      empty_trash: "ゴミ箱を空にする",
      newest: "新しい順",
      oldest: "古い順",
      nothing_here: "まだ記録がありません",
      empty_desc: "メモを書くか、ページのテキストを保存しましょう。",
      make_it_yours: "自分らしく",
      edit_item: "記録を編集",
      cancel: "キャンセル",
      save_changes: "変更を保存",
      back_to_library: "← ライブラリ",
      preferences: "環境設定",
      general: "一般",
      sync: "同期",
      data_backup: "データとバックアップ",
      settings_desc: "iSnips を使いやすく、データを自分で管理。",
      general_desc: "表示と保存の設定",
      language: "言語",
      language_desc: "表示言語",
      appearance: "外観",
      appearance_desc: "テーマを選択",
      system: "システム",
      light: "ライト",
      dark: "ダーク",
      columns: "列数",
      columns_desc: "広い画面で使用",
      shortcuts: "ショートカット",
      manage: "管理",
      blocked_sites: "無効なサイト",
      blocked_desc: "このドメインでは保存とハイライトを無効にします",
      domain_placeholder: "example.com",
      add: "追加",
      sync_desc: "必要なときだけサービスに接続",
      sync_method: "同期方法",
      sync_method_desc: "同期を有効にするまでローカル保存",
      off: "オフ",
      webdav_url: "WebDAV URL（HTTPS）",
      username: "ユーザー名",
      password: "パスワード",
      save_connection: "接続を保存",
      disconnect: "切断",
      auto_sync: "自動同期",
      auto_sync_desc: "Chrome の起動中に実行",
      every_30m: "30分ごと",
      every_1h: "1時間ごと",
      daily: "毎日",
      sync_now: "今すぐ同期",
      backup_desc: "コピーを保存し、必要なときに復元",
      auto_backup: "自動ローカルバックアップ",
      backup_local_desc: "このブラウザに保存されます",
      create_backup: "スナップショット作成",
      back_up_now: "今すぐバックアップ",
      restore_snapshot: "スナップショットを復元",
      restore_desc: "現在のローカル記録を置き換えます",
      restore: "復元",
      portable_backup: "持ち運べるバックアップ",
      portable_desc: "記録・ハイライト・スペース・設定を含む JSON",
      export: "エクスポート",
      import: "インポート",
      clear_local: "ローカルデータを消去",
      clear_desc: "このブラウザの記録と設定を削除",
      clear_data: "データを消去",
      privacy_note:
        "WebDAV と Google Drive の同期は任意です。エクスポートには認証情報が含まれる場合があります。",
      item_count: "{0} 件",
      copied: "コピーしました",
      copy: "コピー",
      sponsor: "iSnips を支援",
      saved: "保存しました",
      updated: "変更を保存しました",
      moved_to_trash: "ゴミ箱に移動しました",
      restored: "復元しました",
      operation_failed: "操作に失敗しました: {0}",
      empty_note: "内容を入力してください",
      no_recent: "まだ記録がありません。メモから始めましょう。",
      note: "メモ",
      clip: "引用",
      no_source: "出典なし",
      edit: "編集",
      delete: "ゴミ箱に移動",
      restore_action: "復元",
      confirm_delete: "この記録をゴミ箱に移動しますか？",
      confirm_empty: "ゴミ箱の記録を完全に削除しますか？",
      confirm_restore:
        "このスナップショットを復元しますか？現在の記録は置き換えられます。",
      confirm_import:
        "バックアップをインポートしますか？同じ ID は更新されます。",
      confirm_clear: "ローカルの記録・設定・バックアップをすべて消去しますか？",
      invalid_domain: "パスを含まない有効なドメインを入力してください",
      invalid_url: "有効な HTTPS WebDAV URL を入力してください",
      not_configured: "先に同期方法を選んでください",
      never_synced: "未同期",
      never_backed_up: "バックアップなし",
      last_synced: "最終同期: {0}",
      last_backed_up: "最終バックアップ: {0}",
      snapshot_empty: "スナップショットなし",
      backup_created: "バックアップを作成しました",
      backup_restored: "復元しました",
      export_ready: "バックアップをダウンロードしました",
      imported: "{0} 件をインポートしました",
      cleared: "ローカルデータを消去しました",
      drive_ready: "Google Drive を選択しました。今すぐ同期で接続できます。",
      drive_disconnected: "Google Drive を切断しました",
      result_count: "{0} 件",
      create_note: "新しいメモ",
      save: "保存",
      unknown_error: "不明なエラー",
    },
  };

  let language = "en";
  let toastTimer;
  function t(key, ...values) {
    let value =
      (strings[language] && strings[language][key]) || strings.en[key] || key;
    values.forEach((part, index) => {
      value = value.replace("{" + index + "}", String(part));
    });
    return value;
  }
  function translate() {
    document.documentElement.lang = language;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.title = t(el.dataset.i18nTitle);
      el.setAttribute("aria-label", t(el.dataset.i18nTitle));
    });
  }
  function toast(message, error = false) {
    const el = $("toast");
    el.textContent = message;
    el.classList.toggle("error", error);
    el.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("visible"), 4000);
  }
  async function request(action, data = {}) {
    const response = await chrome.runtime.sendMessage({ action, ...data });
    if (!response || !response.success)
      throw new Error(
        response && response.error ? response.error : t("unknown_error"),
      );
    return response;
  }
  async function setting(key, fallback) {
    const result = await request("getSetting", { key, defaultValue: fallback });
    return result.value == null ? fallback : result.value;
  }
  async function saveSetting(key, value) {
    await request("setSetting", { key, value });
  }
  function formatDate(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime())
      ? new Intl.DateTimeFormat(
          language === "zh-CN"
            ? "zh-CN"
            : language === "ja"
              ? "ja-JP"
              : "en-US",
          { year: "numeric", month: "short", day: "numeric" },
        ).format(date)
      : "—";
  }
  function captureError(error) {
    toast(
      t(
        "operation_failed",
        error && error.message ? error.message : t("unknown_error"),
      ),
      true,
    );
  }
  function openLibrary() {
    chrome.tabs.create({ url: chrome.runtime.getURL("library.html") });
  }
  function openSettings() {
    chrome.runtime.openOptionsPage();
  }
  function applyTheme(mode) {
    const dark =
      mode === "dark" ||
      (mode === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }
  function make(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content != null) element.textContent = String(content);
    return element;
  }
  function validPageUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }
  function itemLabel(card) {
    return card.type === "web" || card.type === "clip" ? t("clip") : t("note");
  }
  async function initCommon() {
    try {
      language = await setting("language", "en");
    } catch {
      language = "en";
    }
    if (!strings[language]) language = "en";
    translate();
    try {
      applyTheme(await setting("appearance", "auto"));
    } catch {
      applyTheme("auto");
    }
    matchMedia("(prefers-color-scheme: dark)").addEventListener(
      "change",
      async () => {
        try {
          applyTheme(await setting("appearance", "auto"));
        } catch {
          /* keep current theme */
        }
      },
    );
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes.appearance) applyTheme(changes.appearance.newValue || "auto");
      if (changes.language && strings[changes.language.newValue]) {
        language = changes.language.newValue;
        translate();
        if (page === "library") renderLibrary();
        if (page === "panel") void loadPanel();
      }
      if (changes.columnCount && page === "library") {
        const count = Number(changes.columnCount.newValue);
        $("libraryGrid").style.setProperty(
          "--columns",
          String(Math.min(5, Math.max(2, Number.isFinite(count) ? count : 3))),
        );
      }
    });
  }

  async function initPanel() {
    let editingRecentCard = null;
    const editor = $("panelEditorDialog");
    const editorText = $("panelEditorText");
    const showRecentEditor = (card) => {
      editingRecentCard = card;
      editorText.value = card.text || "";
      editor.showModal();
      editorText.focus();
    };
    $("panelCloseEditor").addEventListener("click", () => editor.close());
    $("panelCancelEditor").addEventListener("click", () => editor.close());
    $("panelEditorForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = editorText.value.trim();
      if (!text) {
        toast(t("empty_note"), true);
        editorText.focus();
        return;
      }
      const card = editingRecentCard;
      if (!card) return;
      const save = $("panelSaveEditor");
      save.disabled = true;
      try {
        await request("updateSnippet", {
          cardId: card.id,
          updates: { text },
        });
        editor.close();
        toast(t("updated"));
        await loadPanel();
      } catch (error) {
        captureError(error);
      } finally {
        save.disabled = false;
      }
    });
    $("recentList").addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const card = recentCards.find(
        (entry) => String(entry.id) === button.dataset.id,
      );
      if (!card) return;
      if (button.dataset.action === "edit") {
        showRecentEditor(card);
        return;
      }
      if (button.dataset.action === "delete" && !confirm(t("confirm_delete")))
        return;
      button.disabled = true;
      try {
        if (button.dataset.action === "copy") {
          await navigator.clipboard.writeText(card.text || "");
          toast(t("copied"));
        } else if (button.dataset.action === "delete") {
          await request("softDeleteSnippet", { cardId: card.id });
          toast(t("moved_to_trash"));
          await loadPanel();
        }
      } catch (error) {
        captureError(error);
      } finally {
        button.disabled = false;
      }
    });
    $("openLibrary").addEventListener("click", openLibrary);
    $("viewAll").addEventListener("click", openLibrary);
    $("openSettings").addEventListener("click", openSettings);
    const input = $("noteInput");
    input.addEventListener("input", () => {
      $("noteCount").textContent = String(input.value.length);
    });
    $("saveNote").addEventListener("click", async () => {
      const text = input.value.trim();
      if (!text) {
        toast(t("empty_note"), true);
        input.focus();
        return;
      }
      const button = $("saveNote");
      button.disabled = true;
      try {
        let url = null,
          domain = null;
        if ($("attachPage").checked) {
          const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          const tab = tabs && tabs[0];
          if (tab && validPageUrl(tab.url)) {
            url = tab.url;
            domain = new URL(url).hostname;
          }
        }
        const now = Date.now();
        await request("saveSnippet", {
          data: {
            type: "note",
            text,
            url,
            domain,
            created_at: now,
            updated_at: now,
            deleted_at: null,
            purged_at: null,
          },
        });
        input.value = "";
        $("noteCount").textContent = "0";
        toast(t("saved"));
        await loadPanel();
      } catch (error) {
        captureError(error);
      } finally {
        button.disabled = false;
      }
    });
    try {
      const commands = await chrome.commands.getAll();
      const command = commands.find(
        (entry) => entry.name === "capture-snippet",
      );
      $("shortcutHint").textContent =
        command && command.shortcut ? command.shortcut : "Alt+C";
    } catch {
      /* use displayed default */
    }
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === "cardSaved" || message.action === "backupRestored")
        void loadPanel();
    });
    await loadPanel();
  }
  let recentCards = [];
  async function loadPanel() {
    try {
      const result = await request("getSnippets");
      const cards = (result.cards || []).sort(
        (a, b) => cardDate(b) - cardDate(a),
      );
      recentCards = cards.slice(0, 6);
      $("panelCount").textContent = String(cards.length);
      const list = $("recentList");
      list.replaceChildren();
      if (!cards.length) {
        list.appendChild(make("div", "empty-state", t("no_recent")));
        return;
      }
      recentCards.forEach((card) => {
        const item = make("article", "recent-item");
        item.appendChild(make("div", "item-text", card.text || ""));
        const meta = make("div", "item-meta");
        meta.appendChild(make("span", "item-type", itemLabel(card)));
        if (card.domain)
          meta.appendChild(make("span", "item-source", card.domain));
        meta.appendChild(make("time", "item-date", formatDate(cardDate(card))));
        item.appendChild(meta);
        const actions = make("div", "card-actions");
        for (const [key, label] of [
          ["copy", t("copy")],
          ["edit", t("edit")],
          ["delete", t("delete")],
        ]) {
          const button = make(
            "button",
            "card-action" + (key === "delete" ? " danger" : ""),
            label,
          );
          button.type = "button";
          button.dataset.action = key;
          button.dataset.id = String(card.id);
          actions.appendChild(button);
        }
        item.appendChild(actions);
        list.appendChild(item);
      });
    } catch (error) {
      captureError(error);
    }
  }

  let allCards = [],
    deletedCards = [],
    currentFilter = "all",
    search = "",
    sort = "new",
    editingCard = null;
  function cardDate(card) {
    return Number(card.updated_at || card.created_at || 0);
  }
  async function loadLibrary() {
    try {
      const [active, trash] = await Promise.all([
        request("getSnippets"),
        request("getDeletedSnippets"),
      ]);
      allCards = active.cards || [];
      deletedCards = trash.cards || [];
      renderLibrary();
    } catch (error) {
      captureError(error);
    }
  }
  function renderLibrary() {
    const counts = {
      all: allCards.length,
      web: allCards.filter((c) => c.type === "web" || c.type === "clip").length,
      note: allCards.filter((c) => c.type !== "web" && c.type !== "clip")
        .length,
      trash: deletedCards.length,
    };
    $("countAll").textContent = String(counts.all);
    $("countWeb").textContent = String(counts.web);
    $("countNote").textContent = String(counts.note);
    $("countTrash").textContent = String(counts.trash);
    document
      .querySelectorAll("[data-filter]")
      .forEach((button) =>
        button.classList.toggle(
          "active",
          button.dataset.filter === currentFilter,
        ),
      );
    $("pageTitle").textContent = t(
      currentFilter === "all"
        ? "all_items"
        : currentFilter === "web"
          ? "clips"
          : currentFilter === "note"
            ? "notes"
            : "trash",
    );
    $("emptyTrash").classList.toggle(
      "hidden",
      currentFilter !== "trash" || !deletedCards.length,
    );
    let cards = currentFilter === "trash" ? [...deletedCards] : [...allCards];
    if (currentFilter === "web")
      cards = cards.filter((c) => c.type === "web" || c.type === "clip");
    if (currentFilter === "note")
      cards = cards.filter((c) => c.type !== "web" && c.type !== "clip");
    if (search)
      cards = cards.filter((c) =>
        [c.text, c.domain, c.title].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(search),
        ),
      );
    cards.sort(
      (a, b) => (sort === "new" ? -1 : 1) * (cardDate(a) - cardDate(b)),
    );
    $("resultCount").textContent = t("result_count", cards.length);
    $("emptyState").classList.toggle("hidden", Boolean(cards.length));
    const grid = $("libraryGrid");
    grid.replaceChildren();
    cards.forEach((card) => {
      const item = make("article", "snippet-card");
      item.appendChild(make("div", "item-text", card.text || ""));
      const meta = make("div", "item-meta");
      meta.append(make("span", "item-type", itemLabel(card)));
      if (card.url && validPageUrl(card.url) && currentFilter !== "trash") {
        const link = make(
          "button",
          "text-button item-source",
          card.domain || new URL(card.url).hostname,
        );
        link.type = "button";
        link.title = card.url;
        link.addEventListener("click", () =>
          chrome.tabs.create({ url: card.url }),
        );
        meta.appendChild(link);
      } else if (card.domain)
        meta.appendChild(make("span", "item-source", card.domain));
      meta.appendChild(
        make(
          "time",
          "item-date",
          formatDate(
            currentFilter === "trash" ? card.deleted_at : cardDate(card),
          ),
        ),
      );
      item.appendChild(meta);
      const actions = make("div", "card-actions");
      item.appendChild(actions);
      function action(label, handler, danger = false) {
        const button = make(
          "button",
          "card-action" + (danger ? " danger" : ""),
          label,
        );
        button.type = "button";
        button.addEventListener("click", handler);
        actions.appendChild(button);
      }
      if (currentFilter === "trash") {
        action(t("restore_action"), async () => {
          try {
            await request("restoreSnippet", { cardId: card.id });
            toast(t("restored"));
            await loadLibrary();
          } catch (error) {
            captureError(error);
          }
        });
      } else {
        action(t("copy"), async () => {
          try {
            await navigator.clipboard.writeText(card.text || "");
            toast(t("copied"));
          } catch (error) {
            captureError(error);
          }
        });
        action(t("edit"), () => showEditor(card));
        action(
          t("delete"),
          async () => {
            if (!confirm(t("confirm_delete"))) return;
            try {
              await request("softDeleteSnippet", { cardId: card.id });
              toast(t("moved_to_trash"));
              await loadLibrary();
            } catch (error) {
              captureError(error);
            }
          },
          true,
        );
      }
      grid.appendChild(item);
    });
  }
  function showEditor(card = null) {
    editingCard = card;
    $("editorTitle").textContent = t(card ? "edit_item" : "create_note");
    $("saveEditor").textContent = t(card ? "save_changes" : "save");
    $("editorText").value = card ? card.text || "" : "";
    $("editorDialog").showModal();
    $("editorText").focus();
  }
  async function initLibrary() {
    $("librarySettings").addEventListener("click", openSettings);
    $("newNote").addEventListener("click", () => showEditor());
    $("searchInput").addEventListener("input", (event) => {
      search = event.target.value.trim().toLowerCase();
      renderLibrary();
    });
    $("sortSelect").addEventListener("change", (event) => {
      sort = event.target.value;
      renderLibrary();
    });
    $("filters").addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (button) {
        currentFilter = button.dataset.filter;
        renderLibrary();
      }
    });
    $("closeEditor").addEventListener("click", () => $("editorDialog").close());
    $("cancelEditor").addEventListener("click", () =>
      $("editorDialog").close(),
    );
    $("editorForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = $("editorText").value.trim();
      if (!text) {
        toast(t("empty_note"), true);
        return;
      }
      $("saveEditor").disabled = true;
      try {
        if (editingCard)
          await request("updateSnippet", {
            cardId: editingCard.id,
            updates: { text },
          });
        else {
          const now = Date.now();
          await request("saveSnippet", {
            data: {
              type: "note",
              text,
              url: null,
              domain: null,
              created_at: now,
              updated_at: now,
              deleted_at: null,
              purged_at: null,
            },
          });
        }
        $("editorDialog").close();
        toast(t(editingCard ? "updated" : "saved"));
        await loadLibrary();
      } catch (error) {
        captureError(error);
      } finally {
        $("saveEditor").disabled = false;
      }
    });
    $("emptyTrash").addEventListener("click", async () => {
      if (!confirm(t("confirm_empty"))) return;
      try {
        await request("emptyTrash");
        await loadLibrary();
        toast(t("cleared"));
      } catch (error) {
        captureError(error);
      }
    });
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === "cardSaved" || message.action === "backupRestored")
        void loadLibrary();
    });
    try {
      const count = Number(await setting("columnCount", 3));
      $("libraryGrid").style.setProperty(
        "--columns",
        String(Math.min(5, Math.max(2, Number.isFinite(count) ? count : 3))),
      );
    } catch {
      /* CSS default */
    }
    await loadLibrary();
  }

  let syncConfig = {},
    blockedSites = [];
  function showSyncFields() {
    const method = $("syncMethod").value;
    $("webdavFields").classList.toggle("hidden", method !== "webdav");
    $("driveFields").classList.toggle("hidden", method !== "googledrive");
    let webdavReady = method !== "webdav";
    if (method === "webdav") {
      try {
        const url = new URL(syncConfig.url);
        webdavReady =
          url.protocol === "https:" ||
          (url.protocol === "http:" &&
            ["localhost", "127.0.0.1"].includes(url.hostname));
      } catch {
        webdavReady = false;
      }
    }
    $("autoSync").disabled = method === "none" || !webdavReady;
    $("syncNow").disabled = method === "none" || !webdavReady;
    if (method === "googledrive")
      $("driveStatus").textContent = t("drive_ready");
  }
  async function updateSync(patch) {
    syncConfig = { ...syncConfig, ...patch };
    await saveSetting("syncConfig", syncConfig);
  }
  function renderBlocked() {
    const list = $("blockedList");
    list.replaceChildren();
    blockedSites.forEach((domain) => {
      const chip = make("span", "chip", domain);
      const remove = make("button", "", "×");
      remove.type = "button";
      remove.title = t("delete");
      remove.addEventListener("click", async () => {
        try {
          blockedSites = blockedSites.filter((value) => value !== domain);
          await saveSetting("blockedSites", blockedSites);
          renderBlocked();
        } catch (error) {
          captureError(error);
        }
      });
      chip.appendChild(remove);
      list.appendChild(chip);
    });
  }
  function updateDates(lastSync, lastBackup) {
    $("lastSync").textContent = lastSync
      ? t("last_synced", formatDate(lastSync))
      : t("never_synced");
    $("lastBackup").textContent = lastBackup
      ? t("last_backed_up", formatDate(lastBackup))
      : t("never_backed_up");
  }
  async function loadSnapshots() {
    const result = await request("listBackupSnapshots", { limit: 20 });
    const select = $("backupSelect");
    select.replaceChildren();
    const snapshots = result.snapshots || [];
    if (!snapshots.length)
      select.appendChild(new Option(t("snapshot_empty"), ""));
    snapshots.forEach((snapshot) =>
      select.appendChild(
        new Option(
          formatDate(snapshot.createdAt) +
            " · " +
            t("item_count", snapshot.snippetCount),
          snapshot.id,
        ),
      ),
    );
    $("restoreBackup").disabled = !snapshots.length;
  }
  async function initSettings() {
    $("backToLibrary").addEventListener("click", openLibrary);
    const [appearance, columns, blocked, config, lastSync, lastBackup] =
      await Promise.all([
        setting("appearance", "auto"),
        setting("columnCount", 5),
        setting("blockedSites", []),
        setting("syncConfig", { type: "none" }),
        setting("lastSyncTime", null),
        setting("lastBackupTime", null),
      ]);
    $("language").value = language;
    $("appearance").value = appearance;
    $("columnCount").value = String(columns);
    blockedSites = Array.isArray(blocked) ? blocked : [];
    syncConfig =
      config && typeof config === "object" ? config : { type: "none" };
    $("syncMethod").value = syncConfig.type || "none";
    $("autoSync").value = syncConfig.autoSyncInterval || "off";
    $("autoBackup").value = syncConfig.autoBackupInterval || "off";
    $("webdavUrl").value = syncConfig.url || "";
    $("webdavUser").value = syncConfig.username || "";
    $("webdavPass").value = syncConfig.password || "";
    showSyncFields();
    renderBlocked();
    updateDates(lastSync, lastBackup);
    await loadSnapshots();
    $("language").addEventListener("change", async (event) => {
      try {
        language = event.target.value;
        await saveSetting("language", language);
        translate();
        renderBlocked();
        showSyncFields();
        await loadSnapshots();
        updateDates(
          await setting("lastSyncTime", null),
          await setting("lastBackupTime", null),
        );
        toast(t("saved"));
      } catch (error) {
        captureError(error);
      }
    });
    $("appearance").addEventListener("change", async (event) => {
      try {
        await saveSetting("appearance", event.target.value);
        applyTheme(event.target.value);
        toast(t("saved"));
      } catch (error) {
        captureError(error);
      }
    });
    $("columnCount").addEventListener("change", async (event) => {
      try {
        await saveSetting("columnCount", Number(event.target.value));
        toast(t("saved"));
      } catch (error) {
        captureError(error);
      }
    });
    $("manageShortcuts").addEventListener("click", () =>
      chrome.tabs.create({ url: "chrome://extensions/shortcuts" }),
    );
    $("addBlocked").addEventListener("click", async () => {
      const value = $("blockedDomain").value.trim().toLowerCase();
      if (
        !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(value) &&
        value !== "localhost"
      ) {
        toast(t("invalid_domain"), true);
        return;
      }
      try {
        blockedSites = [...new Set([...blockedSites, value])];
        await saveSetting("blockedSites", blockedSites);
        $("blockedDomain").value = "";
        renderBlocked();
        toast(t("saved"));
      } catch (error) {
        captureError(error);
      }
    });
    $("syncMethod").addEventListener("change", async (event) => {
      try {
        await updateSync({ type: event.target.value });
        showSyncFields();
        toast(t("saved"));
      } catch (error) {
        captureError(error);
      }
    });
    $("saveWebdav").addEventListener("click", async () => {
      const url = $("webdavUrl").value.trim();
      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        toast(t("invalid_url"), true);
        return;
      }
      if (
        parsed.protocol !== "https:" &&
        !(
          parsed.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(parsed.hostname)
        )
      ) {
        toast(t("invalid_url"), true);
        return;
      }
      try {
        await updateSync({
          type: "webdav",
          url,
          username: $("webdavUser").value,
          password: $("webdavPass").value,
        });
        showSyncFields();
        toast(t("saved"));
      } catch (error) {
        captureError(error);
      }
    });
    $("autoSync").addEventListener("change", async (event) => {
      try {
        await updateSync({ autoSyncInterval: event.target.value });
        toast(t("saved"));
      } catch (error) {
        captureError(error);
      }
    });
    $("autoBackup").addEventListener("change", async (event) => {
      try {
        await updateSync({ autoBackupInterval: event.target.value });
        toast(t("saved"));
      } catch (error) {
        captureError(error);
      }
    });
    $("syncNow").addEventListener("click", async () => {
      const method = $("syncMethod").value;
      if (method === "none") {
        toast(t("not_configured"), true);
        return;
      }
      const button = $("syncNow");
      button.disabled = true;
      try {
        const result = await request(
          method === "webdav" ? "syncWebDAV" : "syncGoogleDrive",
        );
        updateDates(result.lastSyncTime, await setting("lastBackupTime", null));
        toast(t("saved"));
      } catch (error) {
        captureError(error);
      } finally {
        button.disabled = false;
      }
    });
    $("disconnectDrive").addEventListener("click", async () => {
      try {
        await chrome.identity.clearAllCachedAuthTokens();
        await updateSync({ type: "none" });
        $("syncMethod").value = "none";
        showSyncFields();
        toast(t("drive_disconnected"));
      } catch (error) {
        captureError(error);
      }
    });
    $("backupNow").addEventListener("click", async () => {
      const button = $("backupNow");
      button.disabled = true;
      try {
        const result = await request("createBackup", { source: "manual" });
        updateDates(await setting("lastSyncTime", null), result.lastBackupTime);
        await loadSnapshots();
        toast(t("backup_created"));
      } catch (error) {
        captureError(error);
      } finally {
        button.disabled = false;
      }
    });
    $("restoreBackup").addEventListener("click", async () => {
      const id = $("backupSelect").value;
      if (!id || !confirm(t("confirm_restore"))) return;
      try {
        await request("restoreBackupSnapshot", { snapshotId: id });
        toast(t("backup_restored"));
        location.reload();
      } catch (error) {
        captureError(error);
      }
    });
    $("exportData").addEventListener("click", async () => {
      try {
        const result = await request("getExportData");
        const blob = new Blob([JSON.stringify(result.bundle, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const anchor = make("a");
        anchor.href = url;
        anchor.download =
          "isnips-backup-" + new Date().toISOString().slice(0, 10) + ".json";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        toast(t("export_ready"));
      } catch (error) {
        captureError(error);
      }
    });
    $("importData").addEventListener("click", () => $("importFile").click());
    $("importFile").addEventListener("change", async (event) => {
      const file = event.target.files && event.target.files[0];
      event.target.value = "";
      if (!file) return;
      try {
        const bundle = JSON.parse(await file.text());
        if (!confirm(t("confirm_import"))) return;
        const result = await request("importData", { bundle });
        toast(t("imported", result.importedCount));
        setTimeout(() => location.reload(), 900);
      } catch (error) {
        captureError(error);
      }
    });
    $("clearData").addEventListener("click", async () => {
      if (!confirm(t("confirm_clear"))) return;
      try {
        await request("clearAllData");
        toast(t("cleared"));
        location.reload();
      } catch (error) {
        captureError(error);
      }
    });
    try {
      const commands = await chrome.commands.getAll();
      $("shortcutSummary").textContent =
        commands
          .map((c) => c.shortcut)
          .filter(Boolean)
          .join(" · ") || "—";
    } catch {
      /* keep default */
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await initCommon();
      if (page === "panel") await initPanel();
      else if (page === "library") await initLibrary();
      else if (page === "settings") await initSettings();
    } catch (error) {
      captureError(error);
    }
  });
})();
