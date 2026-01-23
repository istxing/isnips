/**
 * iSnips Theme Manager
 * Handles light/dark mode switching and Apple-style UI enhancement
 */

(function () {
    const themeManager = {
        currentTheme: 'auto',

        async init() {
            // 1. Get current theme setting
            try {
                const result = await chrome.runtime.sendMessage({
                    action: 'getSetting',
                    key: 'appearance',
                    defaultValue: 'auto'
                });
                this.currentTheme = result.success ? result.value : 'auto';
                this.applyTheme(this.currentTheme);
            } catch (e) {
                console.error('ThemeManager: Failed to load theme setting', e);
                this.applyTheme('auto');
            }

            // 2. Listen for theme change messages
            chrome.runtime.onMessage.addListener((message) => {
                if (message.action === 'themeChanged') {
                    this.applyTheme(message.theme);
                }
            });

            // 3. Listen for system theme changes if in 'auto' mode
            const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkQuery.addEventListener('change', () => {
                if (this.currentTheme === 'auto') {
                    this.applyTheme('auto');
                }
            });

            // Expose to window for manual triggering
            window.applyTheme = (theme) => this.applyTheme(theme);
        },

        applyTheme(theme) {
            this.currentTheme = theme;
            let effectiveTheme = theme;

            if (theme === 'auto') {
                effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }

            // Applying to document element
            document.documentElement.setAttribute('data-theme', effectiveTheme);

            // Also potentially apply a class to body for older CSS selector support
            document.body.classList.remove('theme-light', 'theme-dark');
            document.body.classList.add(`theme-${effectiveTheme}`);

            console.log(`ThemeManager: Applied ${effectiveTheme} theme (original: ${theme})`);
        }
    };

    // Initialize when DOM is ready or immediately if it is
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => themeManager.init());
    } else {
        themeManager.init();
    }
})();
