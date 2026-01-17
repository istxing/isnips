import { useState, useCallback } from 'react';
import { Language, Translations } from '../types';

const translations: Translations = {
  'zh-CN': {
    library_title: 'ClipIndex - 摘录库',
    settings: '设置',
    search_placeholder: '搜索摘录内容、域名...',
    loading: '加载中...',
    no_clips_title: '暂无摘录',
    no_clips_desc: '选中网页文本后按 Ctrl+C 保存',
    no_results: '无匹配结果'
  },
  'en': {
    library_title: 'ClipIndex - Clip Library',
    settings: 'Settings',
    search_placeholder: 'Search clips, domains...',
    loading: 'Loading...',
    no_clips_title: 'No clips yet',
    no_clips_desc: 'Select text on web pages and press Ctrl+C to save',
    no_results: 'No matching results'
  },
  'ja': {
    library_title: 'ClipIndex - クリップライブラリ',
    settings: '設定',
    search_placeholder: 'クリップ内容、ドメインを検索...',
    loading: '読み込み中...',
    no_clips_title: 'クリップがありません',
    no_clips_desc: 'ウェブページのテキストを選択し、Ctrl+Cで保存',
    no_results: '一致する結果がありません'
  }
};

export const useI18n = () => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('zh-CN');

  const t = useCallback((key: string, fallback?: string): string => {
    const langTranslations = translations[currentLanguage] || translations['zh-CN'];
    return langTranslations[key] || fallback || key;
  }, [currentLanguage]);

  const setLanguage = useCallback((lang: Language) => {
    setCurrentLanguage(lang);
  }, []);

  return { t, setLanguage, currentLanguage };
};
