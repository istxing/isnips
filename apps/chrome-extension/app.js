(() => {
  "use strict";

  const COLUMN_COUNT_DEFAULT = 5;
  const COLUMN_COUNT_MIN = 3;
  const COLUMN_COUNT_MAX = 7;
  const LIBRARY_PAGE_SIZE = 200;
  const LIBRARY_VIEWS = ["day", "week", "month", "all"];
  const page = document.body.dataset.page;
  const $ = (id) => document.getElementById(id);
  const strings = {
    en: {
      clipboard_consent_title: "Auto-save webpage copies",
      clipboard_consent_body: "Save text you copy or cut on web pages, with the page address and title. Keep up to 99 entries on this device, outside sync and backups. Pause it anytime in Clipboard.",
      clipboard_consent_scope: "Does not read the system clipboard, other apps or password fields.",
      clipboard_consent_accept: "Agree and enable",
      clipboard_consent_decline: "Not now",
      clipboard_consent_required: "Confirm whether to enable auto-save first.",
      library_view: "View",
      view_day: "Day",
      view_week: "Week",
      view_month: "Month",
      view_summary: "All",
      drive_connect: "Connect",
      drive_connected: "Connected",
      drive_not_connected: "Not connected",
      drive_web_setup: "Web connection is not configured yet.",
      drive_reconnect: "Reconnect Google Drive.",
      drive_auth_canceled: "Connection canceled.",
      drive_invalid_auth: "Could not verify the connection. Try again.",
      drive_no_scope: "Allow access to the sync file.",
      drive_unavailable: "Web connection is unavailable.",
      drive_create_confirm:
        "No accessible sync library was found. Create one in this Google account? Cancel if you already have a library.",
      drive_create_required:
        "Check the account and access to your existing sync file.",

      folders: "Folders",
      folder: "Folder",
      create_folder: "New folder",
      manage_folder: "Manage folder",
      rename_folder: "Rename folder",
      delete_folder: "Delete folder",
      folder_name: "Folder name",
      folder_delete_confirm: "Delete this folder? Its records will be kept.",
      folder_created: "Folder created",
      folder_updated: "Folder updated",
      folder_deleted: "Folder deleted",
      move_to: "Move to folder",
      moved: "Moved",
      no_folder: "Unfiled",
      unavailable_folder: "Previous folder",
      previous_page: "Previous",
      next_page: "Next",
      page_status: "Page {0} of {1}",

      clipboard: "Clipboard",
      clipboard_auto: "Auto-save copies",
      clipboard_hint: "Last 99 copies, on this device. Save as a note to keep.",
      clipboard_empty: "No clipboard history",
      clipboard_empty_desc: "Copy text on a web page to see it here.",
      clipboard_paused_desc: "Enable auto-save, then copy text on a web page.",
      clipboard_promote: "Save as note",
      clipboard_saved: "Saved as note",
      clipboard_clear: "Clear history",
      clipboard_confirm: "Clear clipboard history?",
      clipboard_deleted: "Removed",
      clipboard_delete: "Remove",

      library: "Library",
      settings: "Settings",
      your_space: "YOUR SPACE",
      capture_thought: "Capture what matters.",
      panel_desc: "Your notes and web highlights, always within reach.",
      quick_note: "Quick note",
      note_placeholder: "Write a thought…",
      attach_page: "Attach page",
      save_note: "Save note",
      recent: "Recent",
      view_all: "View all",
      saved_items: "items",
      to_clip: "to save",
      workspace: "WORKSPACE",
      all_items: "All items",
      clips: "Clips",
      notes: "Notes",
      trash: "Trash",
      local_first: "Your space, on your terms.",
      search_placeholder: "Search",
      new_note: "Note",
      library_eyebrow: "YOUR KNOWLEDGE, ORGANIZED",
      library_desc: "Everything worth keeping, in one place.",
      empty_trash: "Empty trash",
      newest: "Newest first",
      oldest: "Oldest first",
      nothing_here: "No items yet",
      empty_desc: "Create a note or clip text from a page.",
      make_it_yours: "MAKE IT YOURS",
      edit_item: "Edit",
      cancel: "Cancel",
      save_changes: "Save",
      back_to_library: "Library",
      preferences: "PREFERENCES",
      general: "General",
      sync: "Sync",
      data_backup: "Data",
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
      columns_desc: "Adapts to window width",
      shortcuts: "Shortcuts",
      manage: "Manage",
      blocked_sites: "Blocked sites",
      blocked_desc:
        "Disable clipping and highlights on these domains and subdomains.",
      domain_placeholder: "example.com",
      add: "Add",
      sync_desc: "Connect a service only when you choose",
      sync_method: "Service",
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
      every_1h: "Hourly",
      daily: "Daily",
      sync_now: "Sync now",
      backup_desc: "Export a copy and restore when needed",
      auto_backup: "Automatic backup",
      backup_local_desc:
        "Stored in this browser. Export a file for an independent backup.",
      create_backup: "Create snapshot",
      back_up_now: "Back up now",
      restore_snapshot: "Restore snapshot",
      restore_desc: "Replaces local records. Cloud data is unchanged.",
      restore: "Restore",
      portable_backup: "Backup file",
      portable_desc: "Records, highlights and preferences. No passwords.",
      export: "Export",
      import: "Import",
      clear_local: "Clear local data",
      clear_desc:
        "Removes local records, preferences and snapshots. Cloud files remain.",
      clear_data: "Clear data",
      privacy_note:
        "Sync is optional. Exported files contain your content, but no passwords.",
      item_count: "{0} items",
      copied: "Copied to clipboard",
      copy: "Copy",
      sponsor: "Buy me a coffee",
      saved: "Saved",
      updated: "Changes saved",
      moved_to_trash: "Moved to trash",
      restored: "Restored",
      operation_failed: "Could not complete: {0}",
      empty_note: "Write something first",
      no_recent: "Your notes and clips appear here.",
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
        "Import this file? Newer records are kept. Preferences in the file will be applied.",
      confirm_clear:
        "Clear local records, preferences and snapshots? This cannot be undone. Cloud files remain.",
      invalid_domain: "Enter a valid domain without a path",
      invalid_url:
        "Use an HTTPS URL without a query, fragment or embedded password.",
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
      drive_disconnected: "Google Drive disconnected",
      result_count: "{0} results",
      create_note: "New note",
      save: "Save",
      unknown_error: "Unknown error",
      unknown_date: "Undated",
      loading: "Loading…",
      retry: "Try again",
      load_failed: "Could not load records",
      load_more: "Load more",
      sort: "Sort",
      undo: "Undo",
      read_item: "Read item",
      close: "Close",
      no_results: "No matches",
      no_results_desc: "Try another search.",
      trash_empty: "Trash is empty",
      trash_hint: "Restore an item, or empty trash to remove it permanently.",
      discard_changes: "Discard unsaved changes?",
      saving: "Saving…",
      syncing: "Syncing…",
      synced: "Synced",
      working: "Working…",
      privacy_policy: "Privacy",
      feedback: "Feedback",
      local_snapshots: "Local snapshots",
      sync_scope:
        "Records and folders sync. Highlights and preferences stay on this device.",
      remove_site: "Remove {0}",
      draft_failed: "Could not keep this draft. Save the note before closing.",
      file_too_large: "Choose a backup smaller than 50 MB.",
    },
    "zh-CN": {
      clipboard_consent_title: "自动记录网页复制内容",
      clipboard_consent_body: "保存你在网页复制或剪切的文字、网页地址和标题。仅存本机，最多 99 条，不参与同步和备份。可在“剪贴板”随时关闭。",
      clipboard_consent_scope: "不读取系统剪贴板、其他应用或密码输入框。",
      clipboard_consent_accept: "同意并开启",
      clipboard_consent_decline: "暂不开启",
      clipboard_consent_required: "请先确认是否开启自动记录。",
      library_view: "展示方式",
      view_day: "按天",
      view_week: "按周",
      view_month: "按月",
      view_summary: "汇总",
      drive_connect: "连接",
      drive_connected: "已连接",
      drive_not_connected: "未连接",
      drive_web_setup: "网页连接尚未配置。",
      drive_reconnect: "请重新连接 Google Drive。",
      drive_auth_canceled: "已取消连接。",
      drive_invalid_auth: "连接验证失败，请重试。",
      drive_no_scope: "请允许访问同步文件。",
      drive_unavailable: "暂时无法网页连接。",
      drive_create_confirm:
        "未找到可访问的同步库。在当前 Google 账号新建？已有旧库请先取消。",
      drive_create_required: "请检查账号及原同步文件的访问权限。",

      folders: "文件夹",
      folder: "文件夹",
      create_folder: "新建文件夹",
      manage_folder: "管理文件夹",
      rename_folder: "重命名文件夹",
      delete_folder: "删除文件夹",
      folder_name: "文件夹名称",
      folder_delete_confirm: "删除此文件夹？其中的记录会保留。",
      folder_created: "已创建文件夹",
      folder_updated: "已重命名",
      folder_deleted: "已删除文件夹",
      move_to: "移入文件夹",
      moved: "已移动",
      no_folder: "未分类",
      unavailable_folder: "原文件夹",
      previous_page: "上一页",
      next_page: "下一页",
      page_status: "第 {0} / {1} 页",

      clipboard: "剪贴板",
      clipboard_auto: "自动记录",
      clipboard_hint: "本机保留最近 99 条，转为闪记可长期保存。",
      clipboard_empty: "暂无剪贴板历史",
      clipboard_empty_desc: "复制网页文字，会显示在这里。",
      clipboard_paused_desc: "开启自动记录，复制网页文字即可。",
      clipboard_promote: "转为闪记",
      clipboard_saved: "已转为闪记",
      clipboard_clear: "清空历史",
      clipboard_confirm: "清空剪贴板历史？",
      clipboard_deleted: "已移除",
      clipboard_delete: "删除",

      library: "片段库",
      settings: "设置",
      your_space: "你的空间",
      capture_thought: "留住值得记住的。",
      panel_desc: "摘录、灵感与来源，随手可得。",
      quick_note: "闪记",
      note_placeholder: "记下此刻的想法…",
      attach_page: "附上网页",
      save_note: "保存闪记",
      recent: "最近记录",
      view_all: "查看全部",
      saved_items: "条记录",
      to_clip: "记录",
      workspace: "工作空间",
      all_items: "全部记录",
      clips: "网页摘录",
      notes: "闪记",
      trash: "回收站",
      local_first: "你的知识，由你掌握。",
      search_placeholder: "搜索",
      new_note: "闪记",
      library_eyebrow: "让有价值的内容归于一处",
      library_desc: "你想留下的，都在这里。",
      empty_trash: "清空回收站",
      newest: "最新优先",
      oldest: "最早优先",
      nothing_here: "还没有记录",
      empty_desc: "写下闪记，或从网页记录文字。",
      make_it_yours: "随时记录",
      edit_item: "编辑",
      cancel: "取消",
      save_changes: "保存",
      back_to_library: "返回片段库",
      preferences: "偏好设置",
      general: "通用",
      sync: "同步",
      data_backup: "数据",
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
      columns_desc: "窄屏自动适配",
      shortcuts: "快捷键",
      manage: "管理",
      blocked_sites: "停用网站",
      blocked_desc: "停用这些域名及其子域名的剪藏和高亮。",
      domain_placeholder: "example.com",
      add: "添加",
      sync_desc: "需要时再连接云端服务",
      sync_method: "同步服务",
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
      auto_backup: "自动备份",
      backup_local_desc: "仅保存在此浏览器，导出文件可另存一份。",
      create_backup: "创建快照",
      back_up_now: "立即备份",
      restore_snapshot: "恢复快照",
      restore_desc: "替换本机记录，不更改云端文件。",
      restore: "恢复",
      portable_backup: "备份文件",
      portable_desc: "包含记录、高亮和偏好，不含密码。",
      export: "导出",
      import: "导入",
      clear_local: "清除本机数据",
      clear_desc: "删除本机记录、偏好和快照，云端文件保留。",
      clear_data: "清除数据",
      privacy_note: "同步可选，导出文件包含记录，不含密码。",
      item_count: "{0} 条记录",
      copied: "已复制到剪贴板",
      copy: "复制",
      sponsor: "请帮我买杯咖啡",
      saved: "已保存",
      updated: "修改已保存",
      moved_to_trash: "已移至回收站",
      restored: "已恢复",
      operation_failed: "未完成：{0}",
      empty_note: "请先输入内容",
      no_recent: "闪记和网页摘录会显示在这里。",
      note: "闪记",
      clip: "摘录",
      no_source: "无来源",
      edit: "编辑",
      delete: "移至回收站",
      restore_action: "恢复",
      confirm_delete: "将这条记录移至回收站？",
      confirm_empty: "永久删除回收站中的全部记录？",
      confirm_restore: "恢复此快照？当前本机记录将被替换。",
      confirm_import:
        "导入此文件？同一记录保留较新内容，并应用文件中的偏好设置。",
      confirm_clear:
        "清除本机记录、偏好和快照？此操作无法撤销，云端文件会保留。",
      invalid_domain: "请输入不带路径的有效域名",
      invalid_url: "请填写 HTTPS 地址，不含查询参数、片段或内嵌密码。",
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
      drive_disconnected: "已断开 Google Drive",
      result_count: "{0} 条结果",
      create_note: "闪记",
      save: "保存",
      unknown_error: "未知错误",
      unknown_date: "日期未知",
      loading: "加载中…",
      retry: "重试",
      load_failed: "记录加载失败",
      load_more: "加载更多",
      sort: "排序",
      undo: "撤销",
      read_item: "阅读记录",
      close: "关闭",
      no_results: "没有找到记录",
      no_results_desc: "试试其他关键词。",
      trash_empty: "回收站为空",
      trash_hint: "可恢复记录；清空后无法撤销。",
      discard_changes: "放弃尚未保存的修改？",
      saving: "保存中…",
      syncing: "同步中…",
      synced: "同步完成",
      working: "处理中…",
      privacy_policy: "隐私",
      feedback: "反馈",
      local_snapshots: "本地快照",
      sync_scope: "同步记录和文件夹，高亮与偏好留在本机。",
      remove_site: "移除 {0}",
      draft_failed: "草稿未能保留，请保存后再关闭。",
      file_too_large: "备份文件需小于 50 MB。",
    },
    ja: {
      clipboard_consent_title: "ウェブのコピーを自動保存",
      clipboard_consent_body: "ウェブでコピー・切り取りした文字とページのURL・タイトルを、この端末に最大99件保存します。同期やバックアップには含まれず、コピー履歴でいつでも停止できます。",
      clipboard_consent_scope: "システムのクリップボード、他のアプリ、パスワード欄は読み取りません。",
      clipboard_consent_accept: "同意して有効にする",
      clipboard_consent_decline: "今は有効にしない",
      clipboard_consent_required: "自動保存を有効にするか確認してください。",
      library_view: "表示方法",
      view_day: "日別",
      view_week: "週別",
      view_month: "月別",
      view_summary: "一覧",
      drive_connect: "接続",
      drive_connected: "接続済み",
      drive_not_connected: "未接続",
      drive_web_setup: "ウェブ接続は未設定です。",
      drive_reconnect: "Google Drive に再接続してください。",
      drive_auth_canceled: "接続をキャンセルしました。",
      drive_invalid_auth: "接続を確認できません。再試行してください。",
      drive_no_scope: "同期ファイルへのアクセスを許可してください。",
      drive_unavailable: "ウェブ接続を利用できません。",
      drive_create_confirm:
        "同期ライブラリが見つかりません。この Google アカウントに新規作成しますか？既存のライブラリがある場合はキャンセルしてください。",
      drive_create_required:
        "アカウントと既存ファイルへのアクセスを確認してください。",

      folders: "フォルダ",
      folder: "フォルダ",
      create_folder: "新規フォルダ",
      manage_folder: "フォルダ管理",
      rename_folder: "名前を変更",
      delete_folder: "フォルダを削除",
      folder_name: "フォルダ名",
      folder_delete_confirm: "このフォルダを削除しますか？記録は残ります。",
      folder_created: "作成しました",
      folder_updated: "変更しました",
      folder_deleted: "削除しました",
      move_to: "フォルダに移動",
      moved: "移動しました",
      no_folder: "未分類",
      unavailable_folder: "元のフォルダ",
      previous_page: "前へ",
      next_page: "次へ",
      page_status: "{0} / {1} ページ",

      clipboard: "クリップボード",
      clipboard_auto: "コピーを自動保存",
      clipboard_hint: "この端末に最新99件を保存。メモにすると残せます。",
      clipboard_empty: "履歴はありません",
      clipboard_empty_desc: "ウェブの文章をコピーすると、ここに表示されます。",
      clipboard_paused_desc: "自動保存をオンにして、ウェブの文章をコピー。",
      clipboard_promote: "メモに保存",
      clipboard_saved: "メモに保存しました",
      clipboard_clear: "履歴を消去",
      clipboard_confirm: "コピー履歴を消去しますか？",
      clipboard_deleted: "削除しました",
      clipboard_delete: "削除",

      library: "ライブラリ",
      settings: "設定",
      your_space: "あなたのスペース",
      capture_thought: "大切なことを残そう。",
      panel_desc: "メモとウェブの引用を、いつでも手元に。",
      quick_note: "メモ",
      note_placeholder: "思いついたことを記録…",
      attach_page: "ページを添付",
      save_note: "メモを保存",
      recent: "最近の記録",
      view_all: "すべて見る",
      saved_items: "件",
      to_clip: "で保存",
      workspace: "ワークスペース",
      all_items: "すべて",
      clips: "引用",
      notes: "メモ",
      trash: "ゴミ箱",
      local_first: "あなたの記録はあなたのもの。",
      search_placeholder: "検索",
      new_note: "メモ",
      library_eyebrow: "知識をひとつの場所に",
      library_desc: "残したいものを、ここに。",
      empty_trash: "ゴミ箱を空にする",
      newest: "新しい順",
      oldest: "古い順",
      nothing_here: "まだ記録がありません",
      empty_desc: "メモを作成するか、ページのテキストを保存。",
      make_it_yours: "自分らしく",
      edit_item: "編集",
      cancel: "キャンセル",
      save_changes: "保存",
      back_to_library: "ライブラリへ",
      preferences: "環境設定",
      general: "一般",
      sync: "同期",
      data_backup: "データ",
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
      columns_desc: "画面幅に合わせて調整",
      shortcuts: "ショートカット",
      manage: "管理",
      blocked_sites: "無効なサイト",
      blocked_desc:
        "このドメインとサブドメインでは保存とハイライトを無効にします。",
      domain_placeholder: "example.com",
      add: "追加",
      sync_desc: "必要なときだけサービスに接続",
      sync_method: "サービス",
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
      auto_backup: "自動バックアップ",
      backup_local_desc:
        "このブラウザ内に保存。別途ファイルを書き出すと安心です。",
      create_backup: "スナップショット作成",
      back_up_now: "今すぐバックアップ",
      restore_snapshot: "スナップショットを復元",
      restore_desc: "ローカル記録を置き換えます。クラウドは変更しません。",
      restore: "復元",
      portable_backup: "バックアップファイル",
      portable_desc:
        "記録・ハイライト・設定を含みます。パスワードは含みません。",
      export: "エクスポート",
      import: "インポート",
      clear_local: "ローカルデータを消去",
      clear_desc:
        "ローカル記録・設定・バックアップを削除。クラウドは残ります。",
      clear_data: "データを消去",
      privacy_note: "同期は任意です。書き出しにパスワードは含まれません。",
      item_count: "{0} 件",
      copied: "コピーしました",
      copy: "コピー",
      sponsor: "コーヒーで応援",
      saved: "保存しました",
      updated: "変更を保存しました",
      moved_to_trash: "ゴミ箱に移動しました",
      restored: "復元しました",
      operation_failed: "完了できませんでした: {0}",
      empty_note: "内容を入力してください",
      no_recent: "メモとウェブの引用がここに表示されます。",
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
        "読み込みますか？新しい記録を優先し、ファイル内の設定を適用します。",
      confirm_clear:
        "ローカル記録・設定・バックアップを消去しますか？元に戻せません。クラウドは残ります。",
      invalid_domain: "パスを含まない有効なドメインを入力してください",
      invalid_url:
        "クエリ・フラグメント・認証情報のない HTTPS URL を入力してください。",
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
      drive_disconnected: "Google Drive を切断しました",
      result_count: "{0} 件",
      create_note: "新しいメモ",
      save: "保存",
      unknown_error: "不明なエラー",
      unknown_date: "日付不明",
      loading: "読み込み中…",
      retry: "再試行",
      load_failed: "記録を読み込めません",
      load_more: "もっと見る",
      sort: "並び順",
      undo: "元に戻す",
      read_item: "記録を読む",
      close: "閉じる",
      no_results: "見つかりません",
      no_results_desc: "別のキーワードを試してください。",
      trash_empty: "ゴミ箱は空です",
      trash_hint: "記録を復元できます。空にすると元に戻せません。",
      discard_changes: "保存していない変更を破棄しますか？",
      saving: "保存中…",
      syncing: "同期中…",
      synced: "同期しました",
      working: "処理中…",
      privacy_policy: "プライバシー",
      feedback: "フィードバック",
      local_snapshots: "ローカルバックアップ",
      sync_scope: "記録とフォルダを同期。ハイライトと設定は端末に残ります。",
      remove_site: "{0} を削除",
      draft_failed: "下書きを保持できません。閉じる前に保存してください。",
      file_too_large: "50 MB 未満のファイルを選んでください。",
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
    document.title =
      page === "panel"
        ? "iSnips"
        : t(page === "settings" ? "settings" : "library") + " · iSnips";
    document
      .querySelectorAll("[data-i18n-label]")
      .forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nLabel)));
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
  function toast(message, error = false, undo = null) {
    const el = $("toast");
    el.replaceChildren(make("span", "", message));
    el.classList.toggle("error", error);
    el.classList.add("visible");
    clearTimeout(toastTimer);
    if (undo) {
      const button = make("button", "", t("undo"));
      button.type = "button";
      button.addEventListener("click", () => busy(button, "working", undo));
      el.appendChild(button);
    }
    const dismiss = () => {
      if (el.matches(":hover") || el.contains(document.activeElement)) {
        toastTimer = setTimeout(dismiss, 2000);
      } else {
        el.classList.remove("visible");
      }
    };
    toastTimer = setTimeout(dismiss, undo ? 8000 : 4000);
  }
  async function request(action, data = {}) {
    const response = await chrome.runtime.sendMessage({ action, ...data });
    if (!response || !response.success) {
      const error = new Error(response?.error || t("unknown_error"));
      error.code = response?.code;
      throw error;
    }
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
    if (value == null) return "—";
    const date = new Date(value);
    return Number.isFinite(date.getTime())
      ? new Intl.DateTimeFormat(
          language === "zh-CN"
            ? "zh-CN"
            : language === "ja"
              ? "ja-JP"
              : "en-US",
          { year: "numeric", month: "numeric", day: "numeric" },
        ).format(date)
      : "—";
  }
  function captureError(error) {
    const key = {
      CLIPBOARD_CONSENT_REQUIRED: "clipboard_consent_required",
      AUTH_WEB_NOT_CONFIGURED: "drive_web_setup",
      AUTH_WEB_UNAVAILABLE: "drive_unavailable",
      AUTH_RECONNECT: "drive_reconnect",
      AUTH_CANCELED: "drive_auth_canceled",
      AUTH_CHANGED: "drive_auth_canceled",
      AUTH_INVALID_RESPONSE: "drive_invalid_auth",
      AUTH_INSUFFICIENT_SCOPE: "drive_no_scope",
      AUTH_CREATE_SYNC_REQUIRED: "drive_create_required",
    }[error?.code];
    if (key) {
      toast(t(key), true);
      return;
    }
    toast(
      t(
        "operation_failed",
        error && error.message ? error.message : t("unknown_error"),
      ),
      true,
    );
  }
  function openLibrary(filter) {
    chrome.tabs.create({
      url:
        chrome.runtime.getURL("library.html") +
        (filter === "clipboard" ? "#clipboard" : ""),
    });
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
  function showClipboardConsent() {
    if ($("clipboardConsentDialog")) return;
    const dialog = make("dialog", "editor-dialog clipboard-consent-dialog"),
      heading = make("h2", "", t("clipboard_consent_title")),
      body = make("p", "consent-body", t("clipboard_consent_body")),
      scope = make("p", "context-hint", t("clipboard_consent_scope")),
      privacy = make("a", "consent-privacy", t("privacy_policy")),
      actions = make("div", "dialog-actions"),
      decline = make("button", "button secondary", t("clipboard_consent_decline")),
      accept = make("button", "button primary", t("clipboard_consent_accept"));
    dialog.id = "clipboardConsentDialog";
    heading.id = "clipboardConsentTitle";
    body.id = "clipboardConsentBody";
    dialog.setAttribute("aria-labelledby", heading.id);
    dialog.setAttribute("aria-describedby", body.id);
    privacy.href = chrome.runtime.getURL("privacy.html");
    privacy.target = "_blank";
    privacy.rel = "noopener noreferrer";
    for (const [element, key] of [[heading, "clipboard_consent_title"], [body, "clipboard_consent_body"], [scope, "clipboard_consent_scope"], [privacy, "privacy_policy"], [decline, "clipboard_consent_decline"], [accept, "clipboard_consent_accept"]])
      element.dataset.i18n = key;
    decline.type = accept.type = "button";
    let saving = false;
    function choose(choice, button) {
      void busy(button, "working", async () => {
        saving = true;
        decline.disabled = accept.disabled = true;
        try {
          await request("setClipboardConsent", { choice });
          if (dialog.open) dialog.close();
        } finally {
          saving = false;
          decline.disabled = accept.disabled = false;
        }
      });
    }
    decline.addEventListener("click", () => choose("declined", decline));
    accept.addEventListener("click", () => choose("accepted", accept));
    dialog.addEventListener("cancel", (event) => { if (saving) event.preventDefault(); });
    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    actions.append(decline, accept);
    dialog.append(heading, body, scope, privacy, actions);
    document.body.appendChild(dialog);
    dialog.showModal();
    decline.focus();
  }
  async function maybeShowClipboardConsent() {
    const status = await request("getClipboardConsentStatus");
    if (status.needsNotice) showClipboardConsent();
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
    if (card.type === "clipboard") return t("clipboard");
    return card.type === "web" || card.type === "clip" ? t("clip") : t("note");
  }
  async function initCommon() {
    try {
      language = await setting("language", "en");
    } catch {
      language = "en";
    }
    if (!strings[language]) language = "en";
    document
      .querySelectorAll("[data-icon]")
      .forEach((el) => el.replaceChildren(icon(el.dataset.icon)));
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
        setColumns(changes.columnCount.newValue);
      }
      if (changes.libraryGrouping && page === "library") {
        libraryView = normalizeLibraryView(changes.libraryGrouping.newValue);
        renderLibrary();
      }
    });
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === "clipboardConsentChanged")
        $("clipboardConsentDialog")?.close();
    });
  }

  function icon(name) {
    const paths = {
      library: [
        "M3 3h7v7H3z",
        "M14 3h7v7h-7z",
        "M3 14h7v7H3z",
        "M14 14h7v7h-7z",
      ],
      note: ["M14 3H5v18h14V8z", "M14 3v5h5", "M8 12h8M8 16h6"],
      folder: ["M3 6h6l2 2h10v12H3z"],
      more: ["M5 12h.01M12 12h.01M19 12h.01"],
      clip: [
        "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2",
        "M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2",
      ],
      settings: [
        "M15.2 12a3.2 3.2 0 1 1-6.4 0 3.2 3.2 0 1 1 6.4 0",
        "M9.21 5.26L10.23 4.92L10.26 2.15L13.74 2.15L13.77 4.92L14.79 5.26L15.76 5.74L17.74 3.81L20.19 6.26L18.26 8.24L18.74 9.21L19.08 10.23L21.85 10.26L21.85 13.74L19.08 13.77L18.74 14.79L18.26 15.76L20.19 17.74L17.74 20.19L15.76 18.26L14.79 18.74L13.77 19.08L13.74 21.85L10.26 21.85L10.23 19.08L9.21 18.74L8.24 18.26L6.26 20.19L3.81 17.74L5.74 15.76L5.26 14.79L4.92 13.77L2.15 13.74L2.15 10.26L4.92 10.23L5.26 9.21L5.74 8.24L3.81 6.26L6.26 3.81L8.24 5.74Z",
      ],
      trash: ["M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"],
      coffee: [
        "M4 8h13v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z",
        "M17 9h2a3 3 0 0 1 0 6h-2",
        "M3 22h16M8 2v2M13 2v2",
      ],
      search: ["M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14", "m15 15 6 6"],
      plus: ["M12 5v14M5 12h14"],
      close: ["m6 6 12 12M6 18 18 6"],
      copy: ["M8 8h12v13H8z", "M16 8V3H3v13h5"],
      edit: ["m16 3 5 5-12 12-6 1 1-6z", "m13 6 5 5"],
      promote: ["M14 3H5v18h14V8z", "M14 3v5h5", "m12 10-3 5h4l-2 4"],
      restore: ["M3 10h11a6 6 0 0 1 0 12", "m8 5-5 5 5 5"],
    };
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("class", "icon");
    svg.setAttribute("aria-hidden", "true");
    for (const d of paths[name] || paths.note) {
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute("d", d);
      svg.appendChild(path);
    }
    return svg;
  }
  function iconButton(name, label, handler, danger = false) {
    const button = make("button", "card-action" + (danger ? " danger" : ""));
    button.type = "button";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.appendChild(icon(name));
    button.addEventListener("click", async () => {
      if (button.disabled) return;
      button.disabled = true;
      try {
        await handler();
      } catch (error) {
        captureError(error);
      } finally {
        button.disabled = false;
      }
    });
    return button;
  }
  function bindEditor(dialog, form, input, save, closeButtons) {
    let original = "";
    function dirty() {
      return dialog.open && input.value !== original;
    }
    function cancel(event) {
      if (save.disabled || (dirty() && !confirm(t("discard_changes")))) {
        event?.preventDefault();
        return;
      }
      dialog.close();
    }
    dialog.addEventListener("cancel", cancel);
    closeButtons.forEach((button) => button.addEventListener("click", cancel));
    input.addEventListener("keydown", (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "Enter" &&
        !event.isComposing
      ) {
        event.preventDefault();
        if (!save.disabled) form.requestSubmit();
      }
    });
    dialog.addEventListener("close", () => {
      original = "";
      input.value = "";
    });
    window.addEventListener("beforeunload", (event) => {
      if (dirty()) {
        event.preventDefault();
        event.returnValue = "";
      }
    });
    return (value) => {
      original = value;
      input.value = value;
      dialog.showModal();
      input.focus();
    };
  }
  async function busy(button, label, task) {
    if (button.disabled) return;
    const previous = button.textContent;
    button.disabled = true;
    button.textContent = t(label);
    button.setAttribute("aria-busy", "true");
    try {
      return await task();
    } catch (error) {
      captureError(error);
    } finally {
      button.disabled = false;
      button.textContent = previous;
      button.removeAttribute("aria-busy");
    }
  }
  function showReader(card, edit, promote, move) {
    const dialog = make("dialog", "editor-dialog reader-dialog");
    dialog.setAttribute("aria-labelledby", "readerTitle");
    const heading = make("div", "dialog-heading");
    const title = make("h2", "", itemLabel(card));
    title.id = "readerTitle";
    const close = make("button", "icon-button");
    close.type = "button";
    close.title = t("close");
    close.setAttribute("aria-label", t("close"));
    close.appendChild(icon("close"));
    close.addEventListener("click", () => dialog.close());
    let pressedOutside = false;
    function outside(event) {
      if (event.target !== dialog) return false;
      const bounds = dialog.getBoundingClientRect();
      return (
        event.clientX < bounds.left ||
        event.clientX >= bounds.right ||
        event.clientY < bounds.top ||
        event.clientY >= bounds.bottom
      );
    }
    dialog.addEventListener("pointerdown", (event) => {
      pressedOutside = event.button === 0 && outside(event);
    });
    dialog.addEventListener("pointercancel", () => {
      pressedOutside = false;
    });
    dialog.addEventListener("click", (event) => {
      if (pressedOutside && outside(event)) dialog.close();
      pressedOutside = false;
    });
    heading.append(title, close);
    dialog.append(heading, make("div", "reader-content", card.text));
    const footer = make("div", "reader-footer");
    if (validPageUrl(card.url)) {
      const source = make(
        "a",
        "reader-source",
        card.domain || new URL(card.url).hostname,
      );
      source.href = card.url;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      source.title = card.title || card.url;
      footer.appendChild(source);
    }
    const actions = make("div", "dialog-actions reader-actions");
    const copy = make("button", "button secondary", t("copy"));
    copy.type = "button";
    copy.addEventListener("click", () =>
      busy(copy, "working", async () => {
        await navigator.clipboard.writeText(card.text || "");
        toast(t("copied"));
      }),
    );
    actions.appendChild(copy);
    if (promote) {
      const save = make("button", "button primary", t("clipboard_promote"));
      save.type = "button";
      save.addEventListener("click", () =>
        busy(save, "saving", async () => {
          await promote();
          dialog.close();
        }),
      );
      actions.appendChild(save);
    }
    if (edit) {
      const editButton = make("button", "button primary", t("edit"));
      editButton.type = "button";
      editButton.addEventListener("click", () => {
        dialog.close();
        edit(card);
      });
      actions.appendChild(editButton);
    }
    if (move) {
      const button = make("button", "button secondary", t("move_to"));
      button.type = "button";
      button.addEventListener("click", () => {
        dialog.close();
        move(card);
      });
      actions.appendChild(button);
    }
    footer.appendChild(actions);
    dialog.appendChild(footer);
    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    document.body.appendChild(dialog);
    dialog.showModal();
    close.focus();
  }
  async function moveToTrash(card, reload) {
    await request("softDeleteSnippet", { cardId: card.id });
    await reload();
    toast(t("moved_to_trash"), false, async () => {
      await request("restoreSnippet", { cardId: card.id });
      await reload();
      toast(t("restored"));
    });
  }
  function renderCard(
    card,
    { panel = false, trash = false, clipboard = false, edit, reload, move },
  ) {
    const item = make("article", panel ? "recent-item" : "snippet-card");
    const content = make("button", "item-text");
    content.type = "button";
    content.setAttribute(
      "aria-label",
      t("read_item") + ": " + String(card.text || "").slice(0, 80),
    );
    content.appendChild(make("span", "item-text-content", card.text || ""));
    const promote = clipboard
      ? async () => {
          await request("promoteClipboardEntry", { entryId: card.id });
          await reload();
          toast(t("clipboard_saved"));
        }
      : null;
    async function fullCard() {
      if (!card.preview) return card;
      return (
        await request(
          clipboard ? "getClipboardEntry" : "getSnippet",
          clipboard ? { entryId: card.id } : { cardId: card.id },
        )
      ).snippet;
    }
    let opening = false;
    const openReader = async () => {
      if (opening) return;
      opening = true;
      try {
        const full = card.preview ? await fullCard() : card;
        if (item.isConnected)
          showReader(
            full,
            trash || clipboard ? null : edit,
            promote,
            trash || clipboard ? null : move,
          );
      } catch (error) {
        captureError(error);
      } finally {
        opening = false;
      }
    };
    content.addEventListener("click", openReader);
    item.addEventListener("click", (event) => {
      if (event.target.closest?.("a, button, .card-actions")) return;
      openReader();
    });
    const meta = make("div", "item-meta");
    if (validPageUrl(card.url)) {
      const link = make(
        "a",
        "item-source",
        card.domain || new URL(card.url).hostname,
      );
      link.href = card.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.title = card.url;
      meta.appendChild(link);
    } else {
      meta.appendChild(make("span", "item-source", itemLabel(card)));
    }
    meta.appendChild(
      make("time", "item-date", formatDate(cardTimestamp(card, trash))),
    );
    const actions = make("div", "card-actions");
    if (trash) {
      actions.appendChild(
        iconButton("restore", t("restore_action"), async () => {
          await request("restoreSnippet", { cardId: card.id });
          await reload();
          toast(t("restored"));
        }),
      );
    } else {
      actions.append(
        iconButton("copy", t("copy"), async () => {
          await navigator.clipboard.writeText((await fullCard()).text || "");
          toast(t("copied"));
        }),
        ...(move && !clipboard
          ? [iconButton("folder", t("move_to"), () => move(card))]
          : []),
        clipboard
          ? iconButton("promote", t("clipboard_promote"), promote)
          : iconButton("edit", t("edit"), async () => edit(await fullCard())),
        iconButton(
          "trash",
          t(clipboard ? "clipboard_delete" : "delete"),
          async () => {
            if (clipboard) {
              await request("deleteClipboardEntry", { entryId: card.id });
              await reload();
              toast(t("clipboard_deleted"));
            } else await moveToTrash(card, reload);
          },
          true,
        ),
      );
    }
    item.append(content, meta, actions);
    return item;
  }
  function renderLoadError(container, retry) {
    if (container.id === "libraryGrid") resetLibraryLayout();
    const state = make("div", "empty-state");
    state.appendChild(make("p", "", t("load_failed")));
    const button = make("button", "button secondary", t("retry"));
    button.type = "button";
    button.addEventListener("click", retry);
    state.appendChild(button);
    container.replaceChildren(state);
  }
  const panelClientId = "panel-" + Math.random().toString(36).slice(2);
  let panelCards = [],
    panelTotal = 0,
    panelHistory = [],
    panelHistoryError = null,
    panelFilter = "recent",
    editRecent,
    panelLoad = 0;
  async function initPanel() {
    let editingRecentCard = null;
    const editor = $("panelEditorDialog"),
      input = $("noteInput");
    // Chrome draws its own close button in the side panel header; Brave does not.
    if (!navigator.brave) $("closePanel").classList.add("hidden");
    const openEditor = bindEditor(
      editor,
      $("panelEditorForm"),
      $("panelEditorText"),
      $("panelSaveEditor"),
      [$("panelCloseEditor"), $("panelCancelEditor")],
    );
    editor.addEventListener("close", () => {
      editingRecentCard = null;
    });
    editRecent = (card) => {
      editingRecentCard = card;
      openEditor(card.text || "");
    };
    $("panelEditorForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const text = $("panelEditorText").value.trim();
      if (!text || !editingRecentCard) return;
      $("panelEditorText").disabled = true;
      void busy($("panelSaveEditor"), "saving", async () => {
        await request("updateSnippet", {
          cardId: editingRecentCard.id,
          updates: { text },
        });
        editor.close();
        await loadPanel();
        toast(t("updated"));
      }).finally(() => {
        $("panelEditorText").disabled = false;
      });
    });
    $("openLibrary").addEventListener("click", openLibrary);
    for (const id of ["viewAll", "viewAllBottom"])
      $(id).addEventListener("click", () => openLibrary(panelFilter));
    $("panelTabs").addEventListener("click", (event) => {
      const tab = event.target.closest("[data-panel-filter]");
      if (!tab || tab.dataset.panelFilter === panelFilter) return;
      panelFilter = tab.dataset.panelFilter;
      renderPanel();
      $("recentList").scrollTop = 0;
    });
    $("panelTabs").addEventListener("keydown", (event) => {
      const tabs = [...$("panelTabs").querySelectorAll('[role="tab"]')];
      const index = tabs.indexOf(event.target);
      if (
        index < 0 ||
        !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
      )
        return;
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
              tabs.length;
      tabs[next].click();
      tabs[next].focus();
    });
    $("openSettings").addEventListener("click", openSettings);
    let draftWrites = Promise.resolve(),
      savingNote = false,
      closingPanel = false;
    function updateComposer() {
      $("saveNote").disabled =
        savingNote || closingPanel || !input.value.trim();
      $("closePanel").disabled = savingNote || closingPanel;
      input.disabled = closingPanel;
      $("attachPage").disabled = closingPanel;
      $("noteCount").textContent =
        input.value.length > 18000 ? String(input.value.length) + "/20000" : "";
    }
    function saveDraft() {
      // Capture the value now, then write in order so an older write cannot restore a saved draft.
      const draft = { text: input.value, attachPage: $("attachPage").checked };
      draftWrites = draftWrites
        .then(() => chrome.storage.session.set({ panelDraft: draft }))
        .catch(() => toast(t("draft_failed"), true));
      return draftWrites;
    }
    try {
      const { panelDraft } = await chrome.storage.session.get("panelDraft");
      if (panelDraft) {
        input.value = panelDraft.text || "";
        $("attachPage").checked = panelDraft.attachPage !== false;
      }
    } catch {
      /* Saving a note is still available without draft storage. */
    }
    updateComposer();
    input.addEventListener("input", () => {
      updateComposer();
      void saveDraft();
    });
    $("attachPage").addEventListener("change", () => void saveDraft());
    input.addEventListener("keydown", (event) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key === "Enter" &&
        !event.isComposing
      ) {
        event.preventDefault();
        $("saveNote").click();
      }
    });
    $("closePanel").addEventListener("click", async () => {
      if (savingNote || closingPanel) return;
      closingPanel = true;
      updateComposer();
      try {
        await draftWrites;
        await chrome.storage.session.set({
          panelDraft: {
            text: input.value,
            attachPage: $("attachPage").checked,
          },
        });
        window.close();
      } catch (error) {
        captureError(error);
      } finally {
        closingPanel = false;
        updateComposer();
      }
    });
    $("saveNote").addEventListener("click", () => {
      const text = input.value.trim();
      if (!text) return;
      if (savingNote) return;
      const draftText = input.value;
      savingNote = true;
      $("closePanel").disabled = true;
      void busy($("saveNote"), "saving", async () => {
        let url = null,
          domain = null;
        if ($("attachPage").checked) {
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (validPageUrl(tab?.url)) {
            url = tab.url;
            domain = new URL(url).hostname;
          }
        }
        await request("saveSnippet", {
          data: { type: "note", text, url, domain },
        });
        // Do not discard text typed while the request was in flight.
        if (input.value === draftText) input.value = "";
        await saveDraft();
        await loadPanel();
        toast(t("saved"));
      }).finally(() => {
        savingNote = false;
        updateComposer();
      });
    });
    try {
      const commands = await chrome.commands.getAll();
      $("shortcutHint").textContent =
        commands.find((entry) => entry.name === "capture-snippet")?.shortcut ||
        "—";
    } catch {
      /* keep default */
    }
    chrome.runtime.onMessage.addListener((message) => {
      if (
        ["cardSaved", "backupRestored", "clipboardChanged"].includes(
          message.action,
        )
      )
        void loadPanel();
    });
    await loadPanel();
  }
  async function loadPanel() {
    const generation = ++panelLoad,
      list = $("recentList");
    list.setAttribute("aria-busy", "true");
    try {
      const [result, history] = await Promise.all([
        request("getLibraryPage", {
          query: { filter: "all", limit: 10, clientId: panelClientId },
        }),
        request("getClipboardHistory", { preview: true }).then(
          (value) => ({ value }),
          (error) => ({ error }),
        ),
      ]);
      if (generation !== panelLoad) return;
      panelCards = result.cards || [];
      panelTotal = result.counts?.all || 0;
      panelHistory = history.value?.items || [];
      panelHistoryError = history.error || null;
      renderPanel();
    } catch (error) {
      if (generation === panelLoad) {
        renderLoadError($("recentItems"), loadPanel);
        captureError(error);
      }
    } finally {
      if (generation === panelLoad) list.setAttribute("aria-busy", "false");
    }
  }

  function renderPanel() {
    const list = $("recentList"),
      items = $("recentItems");
    const cards = (
      panelFilter === "clipboard" ? [...panelHistory] : [...panelCards]
    ).sort((a, b) => cardDate(b) - cardDate(a));
    $("panelCount").textContent = String(
      panelFilter === "clipboard" ? panelHistory.length : panelTotal,
    );
    $("panelTabs")
      .querySelectorAll('[role="tab"]')
      .forEach((tab) => {
        const active = tab.dataset.panelFilter === panelFilter;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
        if (active) {
          list.setAttribute("aria-labelledby", tab.id);
          list.closest("section").setAttribute("aria-labelledby", tab.id);
        }
      });
    items.replaceChildren(
      ...cards.slice(0, 10).map((card) =>
        renderCard(card, {
          panel: true,
          clipboard: card.type === "clipboard",
          edit: editRecent,
          reload: loadPanel,
        }),
      ),
    );
    if (panelFilter === "clipboard" && panelHistoryError) {
      const errorState = make("div");
      renderLoadError(errorState, loadPanel);
      items.appendChild(errorState);
    } else if (!cards.length)
      items.appendChild(
        make(
          "p",
          "empty-state muted",
          t(panelFilter === "clipboard" ? "clipboard_empty" : "no_recent"),
        ),
      );
  }

  let libraryCards = [],
    libraryCounts = {},
    libraryFolderCounts = {},
    libraryFolders = [],
    folderError = null,
    clipboardCards = [],
    clipboardTotal = 0,
    clipboardEnabled = true,
    clipboardError = null,
    currentFilter = "all",
    search = "",
    sort = "new",
    libraryView = "all",
    editingCard = null;
  let libraryLoad = 0,
    pageIndex = 0,
    pageCursors = [null],
    pageResult = null,
    openLibraryEditor,
    editingFolder = null,
    searchTimer;
  const libraryClientId = "library-" + Math.random().toString(36).slice(2);
  const isFolderFilter = () => currentFilter.startsWith("folder:");
  const activeFolderId = () =>
    isFolderFilter() ? currentFilter.slice(7) : null;
  function cardTimestamp(card, trash = false) {
    const raw = trash
      ? card.deleted_at
      : (card.copied_at ?? card.created_at ?? card.updated_at);
    if (raw == null) return null;
    const value = Number(raw);
    return Number.isFinite(value) && Number.isFinite(new Date(value).getTime())
      ? value
      : null;
  }
  function cardDate(card) {
    return cardTimestamp(card) ?? 0;
  }
  function normalizeLibraryView(value) {
    return LIBRARY_VIEWS.includes(value) ? value : "all";
  }
  function localDateKey(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }
  function renderLibraryGroups(cards, trash) {
    const groups = new Map();
    for (const card of cards) {
      const timestamp = cardTimestamp(card, trash),
        date = timestamp == null ? null : new Date(timestamp);
      if (date) {
        date.setHours(0, 0, 0, 0);
        // Calendar arithmetic keeps Monday–Sunday weeks correct across DST.
        if (libraryView === "week")
          date.setDate(date.getDate() - (date.getDay() + 6) % 7);
        if (libraryView === "month") date.setDate(1);
      }
      const key = date
        ? localDateKey(date).slice(0, libraryView === "month" ? 7 : 10)
        : "undated";
      if (!groups.has(key)) groups.set(key, { date, cards: [] });
      groups.get(key).cards.push(card);
    }
    const formatter = new Intl.DateTimeFormat(language, {
      year: "numeric",
      month: "long",
      ...(libraryView === "month" ? {} : { day: "numeric" }),
    });
    return [...groups].map(([key, group]) => {
      const section = make("section", "date-group"),
        heading = make("h2", "date-group-title"),
        grid = make("div", "library-grid");
      heading.id = "date-title-" + key;
      section.setAttribute("aria-labelledby", heading.id);
      if (group.date) {
        const time = make("time", "", formatter.format(group.date));
        time.dateTime = key;
        heading.appendChild(time);
        if (libraryView === "week") {
          const end = new Date(group.date);
          end.setDate(end.getDate() + 6);
          const until = make("time", "", formatter.format(end));
          until.dateTime = localDateKey(end);
          heading.append(" – ", until);
        }
      } else heading.textContent = t("unknown_date");
      grid.append(...group.cards.map((card) => libraryCard(card, trash)));
      section.append(heading, grid);
      return section;
    });
  }
  function libraryCard(card, trash) {
    return renderCard(card, {
      trash,
      clipboard: currentFilter === "clipboard",
      edit: showEditor,
      reload: loadLibrary,
      move: showMoveDialog,
    });
  }
  let libraryResizeObserver = null,
    libraryLayoutFrame = 0;
  function resetLibraryLayout() {
    libraryResizeObserver?.disconnect();
    cancelAnimationFrame(libraryLayoutFrame);
    libraryLayoutFrame = 0;
    const grid = $("libraryGrid");
    grid.classList.remove("masonry-ready");
    grid.style.removeProperty("height");
    grid.style.removeProperty("--masonry-width");
  }
  function scheduleLibraryLayout() {
    if (libraryLayoutFrame) return;
    libraryLayoutFrame = requestAnimationFrame(() => {
      libraryLayoutFrame = 0;
      const grid = $("libraryGrid"),
        cards = [...grid.querySelectorAll(":scope > .snippet-card")];
      if (!cards.length || !grid.clientWidth) return;
      const styles = getComputedStyle(grid),
        columns = styles.gridTemplateColumns.trim().split(/\s+/).length,
        gap = parseFloat(styles.columnGap) || 12,
        width = (grid.clientWidth - (columns - 1) * gap) / columns;
      if (width <= 0) return;
      grid.style.setProperty("--masonry-width", width + "px");
      grid.classList.add("masonry-ready");
      // Measure natural heights after setting every width. Hover transforms do
      // not affect offsetHeight, so they cannot move the surrounding cards.
      const heights = cards.map((card) => card.offsetHeight),
        bottoms = Array(columns).fill(0);
      cards.forEach((card, index) => {
        const column = bottoms.indexOf(Math.min(...bottoms));
        card.style.setProperty("--masonry-x", column * (width + gap) + "px");
        card.style.setProperty("--masonry-y", bottoms[column] + "px");
        bottoms[column] += heights[index] + gap;
      });
      grid.style.height = Math.max(0, Math.max(...bottoms) - gap) + "px";
    });
  }
  function renderLibraryCards(cards, trash) {
    resetLibraryLayout();
    const grid = $("libraryGrid");
    grid.classList.toggle("library-grid", libraryView === "all");
    grid.classList.toggle("library-groups", libraryView !== "all");
    grid.replaceChildren(
      ...(libraryView === "all"
        ? cards.map((card) => libraryCard(card, trash))
        : renderLibraryGroups(cards, trash)),
    );
    if (!cards.length || libraryView !== "all") return;
    libraryResizeObserver ??= new ResizeObserver(scheduleLibraryLayout);
    libraryResizeObserver.observe(grid);
    for (const card of grid.children) libraryResizeObserver.observe(card);
    scheduleLibraryLayout();
  }
  async function loadLibrary({ reset = true } = {}) {
    clearTimeout(searchTimer);
    if (reset) {
      pageIndex = 0;
      pageCursors = [null];
    }
    const generation = ++libraryLoad,
      grid = $("libraryGrid"),
      clipboard = currentFilter === "clipboard";
    grid.setAttribute("aria-busy", "true");
    $("loadMore").disabled = true;
    $("previousPage").disabled = true;
    try {
      const [result, folders, history] = await Promise.all([
        request("getLibraryPage", {
          query: {
            filter: clipboard
              ? "all"
              : isFolderFilter()
                ? "folder"
                : currentFilter,
            spaceId: activeFolderId(),
            search: clipboard ? "" : search,
            sort,
            after: clipboard ? null : pageCursors[pageIndex],
            limit: clipboard ? 1 : LIBRARY_PAGE_SIZE,
            clientId: libraryClientId,
          },
        }),
        request("getSpaces").then(
          (value) => ({ value }),
          (error) => ({ error }),
        ),
        request("getClipboardHistory", {
          preview: true,
          search: clipboard ? search : "",
        }).then(
          (value) => ({ value }),
          (error) => ({ error }),
        ),
      ]);
      if (generation !== libraryLoad) return;
      pageResult = result;
      libraryCards = result.cards || [];
      libraryCounts = result.counts || {};
      libraryFolderCounts = result.folderCounts || {};
      folderError = folders.error || null;
      if (!folderError) libraryFolders = folders.value.spaces || [];
      if (
        isFolderFilter() &&
        !folderError &&
        !libraryFolders.some((folder) => folder.id === activeFolderId())
      ) {
        currentFilter = "all";
        return await loadLibrary();
      }
      clipboardError = history.error || null;
      if (!clipboardError) {
        clipboardCards = history.value.items || [];
        clipboardTotal = history.value.totalCount ?? clipboardCards.length;
        clipboardEnabled = history.value.enabled === true;
      }
      renderLibrary();
    } catch (error) {
      if (generation === libraryLoad) {
        renderLoadError(grid, () => loadLibrary({ reset: false }));
        $("emptyState").classList.add("hidden");
        $("loadMore").classList.add("hidden");
        $("previousPage").classList.add("hidden");
        $("pageStatus").textContent = "";
        captureError(error);
      }
    } finally {
      if (generation === libraryLoad) {
        grid.setAttribute("aria-busy", "false");
        $("loadMore").disabled = false;
        $("previousPage").disabled = false;
      }
    }
  }
  function compareCardDates(a, b, trash) {
    const left = cardTimestamp(a, trash),
      right = cardTimestamp(b, trash);
    if (left == null) return right == null ? 0 : 1;
    if (right == null) return -1;
    return (sort === "new" ? -1 : 1) * (left - right);
  }
  function renderFolders() {
    const list = $("folderList");
    list.replaceChildren();
    $("createFolder").disabled = Boolean(folderError);
    if (folderError) {
      renderLoadError(list, loadLibrary);
      return;
    }
    for (const folder of libraryFolders.filter(
      (folder) => folder.id !== "inbox",
    )) {
      const row = make("div", "folder-row");
      const button = make("button", "filter-button");
      button.type = "button";
      button.dataset.filter = "folder:" + folder.id;
      button.append(
        icon("folder"),
        make("span", "folder-name", folder.name),
        make(
          "span",
          "nav-count",
          String(
            (Object.hasOwn(libraryFolderCounts, folder.id)
              ? libraryFolderCounts[folder.id]
              : 0) || "",
          ),
        ),
      );
      const manage = iconButton(
        "more",
        t("manage_folder") + ": " + folder.name,
        () => showFolderEditor(folder),
      );
      manage.className = "icon-button folder-manage";
      row.append(button, manage);
      list.appendChild(row);
    }
  }
  function renderLibrary() {
    $("libraryView").querySelectorAll("[data-library-view]").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.libraryView === libraryView),
      );
    });
    renderFolders();
    const counts = { ...libraryCounts, clipboard: clipboardTotal };
    for (const name of ["all", "web", "note", "clipboard", "trash"])
      $("count" + name[0].toUpperCase() + name.slice(1)).textContent =
        counts[name] || "";
    document.querySelectorAll("[data-filter]").forEach((button) => {
      const active = button.dataset.filter === currentFilter;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    $("pageTitle").textContent = isFolderFilter()
      ? libraryFolders.find((folder) => folder.id === activeFolderId())?.name ||
        t("folders")
      : t(
          {
            all: "all_items",
            web: "clips",
            note: "notes",
            clipboard: "clipboard",
            trash: "trash",
          }[currentFilter],
        );
    const trash = currentFilter === "trash",
      clipboard = currentFilter === "clipboard";
    $("emptyTrash").classList.toggle("hidden", !trash || !counts.trash);
    $("newNote").classList.toggle("hidden", trash || clipboard);
    $("clipboardControls").classList.toggle("hidden", !clipboard);
    $("clipboardHint").classList.toggle("hidden", !clipboard);
    $("clipboardAuto").checked = clipboardEnabled;
    $("clipboardAuto").disabled = Boolean(clipboardError);
    $("clearClipboard").classList.toggle(
      "hidden",
      !clipboardCards.length || Boolean(clipboardError),
    );
    $("trashHint").classList.toggle("hidden", !trash || !counts.trash);
    if (clipboard && clipboardError) {
      renderLoadError($("libraryGrid"), loadLibrary);
      $("emptyState").classList.add("hidden");
      $("loadMore").classList.add("hidden");
      $("previousPage").classList.add("hidden");
      $("resultCount").textContent = $("pageStatus").textContent = "";
      return;
    }
    let cards = libraryCards,
      matchCount = pageResult?.matchCount || 0,
      hasMore = pageResult?.hasMore;
    if (clipboard) {
      const filtered = [...clipboardCards].sort((a, b) =>
        compareCardDates(a, b, false),
      );
      matchCount = filtered.length;
      cards = filtered.slice(
        pageIndex * LIBRARY_PAGE_SIZE,
        (pageIndex + 1) * LIBRARY_PAGE_SIZE,
      );
      hasMore = (pageIndex + 1) * LIBRARY_PAGE_SIZE < matchCount;
    }
    $("resultCount").textContent = t("result_count", matchCount);
    $("emptyState").classList.toggle("hidden", Boolean(cards.length));
    $("emptyTitle").textContent = t(
      search
        ? "no_results"
        : clipboard
          ? "clipboard_empty"
          : trash
            ? "trash_empty"
            : "nothing_here",
    );
    $("emptyDescription").textContent =
      trash && !search
        ? ""
        : t(
            search
              ? "no_results_desc"
              : clipboard
                ? clipboardEnabled
                  ? "clipboard_empty_desc"
                  : "clipboard_paused_desc"
                : "empty_desc",
          );
    renderLibraryCards(cards, trash);
    $("loadMore").classList.toggle("hidden", !hasMore);
    $("previousPage").classList.toggle("hidden", pageIndex === 0);
    $("pageStatus").textContent = matchCount
      ? t(
          "page_status",
          pageIndex + 1,
          Math.max(1, Math.ceil(matchCount / LIBRARY_PAGE_SIZE)),
        )
      : "";
  }
  function folderOptions(select, value = "inbox") {
    select.replaceChildren(
      new Option(t("no_folder"), "inbox"),
      ...libraryFolders
        .filter((folder) => folder.id !== "inbox")
        .map((folder) => new Option(folder.name, folder.id)),
    );
    if (
      value !== "inbox" &&
      !libraryFolders.some((folder) => folder.id === value)
    )
      select.appendChild(new Option(t("unavailable_folder"), value));
    select.value = value;
  }
  function showMoveDialog(card) {
    if (folderError) {
      captureError(folderError);
      return;
    }
    const dialog = make("dialog", "editor-dialog folder-move-dialog"),
      heading = make("h2", "", t("move_to")),
      select = make("select"),
      actions = make("div", "dialog-actions");
    heading.id = "moveFolderTitle";
    dialog.setAttribute("aria-labelledby", heading.id);
    select.setAttribute("aria-label", t("folder"));
    folderOptions(select, card.spaceId || "inbox");
    const cancel = make("button", "button secondary", t("cancel")),
      save = make("button", "button primary", t("move_to"));
    cancel.type = save.type = "button";
    cancel.addEventListener("click", () => dialog.close());
    save.addEventListener("click", () =>
      busy(save, "saving", async () => {
        await request("moveSnippet", {
          cardId: card.id,
          spaceId: select.value,
        });
        dialog.close();
        await loadLibrary();
        toast(t("moved"));
      }),
    );
    actions.append(cancel, save);
    dialog.append(heading, select, actions);
    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    document.body.appendChild(dialog);
    dialog.showModal();
    select.focus();
  }
  function showFolderEditor(folder = null) {
    editingFolder = folder;
    $("folderEditorTitle").textContent = t(
      folder ? "rename_folder" : "create_folder",
    );
    $("folderName").value = folder?.name || "";
    $("deleteFolder").classList.toggle("hidden", !folder);
    $("folderEditorDialog").showModal();
    $("folderName").focus();
  }
  function showEditor(card = null) {
    editingCard = card;
    $("editorTitle").textContent = t(card ? "edit_item" : "create_note");
    folderOptions(
      $("editorFolder"),
      card?.spaceId || activeFolderId() || "inbox",
    );
    openLibraryEditor(card?.text || "");
  }
  async function initLibrary() {
    window.addEventListener("resize", scheduleLibraryLayout);
    if (["#clipboard", "#clipboard-consent"].includes(window.location.hash)) currentFilter = "clipboard";
    $("librarySettings").setAttribute("aria-label", t("settings"));
    $("librarySettings").title = t("settings");
    $("newNote").addEventListener("click", () => showEditor());
    $("clipboardAuto").addEventListener("change", async () => {
      const input = $("clipboardAuto"),
        enabled = input.checked;
      input.disabled = true;
      try {
        if (enabled && (await request("getClipboardConsentStatus")).consentRequired) {
          input.checked = false;
          showClipboardConsent();
          return;
        }
        await request("setSetting", {
          key: "clipboardCaptureEnabled",
          value: enabled,
        });
        clipboardEnabled = enabled;
      } catch (error) {
        captureError(error);
      } finally {
        input.checked = clipboardEnabled;
        input.disabled = false;
      }
    });
    $("clearClipboard").addEventListener("click", () => {
      if (!confirm(t("clipboard_confirm"))) return;
      void busy($("clearClipboard"), "working", async () => {
        await request("clearClipboardHistory");
        await loadLibrary();
        toast(t("cleared"));
      });
    });
    $("searchInput").addEventListener("input", (event) => {
      search = event.target.value.trim().toLowerCase();
      clearTimeout(searchTimer);
      ++libraryLoad;
      pageIndex = 0;
      pageCursors = [null];
      $("loadMore").disabled = $("previousPage").disabled = true;
      searchTimer = setTimeout(() => void loadLibrary(), 250);
    });
    $("sortSelect").addEventListener("change", (event) => {
      sort = event.target.value;
      void loadLibrary();
    });
    $("libraryView").addEventListener("click", (event) => {
      const button = event.target.closest("[data-library-view]");
      if (!button || button.dataset.libraryView === libraryView) return;
      libraryView = normalizeLibraryView(button.dataset.libraryView);
      renderLibrary();
      void saveSetting("libraryGrouping", libraryView).catch(captureError);
    });
    $("filters").addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (button) {
        currentFilter = button.dataset.filter;
        void loadLibrary();
      }
    });
    $("libraryTrash").addEventListener("click", () => {
      currentFilter = "trash";
      void loadLibrary();
    });
    $("folderList").addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (button) {
        currentFilter = button.dataset.filter;
        void loadLibrary();
      }
    });
    $("loadMore").addEventListener("click", () => {
      if ($("loadMore").disabled) return;
      if (currentFilter !== "clipboard")
        pageCursors[pageIndex + 1] = pageResult?.nextCursor;
      pageIndex++;
      void loadLibrary({ reset: false });
    });
    $("previousPage").addEventListener("click", () => {
      if (!pageIndex || $("previousPage").disabled) return;
      pageIndex--;
      void loadLibrary({ reset: false });
    });
    $("createFolder").addEventListener("click", () => showFolderEditor());
    for (const id of ["closeFolderEditor", "cancelFolderEditor"])
      $(id).addEventListener("click", () => {
        if (!$("saveFolder").disabled) $("folderEditorDialog").close();
      });
    $("folderEditorDialog").addEventListener("cancel", (event) => {
      if ($("saveFolder").disabled || $("deleteFolder").disabled)
        event.preventDefault();
    });
    $("folderEditorForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const folder = editingFolder,
        name = $("folderName").value.trim();
      if (!name) return;
      $("folderName").disabled = true;
      $("deleteFolder").disabled = true;
      void busy($("saveFolder"), "saving", async () => {
        const result = await request(folder ? "updateSpace" : "createSpace", {
          spaceId: folder?.id,
          name,
        });
        $("folderEditorDialog").close();
        if (!folder) currentFilter = "folder:" + result.space.id;
        await loadLibrary();
        toast(t(folder ? "folder_updated" : "folder_created"));
      }).finally(() => {
        $("folderName").disabled = false;
        $("deleteFolder").disabled = false;
      });
    });
    $("deleteFolder").addEventListener("click", () => {
      if (!editingFolder || !confirm(t("folder_delete_confirm"))) return;
      const folder = editingFolder;
      $("saveFolder").disabled = true;
      $("folderName").disabled = true;
      void busy($("deleteFolder"), "working", async () => {
        await request("deleteSpace", { spaceId: folder.id });
        $("folderEditorDialog").close();
        if (activeFolderId() === folder.id) currentFilter = "all";
        await loadLibrary();
        toast(t("folder_deleted"));
      }).finally(() => {
        $("saveFolder").disabled = false;
        $("folderName").disabled = false;
      });
    });
    $("editorDialog").addEventListener("close", () => {
      editingCard = null;
    });
    openLibraryEditor = bindEditor(
      $("editorDialog"),
      $("editorForm"),
      $("editorText"),
      $("saveEditor"),
      [$("closeEditor"), $("cancelEditor")],
    );
    $("editorForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const text = $("editorText").value.trim(),
        card = editingCard;
      if (!text) {
        toast(t("empty_note"), true);
        $("editorText").focus();
        return;
      }
      $("editorText").disabled = true;
      void busy($("saveEditor"), "saving", async () => {
        if (card)
          await request("updateSnippet", {
            cardId: card.id,
            updates: {
              text,
              ...($("editorFolder").value !== (card.spaceId || "inbox")
                ? { spaceId: $("editorFolder").value }
                : {}),
            },
          });
        else
          await request("saveSnippet", {
            data: {
              type: "note",
              text,
              url: null,
              domain: null,
              spaceId: $("editorFolder").value,
            },
          });
        $("editorDialog").close();
        await loadLibrary();
        toast(t(card ? "updated" : "saved"));
      }).finally(() => {
        $("editorText").disabled = false;
      });
    });
    $("emptyTrash").addEventListener("click", () => {
      if (!confirm(t("confirm_empty"))) return;
      void busy($("emptyTrash"), "working", async () => {
        await request("emptyTrash");
        await loadLibrary();
        toast(t("cleared"));
      });
    });
    chrome.runtime.onMessage.addListener((message) => {
      if (
        [
          "cardSaved",
          "backupRestored",
          "clipboardChanged",
          "spacesChanged",
        ].includes(message.action)
      )
        void loadLibrary();
    });
    try {
      const [columns, view] = await Promise.all([
        setting("columnCount", COLUMN_COUNT_DEFAULT),
        setting("libraryGrouping", "all"),
      ]);
      setColumns(columns);
      libraryView = normalizeLibraryView(view);
    } catch {
      /* CSS default */
    }
    await loadLibrary();
  }
  function normalizeColumnCount(value) {
    const numeric =
      typeof value === "number" ||
      (typeof value === "string" && value.trim() !== "");
    const count = numeric ? Number(value) : NaN;
    return Number.isInteger(count)
      ? Math.min(COLUMN_COUNT_MAX, Math.max(COLUMN_COUNT_MIN, count))
      : COLUMN_COUNT_DEFAULT;
  }
  function setColumns(value) {
    $("libraryGrid").style.setProperty(
      "--columns",
      String(normalizeColumnCount(value)),
    );
    scheduleLibraryLayout();
  }

  let googleAuthStatus = null,
    googleAuthLoad = 0,
    syncActionPending = false;
  async function refreshGoogleAuthStatus() {
    const generation = ++googleAuthLoad;
    try {
      const browser = await detectGoogleBrowser();
      const status = await request("getGoogleAuthStatus", { browser });
      if (generation !== googleAuthLoad) return;
      googleAuthStatus = status;
    } catch {
      if (generation !== googleAuthLoad) return;
      googleAuthStatus = null;
    }
    showSyncFields();
  }
  let syncConfig = {},
    blockedSites = [];
  function showSyncFields() {
    const method = $("syncMethod").value;
    $("syncMethod").disabled = syncActionPending;
    $("syncOptions").classList.toggle("hidden", method === "none");
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
        webdavReady =
          webdavReady &&
          !url.username &&
          !url.password &&
          !url.search &&
          !url.hash;
      } catch {
        webdavReady = false;
      }
    }
    $("autoSync").disabled = syncActionPending || method === "none" || !webdavReady;
    $("syncNow").disabled = syncActionPending || method === "none" || !webdavReady;
    const connected = method === "googledrive" && googleAuthStatus?.connected;
    $("connectDrive").classList.toggle("hidden", method !== "googledrive" || Boolean(connected));
    $("disconnectDrive").classList.toggle("hidden", !connected);
    $("disconnectDrive").disabled = syncActionPending;
    $("connectDrive").disabled = syncActionPending;
    if (method === "googledrive") {
      const web = googleAuthStatus?.method === "web";
      $("driveStatus").textContent = t(
        web && !googleAuthStatus.webConfigured
          ? "drive_web_setup"
          : connected
            ? "drive_connected"
            : googleAuthStatus?.needsReconnect
              ? "drive_reconnect"
              : "drive_not_connected",
      );
      if (web && !googleAuthStatus.webConfigured)
        $("connectDrive").disabled = $("syncNow").disabled = $("autoSync").disabled = true;
    }
  }
  let syncSettingsQueue = Promise.resolve();
  function updateSync(patch) {
    const operation = syncSettingsQueue.then(() => persistSync(patch));
    syncSettingsQueue = operation.catch(() => {});
    return operation;
  }
  async function persistSync(patch) {
    // Merge into the stored config, not this page's copy: background syncs keep updating
    // last_remote_etag while the page is open, and a stale copy would overwrite it.
    const stored = await setting("syncConfig", { type: "none" });
    const current = stored && typeof stored === "object" ? stored : {};
    const next = { ...current, ...patch };
    // A different backend or server means the stored remote ETag no longer applies.
    if (
      ["type", "url", "username"].some(
        (key) => key in patch && patch[key] !== current[key],
      )
    )
      next.last_remote_etag = null;
    await saveSetting("syncConfig", next);
    syncConfig = next;
  }
  function renderBlocked() {
    const list = $("blockedList");
    list.replaceChildren();
    blockedSites.forEach((domain) => {
      const chip = make("span", "chip", domain);
      const remove = make("button", "", "×");
      remove.type = "button";
      remove.title = t("remove_site", domain);
      remove.setAttribute("aria-label", t("remove_site", domain));
      remove.addEventListener("click", async () => {
        try {
          const next = blockedSites.filter((value) => value !== domain);
          await saveSetting("blockedSites", next);
          blockedSites = next;
          renderBlocked();
        } catch (error) {
          captureError(error);
        }
      });
      chip.appendChild(remove);
      list.appendChild(chip);
    });
  }
  function formatStatusDate(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime())
      ? new Intl.DateTimeFormat(language, {
          dateStyle: "short",
          timeStyle: "short",
        }).format(date)
      : "—";
  }
  function updateDates(lastSync, lastBackup) {
    $("lastSync").textContent = lastSync
      ? t("last_synced", formatStatusDate(lastSync))
      : t("never_synced");
    $("lastBackup").textContent = lastBackup
      ? t("last_backed_up", formatStatusDate(lastBackup))
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
          new Intl.DateTimeFormat(language, {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(snapshot.createdAt)) +
            " · " +
            t("item_count", snapshot.snippetCount),
          snapshot.id,
        ),
      ),
    );
    $("restoreBackup").disabled = !snapshots.length;
  }
  async function initSettings() {
    $("appVersion").textContent =
      "iSnips " + chrome.runtime.getManifest().version;
    $("blockedDomain").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        $("addBlocked").click();
      }
    });
    const [appearance, columns, blocked, config, lastSync, lastBackup] =
      await Promise.all([
        setting("appearance", "auto"),
        setting("columnCount", COLUMN_COUNT_DEFAULT),
        setting("blockedSites", []),
        setting("syncConfig", { type: "none" }),
        setting("lastSyncTime", null),
        setting("lastBackupTime", null),
      ]);
    $("language").value = language;
    $("appearance").value = appearance;
    $("columnCount").value = String(normalizeColumnCount(columns));
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
        const nextLanguage = event.target.value;
        await saveSetting("language", nextLanguage);
        language = nextLanguage;
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
        event.target.value = await setting(
          event.target.id,
          event.target.id === "language"
            ? language
            : event.target.id === "appearance"
              ? "auto"
              : COLUMN_COUNT_DEFAULT,
        );
        captureError(error);
      }
    });
    $("appearance").addEventListener("change", async (event) => {
      try {
        await saveSetting("appearance", event.target.value);
        applyTheme(event.target.value);
        toast(t("saved"));
      } catch (error) {
        event.target.value = await setting(
          event.target.id,
          event.target.id === "language"
            ? language
            : event.target.id === "appearance"
              ? "auto"
              : COLUMN_COUNT_DEFAULT,
        );
        captureError(error);
      }
    });
    $("columnCount").addEventListener("change", async (event) => {
      try {
        await saveSetting("columnCount", Number(event.target.value));
        toast(t("saved"));
      } catch (error) {
        event.target.value = String(
          normalizeColumnCount(
            await setting("columnCount", COLUMN_COUNT_DEFAULT),
          ),
        );
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
        const next = [...new Set([...blockedSites, value])];
        await saveSetting("blockedSites", next);
        blockedSites = next;
        $("blockedDomain").value = "";
        renderBlocked();
        toast(t("saved"));
      } catch (error) {
        captureError(error);
      }
    });
    $("syncMethod").addEventListener("change", async (event) => {
      syncActionPending = true;
      showSyncFields();
      try {
        await updateSync({ type: event.target.value });
        await refreshGoogleAuthStatus();
        toast(t("saved"));
      } catch (error) {
        syncConfig = await setting("syncConfig", { type: "none" });
        event.target.value = syncConfig.type || "none";
        await refreshGoogleAuthStatus();
        captureError(error);
      } finally {
        syncActionPending = false;
        showSyncFields();
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
        parsed.username ||
        parsed.password ||
        parsed.search ||
        parsed.hash ||
        (parsed.protocol !== "https:" &&
          !(
            parsed.protocol === "http:" &&
            ["localhost", "127.0.0.1"].includes(parsed.hostname)
          ))
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
    await refreshGoogleAuthStatus();
    $("connectDrive").addEventListener("click", () => {
      void busy($("connectDrive"), "working", async () => {
        syncActionPending = true;
        showSyncFields();
        try {
          await request("connectGoogleDrive", { browser: await detectGoogleBrowser() });
        } finally {
          syncActionPending = false;
          await refreshGoogleAuthStatus();
        }
      }).finally(showSyncFields);
    });
    $("syncNow").addEventListener("click", async () => {
      const method = $("syncMethod").value;
      if (method === "none") {
        toast(t("not_configured"), true);
        return;
      }
      const button = $("syncNow");
      if (button.disabled) return;
      syncActionPending = true;
      showSyncFields();
      button.disabled = true;
      button.textContent = t("syncing");
      try {
        let result;
        try {
          result = await request(
            method === "webdav" ? "syncWebDAV" : "syncGoogleDrive",
          );
        } catch (error) {
          if (
            method !== "googledrive" ||
            error.code !== "AUTH_CREATE_SYNC_REQUIRED"
          )
            throw error;
          if (!confirm(t("drive_create_confirm"))) return;
          result = await request("syncGoogleDrive", { allowCreate: true });
        }
        updateDates(result.lastSyncTime, await setting("lastBackupTime", null));
        toast(t("synced"));
      } catch (error) {
        captureError(error);
      } finally {
        button.textContent = t("sync_now");
        syncActionPending = false;
        await refreshGoogleAuthStatus();
      }
    });
    $("disconnectDrive").addEventListener("click", () =>
      busy($("disconnectDrive"), "working", async () => {
        syncActionPending = true;
        showSyncFields();
        try {
          await request("disconnectGoogleDrive");
        } finally {
          syncConfig = await setting("syncConfig", { type: "none" });
          $("syncMethod").value = syncConfig.type;
          syncActionPending = false;
          await refreshGoogleAuthStatus();
        }
        toast(t("drive_disconnected"));
      }).finally(showSyncFields),
    );
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
        if (file.size > 50 * 1024 * 1024) throw new Error(t("file_too_large"));
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
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === "googleAuthChanged") {
        void (async () => {
          syncConfig = await setting("syncConfig", { type: "none" });
          $("syncMethod").value = syncConfig.type || "none";
          $("autoSync").value = syncConfig.autoSyncInterval || "off";
          await refreshGoogleAuthStatus();
        })().catch(captureError);
        return;
      }
      if (!["backupCompleted", "syncCompleted"].includes(message.action))
        return;
      void (async () => {
        updateDates(
          await setting("lastSyncTime", null),
          await setting("lastBackupTime", null),
        );
        if (message.action === "syncCompleted") await refreshGoogleAuthStatus();
        if (message.action === "backupCompleted") await loadSnapshots();
      })().catch(captureError);
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
      await maybeShowClipboardConsent();
    } catch (error) {
      captureError(error);
    }
  });
})();
