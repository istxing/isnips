import React, { useState, useCallback, useContext, createContext, useEffect, useMemo } from 'react';
import { Language, Translations } from '../types';

const translations: Translations = {
  'zh-CN': {
    library_title: 'ClipIndex - 摘录库',
    settings: '设置',
    search_placeholder: '搜索摘录内容、域名...',
    loading: '加载中...',
    no_clips_title: '暂无摘录',
    no_clips_desc: '选中网页文本后按 Ctrl+C 保存',
    no_results: '无匹配结果',
    today: '今天',
    yesterday: '昨天',
    this_week: '本周'
  },
  'en': {
    library_title: 'ClipIndex - Clip Library',
    settings: 'Settings',
    search_placeholder: 'Search clips, domains...',
    loading: 'Loading...',
    no_clips_title: 'No clips yet',
    no_clips_desc: 'Select text on web pages and press Ctrl+C to save',
    no_results: 'No matching results',
    today: 'Today',
    yesterday: 'Yesterday',
    this_week: 'This Week'
  },
  'ja': {
    library_title: 'ClipIndex - クリップライブラリ',
    settings: '設定',
    search_placeholder: 'クリップ内容、ドメインを検索...',
    loading: '読み込み中...',
    no_clips_title: 'クリップがありません',
    no_clips_desc: 'ウェブページのテキストを選択し、Ctrl+Cで保存',
    no_results: '一致する結果がありません',
    today: '今日',
    yesterday: '昨日',
    this_week: '今週'
  }
};

interface I18nContextType {
  currentLanguage: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('zh-CN');

  // Load language setting on mount and listen for changes
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        if (chrome && chrome.runtime) {
          const result = await chrome.runtime.sendMessage({
            action: 'getSetting',
            key: 'language',
            defaultValue: 'zh-CN'
          });
          if (result.success) {
            setCurrentLanguage(result.value);
          }
        }
      } catch (error) {
        console.error('Failed to load language setting:', error);
      }
    };

    loadLanguage();

    // Listen for runtime messages for real-time language updates
    const handleRuntimeMessage = (message: any, sender: any, sendResponse: any) => {
      if (message.action === 'languageChanged') {
        console.log('Language changed via runtime message:', message.language);
        setCurrentLanguage(message.language);
      }
    };

    // Also poll for language changes every 2 seconds as fallback
    const pollLanguage = async () => {
      try {
        if (chrome && chrome.runtime) {
          const result = await chrome.runtime.sendMessage({
            action: 'getSetting',
            key: 'language',
            defaultValue: 'zh-CN'
          });
          if (result.success && result.value !== currentLanguage) {
            console.log('Language changed via polling:', result.value);
            setCurrentLanguage(result.value);
          }
        }
      } catch (error) {
        // Ignore polling errors
      }
    };

    if (chrome && chrome.runtime) {
      chrome.runtime.onMessage.addListener(handleRuntimeMessage);

      // Start polling as fallback
      const pollInterval = setInterval(pollLanguage, 2000);

      return () => {
        chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
        clearInterval(pollInterval);
      };
    }
  }, [currentLanguage]);

  const t = useCallback((key: string, fallback?: string): string => {
    const langTranslations = translations[currentLanguage] || translations['zh-CN'];
    return langTranslations[key] || fallback || key;
  }, [currentLanguage]);

  const setLanguage = useCallback(async (lang: Language) => {
    console.log('I18nProvider: Setting language to', lang);
    setCurrentLanguage(lang);

    // Save to storage
    try {
      if (chrome && chrome.runtime) {
        await chrome.runtime.sendMessage({
          action: 'setSetting',
          key: 'language',
          value: lang
        });
      }
    } catch (error) {
      console.error('Failed to save language setting:', error);
    }
  }, []);

  const value = useMemo(() => ({
    currentLanguage,
    setLanguage,
    t
  }), [currentLanguage, setLanguage, t]);

  return React.createElement(I18nContext.Provider, { value }, children);
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
