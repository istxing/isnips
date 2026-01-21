// iSnips Sidebar Script - Side Panel Version

class iSnipsSidebar {
    constructor() {
        this.cards = [];
        this.filteredCards = [];
        this.currentFilters = {
            search: '',
            category: 'all' // 'all', '收集', '随笔', 'trash'
        };
        this.currentLanguage = 'en';
        this.translations = {};
        this.columns = 5;

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadLanguage();
        this.loadSettings();
        this.loadData();
        this.checkUrlHash();
    }

    bindEvents() {
        // Settings button
        const settingsBtn = document.getElementById('openSettingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                chrome.runtime.openOptionsPage();
            });
        }

        // Main content events
        const searchInput = document.getElementById('searchInput');
        const languageSelect = document.getElementById('languageSelect');
        const emptyTrashBtn = document.getElementById('emptyTrashBtn');

        // Search functionality
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }

        // Language selector
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.setLanguage(e.target.value);
            });
        }

        // Category buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setCategory(btn.dataset.category);
            });
        });

        // Empty trash button
        if (emptyTrashBtn) {
            emptyTrashBtn.addEventListener('click', () => {
                this.emptyTrash();
            });
        }

        // New note modal
        const closeNewNoteModal = document.getElementById('closeNewNoteModal');
        const cancelNewNoteBtn = document.getElementById('cancelNewNoteBtn');
        const saveNewNoteBtn = document.getElementById('saveNewNoteBtn');

        if (closeNewNoteModal) {
            closeNewNoteModal.addEventListener('click', () => this.hideNewNoteModal());
        }
        if (cancelNewNoteBtn) {
            cancelNewNoteBtn.addEventListener('click', () => this.hideNewNoteModal());
        }
        if (saveNewNoteBtn) {
            saveNewNoteBtn.addEventListener('click', () => this.saveNewNote());
        }

        // Listen for language change messages from background
        if (chrome && chrome.runtime) {
            chrome.runtime.onMessage.addListener((message) => {
                if (message.action === 'languageChanged') {
                    console.log('Library: Language changed via runtime message:', message.language);
                    this.currentLanguage = message.language;
                    this.loadTranslations();
                    this.updateUI();
                } else if (message.action === 'cardSaved') {
                    console.log('Library: New card saved, refreshing data');
                    this.loadData();
                }
                return false;
            });
            console.log('Library: Runtime message listener added');
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

    async loadSettings() {
        try {
            const result = await chrome.runtime.sendMessage({
                action: 'getSetting',
                key: 'columnCount',
                defaultValue: 5
            });
            const count = result.success ? result.value : 5;
            document.documentElement.style.setProperty('--column-count', count);
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    loadTranslations() {
        this.translations = {
            'zh-CN': {
                sidebar_title: 'iSnips · 片语',
                library_header_title: '个人知识片段库',
                settings: '设置',
                search_placeholder: '搜索片段...',
                loading: '寻觅中...',
                no_clips_title: '尚未记录任何片段',
                no_clips_desc: '在网页选中文字，用 Alt+C 记录你的思维瞬间',
                no_results: '未找到相关片段',
                today: '今日片段',
                yesterday: '昨日回顾',
                this_week: '本周片段',
                all_categories: '全部',
                web_clips: '网页摘录',
                jotted_notes: '随笔感悟',
                scrap_trash: '回收站',
                trash_info: '这些片段已进入回收站，30天后将自动归于尘埃。',
                empty_trash: '清空回收站',
                new_note: '记录新思维',
                cancel: '取消',
                save: '保存',
                just_now: '刚刚',
                minutes_ago: '分钟前',
                hours_ago: '小时前',
                days_ago: '天前',
                restore_confirm: '确定要恢复这个摘录吗？',
                restore_success: '恢复成功',
                restore_error: '恢复失败',
                delete_error: '删除失败',
                empty_note_error: '内容不能为空',
                edit: '编辑',
                delete: '删除',
                restore: '恢复',
                copied: '已复制内容'
            },
            'en': {
                sidebar_title: 'iSnips',
                library_header_title: 'Knowledge Library',
                settings: 'Settings',
                search_placeholder: 'Search fragments...',
                loading: 'Searching...',
                no_clips_title: 'No fragments yet',
                no_clips_desc: 'Select web text and press Alt+C to capture the moment',
                no_results: 'No matching fragments',
                today: 'Today',
                yesterday: 'Yesterday',
                this_week: 'This Week',
                all_categories: 'All',
                web_clips: 'Clips',
                jotted_notes: 'Insights',
                scrap_trash: 'Trash',
                trash_info: 'Items in trash will be permanently deleted after 30 days.',
                empty_trash: 'Empty Trash',
                new_note: 'New Thought',
                cancel: 'Cancel',
                save: 'Save',
                just_now: 'Just now',
                minutes_ago: 'm ago',
                hours_ago: 'h ago',
                days_ago: 'd ago',
                restore_confirm: 'Are you sure you want to restore this snippet?',
                restore_success: 'Restored successfully',
                restore_error: 'Restore failed',
                delete_error: 'Delete failed',
                empty_note_error: 'Content cannot be empty',
                edit: 'Edit',
                delete: 'Delete',
                restore: 'Restore',
                copied: 'Copied to clipboard'
            },
            'ja': {
                sidebar_title: 'iSnips',
                library_header_title: '知識ライブラリ',
                settings: '設定',
                search_placeholder: 'スニペットを検索...',
                loading: '読み込み中...',
                no_clips_title: 'スニペットがありません',
                no_clips_desc: 'ウェブページのテキストを選択し、Ctrl+Cで保存',
                no_results: '一致する結果はありません',
                today: '今日',
                yesterday: '昨日',
                this_week: '今週',
                all_categories: 'すべて',
                web_clips: 'ウェブ',
                jotted_notes: '記した',
                scrap_trash: 'ゴミ箱',
                trash_info: 'ゴミ箱内の項目は30日後に永久に削除されます。',
                empty_trash: '今すぐゴミ箱を空にする',
                new_note: '新しいスニペット',
                cancel: 'キャンセル',
                save: '保存',
                just_now: 'たった今',
                minutes_ago: '分前',
                hours_ago: '時間前',
                days_ago: '日前',
                restore_confirm: 'このスニペットを復元してもよろしいですか？',
                restore_success: '復元に成功しました',
                restore_error: '復元に失敗しました',
                delete_error: '削除に失敗しました',
                empty_note_error: '内容は空にできません',
                edit: '編集',
                delete: '削除',
                restore: '復元',
                copied: 'コピーしました'
            }
        };
    }

    setLanguage(lang) {
        this.currentLanguage = lang;
        chrome.runtime.sendMessage({
            action: 'setSetting',
            key: 'language',
            value: lang
        });
        this.updateUI();
    }

    updateUI() {
        const t = this.translations[this.currentLanguage] || this.translations['en'] || this.translations['en'];

        // Update language select value
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.value = this.currentLanguage;
        }

        // Update document title
        document.title = t.library_header_title || t.sidebar_title || 'iSnips';

        // Update elements with data-i18n attributes
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (t[key]) {
                el.textContent = t[key];
            }
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            if (t[key]) {
                el.placeholder = t[key];
            }
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            if (t[key]) {
                el.placeholder = t[key];
            }
        });
    }

    async loadData() {
        try {
            console.log('Library: Loading data for category:', this.currentFilters.category);
            let result;

            if (this.currentFilters.category === 'scrap') {
                result = await chrome.runtime.sendMessage({ action: 'getDeletedSnippets' });
                console.log('Library: getDeletedSnippets result:', result);
            } else {
                result = await chrome.runtime.sendMessage({ action: 'getSnippets' });
                console.log('Library: getSnippets result:', result);
            }

            if (result && result.success) {
                this.cards = result.cards || [];
                console.log('Library: cards loaded:', this.cards.length, 'cards');

                // Log first card structure for debugging
                if (this.cards.length > 0) {
                    console.log('Library: First card structure:', this.cards[0]);
                }
            } else {
                console.error('Library: Failed to load cards:', result ? result.error : 'Unknown error');
                this.cards = [];
            }

            this.applyFilters();
        } catch (error) {
            console.error('Library: Failed to load data:', error);
            this.showEmptyState();
        }
    }

    applyFilters() {
        // Filter cards based on current filters
        let filtered = [...this.cards];

        // Apply category filter
        if (this.currentFilters.category !== 'all') {
            if (this.currentFilters.category === 'scrap') {
                // Trash is handled in loadData
            } else {
                // Map old category names to new ones if necessary for filtering existing data
                const cat = this.currentFilters.category;
                filtered = filtered.filter(card => {
                    if (cat === 'web') return card.type === 'web';
                    if (cat === 'jotted') return card.type === 'note';
                    return card.type === cat;
                });
            }
        }

        // Apply search filter
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(card =>
                (card.text || '').toLowerCase().includes(searchTerm) ||
                (card.domain || '').toLowerCase().includes(searchTerm)
            );
        }

        this.filteredCards = filtered;

        // Render the filtered cards
        this.renderCards();
    }

    renderCards() {
        const container = document.getElementById('cardsContainer');
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        const noResults = document.getElementById('noResults');

        // Hide loading state once we start rendering
        if (loadingState) {
            loadingState.style.display = 'none';
        }

        // Hide empty states initially
        emptyState.style.display = 'none';
        noResults.style.display = 'none';

        if (!this.filteredCards || this.filteredCards.length === 0) {
            // Clear container but keep loading state hidden
            const newContainer = document.createElement('div');
            newContainer.id = 'cardsContainer';
            newContainer.className = 'cards-flow'; // Matches CSS
            container.replaceWith(newContainer);

            // Show appropriate empty state
            if (this.currentFilters.search) {
                noResults.style.display = 'block';
            } else if (this.cards.length === 0) {
                emptyState.style.display = 'block';
            }
            return;
        }

        // Group cards by date
        const dateGroups = this.groupCardsByDate(this.filteredCards);

        // Create flow layout grouped by date
        const flowContainer = document.createElement('div');
        flowContainer.className = 'cards-container-flow';

        dateGroups.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'date-group';

            const groupTitle = document.createElement('div');
            groupTitle.className = 'date-group-title';
            groupTitle.textContent = group.title;
            groupDiv.appendChild(groupTitle);

            const cardsDiv = document.createElement('div');
            cardsDiv.className = 'cards-flow';

            // Get column count from CSS variable
            const colCount = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--column-count')) || 3;

            // Create columns
            const cols = [];
            for (let i = 0; i < colCount; i++) {
                const col = document.createElement('div');
                col.className = 'cards-column';
                cols.push(col);
                cardsDiv.appendChild(col);
            }

            group.cards.forEach((card, index) => {
                const cardElement = this.createCardElement(card);
                cols[index % colCount].appendChild(cardElement);
            });

            groupDiv.appendChild(cardsDiv);
            flowContainer.appendChild(groupDiv);
        });

        // Replace container content
        container.innerHTML = '';
        container.appendChild(flowContainer);
    }

    async performRestore(card) {
        try {
            const result = await chrome.runtime.sendMessage({
                action: 'restoreSnippet',
                cardId: card.id
            });

            if (result.success) {
                const cardIndex = this.cards.findIndex(c => c.id === card.id);
                if (cardIndex !== -1) {
                    this.cards.splice(cardIndex, 1);
                }
                const t = this.translations[this.currentLanguage] || this.translations['en'];
                this.showToast(t.restore_success || '恢复成功', true);
                this.applyFilters();
            } else {
                const t = this.translations[this.currentLanguage] || this.translations['en'];
                alert((t.restore_error || '恢复失败') + '：' + (result.error || '未知错误'));
            }
        } catch (error) {
            console.error('Restore error:', error);
            const t = this.translations[this.currentLanguage] || this.translations['en'];
            alert((t.restore_error || '恢复失败') + '：' + error.message);
        }
    }

    groupCardsByDate(cards) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const groups = {};
        const isTrash = this.currentFilters.category === 'scrap';

        cards.forEach(card => {
            const timestamp = isTrash ? card.deleted_at : card.created_at;
            const cardDate = new Date(timestamp);
            const cardDay = new Date(cardDate.getFullYear(), cardDate.getMonth(), cardDate.getDate());

            let groupKey;
            if (cardDay.getTime() === today.getTime()) {
                groupKey = this.translations[this.currentLanguage]?.today || '今天';
            } else if (cardDay.getTime() === yesterday.getTime()) {
                groupKey = this.translations[this.currentLanguage]?.yesterday || '昨天';
            } else if (cardDay >= weekAgo) {
                groupKey = this.translations[this.currentLanguage]?.this_week || '本周';
            } else {
                const locale = this.currentLanguage === 'zh-CN' ? 'zh-CN' : (this.currentLanguage === 'ja' ? 'ja-JP' : 'en-US');
                groupKey = cardDate.toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(card);
        });

        // Sort groups by date (newest first)
        const sortedGroups = Object.keys(groups).sort((a, b) => {
            // Check for today, yesterday, this week in all languages
            const todayLabels = [this.translations[this.currentLanguage]?.today || '今天', 'Today', '今日'];
            const yesterdayLabels = [this.translations[this.currentLanguage]?.yesterday || '昨天', 'Yesterday', '昨日'];
            const thisWeekLabels = [this.translations[this.currentLanguage]?.this_week || '本周', 'This Week', '今週'];

            if (todayLabels.includes(a)) return -1;
            if (todayLabels.includes(b)) return 1;
            if (yesterdayLabels.includes(a)) return -1;
            if (yesterdayLabels.includes(b)) return 1;
            if (thisWeekLabels.includes(a)) return -1;
            if (thisWeekLabels.includes(b)) return 1;

            // Parse date strings for comparison
            const dateA = new Date(a.replace(/年|月/g, '-').replace('日', ''));
            const dateB = new Date(b.replace(/年|月/g, '-').replace('日', ''));
            return dateB.getTime() - dateA.getTime();
        });

        return sortedGroups.map(groupKey => ({
            title: groupKey,
            cards: groups[groupKey].sort((a, b) => (isTrash ? b.deleted_at : b.created_at) - (isTrash ? a.deleted_at : a.created_at))
        }));
    }

    createCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'clip-card';
        cardDiv.dataset.cardId = card.id;

        const isTrash = this.currentFilters.category === 'scrap';
        const dateToShow = isTrash ? card.deleted_at : card.created_at;

        if (isTrash) {
            // Trash view: Only Restore button
            const t = this.translations[this.currentLanguage] || this.translations['en'];
            cardDiv.innerHTML = `
        <button class="restore-btn" title="${t.restore || '恢复'}">${t.restore || '恢复'}</button>
        <div class="clip-text">${this.escapeHtml(card.text)}</div>
        <div class="clip-meta">
          <div class="clip-domain">${this.escapeHtml(card.domain || '')}</div>
          <div class="clip-date">${this.formatDate(dateToShow)}</div>
        </div>
      `;

            const restoreBtn = cardDiv.querySelector('.restore-btn');
            restoreBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const t = this.translations[this.currentLanguage] || this.translations['en'];
                if (confirm(t.restore_confirm || '确定要恢复这个摘录吗？')) {
                    this.performRestore(card);
                }
            });
        } else {
            // Normal view: Edit and Delete buttons
            const t = this.translations[this.currentLanguage] || this.translations['en'];
            cardDiv.innerHTML = `
        <button class="edit-btn" title="${t.edit || '编辑'}">${t.edit || '编辑'}</button>
        <button class="delete-btn" title="${t.delete || '删除'}">${t.delete || '删除'}</button>
        <div class="clip-text">${this.escapeHtml(card.text)}</div>
        <div class="clip-meta">
          <div class="clip-domain">${this.escapeHtml(card.domain || '')}</div>
          <div class="clip-date">${this.formatDate(dateToShow)}</div>
        </div>
      `;

            const editBtn = cardDiv.querySelector('.edit-btn');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.enterEditMode(cardDiv, card);
            });

            const deleteBtn = cardDiv.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    const result = await chrome.runtime.sendMessage({
                        action: 'softDeleteSnippet',
                        cardId: card.id
                    });

                    if (result.success) {
                        const cardIndex = this.cards.findIndex(c => c.id === card.id);
                        if (cardIndex !== -1) {
                            this.cards.splice(cardIndex, 1);
                        }
                        this.applyFilters();
                    } else {
                        const t = this.translations[this.currentLanguage] || this.translations['en'];
                        alert((t.delete_error || '删除失败') + '：' + (result.error || '未知错误'));
                    }
                } catch (error) {
                    console.error('Delete error:', error);
                    const t = this.translations[this.currentLanguage] || this.translations['en'];
                    alert((t.delete_error || '删除失败') + '：' + error.message);
                }
            });
        }

        // Click behavior
        const domainEl = cardDiv.querySelector('.clip-domain');
        if (domainEl && card.url && !isTrash) {
            domainEl.title = card.url;
            domainEl.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    await chrome.runtime.sendMessage({
                        action: 'openTab',
                        url: card.url
                    });
                } catch (error) {
                    window.open(card.url, '_blank');
                }
            });
        }

        // Card click (Copy behavior for normal cards, restoration for trash)
        cardDiv.addEventListener('click', (e) => {
            // Don't trigger if clicking buttons or in edit mode
            if (cardDiv.classList.contains('editing') ||
                e.target.closest('.edit-btn') ||
                e.target.closest('.delete-btn') ||
                e.target.closest('.restore-btn') ||
                e.target.closest('.clip-domain')) {
                return;
            }

            if (isTrash) {
                const t = this.translations[this.currentLanguage] || this.translations['en'];
                if (confirm(t.restore_confirm || '确定要恢复这个摘录吗？')) {
                    this.performRestore(card);
                }
            } else {
                // Copy to clipboard
                navigator.clipboard.writeText(card.text).then(() => {
                    const t = this.translations[this.currentLanguage] || this.translations['en'];
                    this.showToast(t.copied || '已复制内容', true);
                });
            }
        });

        return cardDiv;
    }

    enterEditMode(cardDiv, card) {
        cardDiv.classList.add('editing');

        const editBtn = cardDiv.querySelector('.edit-btn');
        const clipText = cardDiv.querySelector('.clip-text');
        const clipMeta = cardDiv.querySelector('.clip-meta');

        if (editBtn) editBtn.style.display = 'none';

        const t = this.translations[this.currentLanguage] || this.translations['en'];
        const textarea = document.createElement('textarea');
        textarea.className = 'edit-textarea';
        textarea.value = card.text;
        textarea.placeholder = t.search_placeholder || '输入摘录内容...';

        clipText.replaceWith(textarea);
        clipMeta.style.display = 'none';

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'edit-actions';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-small btn-save';
        saveBtn.textContent = t.save || '保存';
        saveBtn.addEventListener('click', () => this.saveEdit(cardDiv, card, textarea.value));

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-small btn-cancel';
        cancelBtn.textContent = t.cancel || '取消';
        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cancelEdit(cardDiv, card);
        });

        actionsDiv.appendChild(cancelBtn);
        actionsDiv.appendChild(saveBtn);
        cardDiv.appendChild(actionsDiv);

        setTimeout(() => textarea.focus(), 0);
    }

    async saveEdit(cardDiv, card, newText) {
        const t = this.translations[this.currentLanguage] || this.translations['en'];
        if (!newText.trim()) {
            alert(t.empty_note_error || '摘录内容不能为空');
            return;
        }

        try {
            const result = await chrome.runtime.sendMessage({
                action: 'updateSnippet',
                cardId: card.id,
                updates: { text: newText.trim() }
            });

            if (result.success) {
                const cardIndex = this.cards.findIndex(c => c.id === card.id);
                if (cardIndex !== -1) {
                    this.cards[cardIndex].text = newText.trim();
                    this.cards[cardIndex].updated_at = Date.now();
                }
                this.applyFilters();
            } else {
                alert((t.save_error || '保存失败') + '：' + (result.error || '未知错误'));
            }
        } catch (error) {
            console.error('Save edit error:', error);
            alert((t.save_error || '保存失败') + '：' + error.message);
        }
    }

    cancelEdit(cardDiv, card) {
        this.applyFilters(); // simplest way to reset
    }

    showEmptyState() {
        const container = document.getElementById('cardsContainer');
        container.innerHTML = '';
        const emptyState = document.getElementById('emptyState');
        if (emptyState) emptyState.style.display = 'block';
    }

    checkUrlHash() {
        const hash = window.location.hash;
        if (hash.startsWith('#card-')) {
            const cardId = hash.substring(6);
            this.highlightCard(cardId);
        }
    }

    highlightCard(cardId) {
        const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
        if (cardElement) {
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            cardElement.style.boxShadow = '0 0 0 3px #3b82f6';
            setTimeout(() => { cardElement.style.boxShadow = ''; }, 2000);
        }
    }

    formatDate(timestamp) {
        const t = this.translations[this.currentLanguage] || this.translations['en'];
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        if (diff < 60000) return t.just_now || '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}${t.minutes_ago || '分钟前'}`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}${t.hours_ago || '小时前'}`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}${t.days_ago || '天前'}`;
        const locale = this.currentLanguage === 'zh-CN' ? 'zh-CN' : (this.currentLanguage === 'ja' ? 'ja-JP' : 'en-US');
        return date.toLocaleDateString(locale);
    }

    setCategory(category) {
        this.currentFilters.category = category;
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === category) btn.classList.add('active');
        });
        const trashControls = document.getElementById('trashControls');
        if (trashControls) trashControls.style.display = (category === 'scrap') ? 'block' : 'none';
        this.loadData();
    }

    showNewNoteModal() {
        const modal = document.getElementById('newNoteModal');
        const textarea = document.getElementById('newNoteTextarea');
        if (modal && textarea) {
            textarea.value = '';
            modal.style.display = 'flex';
            setTimeout(() => textarea.focus(), 100);
        }
    }

    hideNewNoteModal() {
        const modal = document.getElementById('newNoteModal');
        if (modal) modal.style.display = 'none';
    }

    async saveNewNote() {
        const textarea = document.getElementById('newNoteTextarea');
        const noteText = textarea ? textarea.value.trim() : '';
        const t = this.translations[this.currentLanguage] || this.translations['en'];
        if (!noteText) {
            alert(t.empty_note_error || '内容不能为空');
            return;
        }

        try {
            const cardData = {
                url: null,
                type: 'note',
                text: noteText.slice(0, 144),
                domain: null,
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
                this.hideNewNoteModal();
                this.loadData();
            } else {
                const t = this.translations[this.currentLanguage] || this.translations['en'];
                alert((t.save_error || '保存随笔失败') + '：' + (result.error || '未知错误'));
            }
        } catch (error) {
            console.error('Save note error:', error);
            const t = this.translations[this.currentLanguage] || this.translations['en'];
            alert((t.save_error || '保存随笔失败') + '：' + error.message);
        }
    }

    // Not used in library view but kept for consistency if needed
    saveNote() { }
    clearNote() { }

    showToast(message, isSuccess) {
        const toast = document.createElement('div');
        toast.style.cssText = `
      position: fixed; top: 20px; right: 20px;
      background: ${isSuccess ? '#10b981' : '#ef4444'};
      color: white; padding: 12px 16px; border-radius: 6px;
      z-index: 1000; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    async emptyTrash() {
        const t = this.translations[this.currentLanguage] || this.translations['en'];
        if (!confirm(t.clear_confirm || '确定要清空回收站吗？此操作不可撤销。')) return;
        try {
            const result = await chrome.runtime.sendMessage({ action: 'emptyTrash' });
            if (result.success) {
                this.cards = [];
                this.applyFilters();
                this.showToast('回收站已清空', true);
            }
        } catch (error) {
            console.error('Empty trash error:', error);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new iSnipsSidebar();
});
