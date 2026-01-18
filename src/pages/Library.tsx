import React, { useState, useEffect } from 'react';
import { ClipCard, Language } from '../types';
import { ClipCardComponent, SearchBar, EmptyState } from '../components';
import { useChromeMessaging, useI18n } from '../hooks';

const Library: React.FC = () => {
  const [cards, setCards] = useState<ClipCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<ClipCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const { sendMessage } = useChromeMessaging();
  const { t, setLanguage, currentLanguage } = useI18n();

  // Load cards on mount
  useEffect(() => {
    loadCards();
  }, []);

  // Filter cards when search query or language changes
  useEffect(() => {
    filterCards();
  }, [cards, searchQuery, currentLanguage]);

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

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = event.target.value as Language;
    console.log('Library: Changing language to:', lang);
    setLanguage(lang);
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

  const groupCardsByDate = (cards: ClipCard[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: { [key: string]: ClipCard[] } = {};

    cards.forEach(card => {
      const cardDate = new Date(card.createdAt);
      const cardDay = new Date(cardDate.getFullYear(), cardDate.getMonth(), cardDate.getDate());

      let groupKey: string;
      if (cardDay.getTime() === today.getTime()) {
        groupKey = t('today', '今天');
      } else if (cardDay.getTime() === yesterday.getTime()) {
        groupKey = t('yesterday', '昨天');
      } else if (cardDay >= weekAgo) {
        groupKey = t('this_week', '本周');
      } else {
        // Format as YYYY-MM-DD
        groupKey = cardDate.toLocaleDateString('zh-CN', {
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
      const todayLabels = [t('today', '今天'), 'Today', '今日'];
      const yesterdayLabels = [t('yesterday', '昨天'), 'Yesterday', '昨日'];
      const thisWeekLabels = [t('this_week', '本周'), 'This Week', '今週'];

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
      cards: groups[groupKey].sort((a, b) => b.createdAt - a.createdAt) // Sort cards within group by time
    }));
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

    const cardGroups = groupCardsByDate(filteredCards);

    return (
      <div className="cards-waterfall">
        {cardGroups.map(group => (
          <div key={group.title} className="date-group">
            <h2 className="date-group-title">
              {group.title}
            </h2>

            {/* Create 3 columns for waterfall layout within each date group */}
            <div className="waterfall-grid">
              {(() => {
                const columns: ClipCard[][] = [[], [], []];
                group.cards.forEach((card, index) => {
                  columns[index % 3].push(card);
                });

                return columns.map((columnCards, columnIndex) => (
                  <div key={columnIndex} className="waterfall-column">
                    {columnCards.map((card) => (
                      <ClipCardComponent
                        key={card.id}
                        card={card}
                        onClick={() => handleCardClick(card)}
                      />
                    ))}
                  </div>
                ));
              })()}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1>{t('library_title', 'ClipIndex')}</h1>
          <div className="header-controls">
            <select
              value={currentLanguage}
              onChange={handleLanguageChange}
              className="language-select"
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
      <main className="main-content">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('search_placeholder', '搜索摘录内容、域名...')}
        />

        <div className="cards-container">
          {renderCards()}
        </div>
      </main>
    </div>
  );
};

export default Library;
