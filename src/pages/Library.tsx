import React, { useState, useEffect } from 'react';
import { ClipCard, Language } from '../types';
import { ClipCardComponent, SearchBar, EmptyState } from '../components';
import { useChromeMessaging, useI18n } from '../hooks';

const Library: React.FC = () => {
  const [cards, setCards] = useState<ClipCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<ClipCard[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<Language>('zh-CN');
  const [searchQuery, setSearchQuery] = useState('');

  const { sendMessage } = useChromeMessaging();
  const { t, setLanguage } = useI18n();

  // Load cards on mount
  useEffect(() => {
    loadCards();
    loadLanguage();
  }, []);

  // Filter cards when search query changes
  useEffect(() => {
    filterCards();
  }, [cards, searchQuery]);

  const loadCards = async () => {
    try {
      const response = await sendMessage({ action: 'getIndexCards' });
      if (response.success) {
        setCards(response.cards || []);
      }
    } catch (error) {
      console.error('Failed to load cards:', error);
    }
  };

  const loadLanguage = async () => {
    try {
      const response = await sendMessage({
        action: 'getSetting',
        key: 'language',
        defaultValue: 'zh-CN'
      });
      if (response.success) {
        setCurrentLanguage(response.value);
        setLanguage(response.value);
      }
    } catch (error) {
      console.error('Failed to load language:', error);
    }
  };

  const filterCards = () => {
    if (!searchQuery.trim()) {
      setFilteredCards(cards);
      return;
    }

    const filtered = cards.filter(card =>
      card.clipText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (card.title && card.title.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Sort by creation date (newest first)
    filtered.sort((a, b) => b.createdAt - a.createdAt);
    setFilteredCards(filtered);
  };

  const handleLanguageChange = async (lang: Language) => {
    setCurrentLanguage(lang);
    setLanguage(lang);

    try {
      await sendMessage({
        action: 'setSetting',
        key: 'language',
        value: lang
      });
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  };

  const handleCardClick = async (card: ClipCard) => {
    try {
      await sendMessage({
        action: 'openTab',
        url: card.url
      });
    } catch (error) {
      console.error('Failed to open tab:', error);
    }
  };

  const renderCards = () => {
    if (filteredCards.length === 0) {
      if (cards.length === 0) {
        return <EmptyState />;
      }
      return (
        <div className="col-span-full text-center py-12 text-gray-500">
          {t('no_results', '无匹配结果')}
        </div>
      );
    }

    // Create 3 columns for waterfall layout
    const columns: ClipCard[][] = [[], [], []];

    filteredCards.forEach((card, index) => {
      columns[index % 3].push(card);
    });

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((columnCards, columnIndex) => (
          <div key={columnIndex} className="waterfall-column">
            {columnCards.map((card) => (
              <ClipCardComponent
                key={card.id}
                card={card}
                onClick={() => handleCardClick(card)}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">ClipIndex</h1>
          <div className="flex items-center gap-4">
            <select
              value={currentLanguage}
              onChange={(e) => handleLanguageChange(e.target.value as Language)}
              className="select-field"
            >
              <option value="zh-CN">中文</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
            <button
              onClick={async () => {
                try {
                  await sendMessage({ action: 'openSettings' });
                } catch (error) {
                  console.error('Failed to open settings:', error);
                }
              }}
              className="btn btn-secondary"
            >
              {t('settings', '设置')}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('search_placeholder', '搜索摘录内容、域名...')}
        />

        <div className="mt-8">
          {renderCards()}
        </div>
      </main>
    </div>
  );
};

export default Library;
