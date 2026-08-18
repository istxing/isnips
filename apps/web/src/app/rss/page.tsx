'use client';

import React, { useState, useEffect } from 'react';
import { RSSFeed, FeedItem } from '../../types';
import { ApiClient } from '../../lib/api-client';
import { Plus, Sparkles, ExternalLink, Check } from 'lucide-react';

export default function RSSPage() {
  const [feeds, setFeeds] = useState<RSSFeed[]>([]);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [selectedFeedId, setSelectedFeedId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // 添加订阅源表单状态
  const [isAddingFeed, setIsAddingFeed] = useState(false);
  const [feedTitle, setFeedTitle] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [feedCategory, setFeedCategory] = useState('科技');

  const loadRSSData = async () => {
    try {
      setLoading(true);
      const [f, it] = await Promise.all([
        ApiClient.getFeeds(),
        ApiClient.getFeedItems(),
      ]);
      setFeeds(f);
      setItems(it);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRSSData();
  }, []);

  const handleAddFeedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedTitle.trim() || !feedUrl.trim()) return;

    await ApiClient.addFeed(feedTitle.trim(), feedUrl.trim(), feedCategory);
    setFeedTitle('');
    setFeedUrl('');
    setIsAddingFeed(false);
    await loadRSSData();
  };

  const handleSaveToRecord = async (item: FeedItem) => {
    await ApiClient.saveFeedItemToRecord(item);
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, is_saved: true } : it))
    );
  };

  const filteredItems = items.filter((it) => {
    if (selectedFeedId === 'all') return true;
    return it.feed_id === selectedFeedId;
  });

  return (
    <div className="space-y-4 w-full max-w-4xl mx-auto py-1">
      {/* 顶部标题与添加订阅源 */}
      <div className="flex items-center justify-between gap-3 border-b border-black/8 dark:border-white/8 pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-apple-text dark:text-apple-text-dark">
            RSS 订阅
          </h1>
          <span className="text-xs text-apple-text-tertiary">· {items.length} 篇文章</span>
        </div>

        <button
          onClick={() => setIsAddingFeed(!isAddingFeed)}
          className="text-xs font-medium text-apple-blue hover:underline flex items-center gap-1"
        >
          <Plus size={13} />
          <span>{isAddingFeed ? '收起' : '添加源'}</span>
        </button>
      </div>

      {/* 添加订阅源表单 (极简单线) */}
      {isAddingFeed && (
        <form
          onSubmit={handleAddFeedSubmit}
          className="p-3 border-b border-black/8 dark:border-white/8 space-y-2"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              required
              placeholder="订阅源名称"
              value={feedTitle}
              onChange={(e) => setFeedTitle(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-black/10 bg-transparent text-xs text-apple-text focus:outline-none"
            />
            <input
              type="url"
              required
              placeholder="订阅链接"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-black/10 bg-transparent text-xs text-apple-text focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-md bg-apple-text text-white text-xs font-medium"
            >
              确认添加
            </button>
          </div>
        </form>
      )}

      {/* 订阅源分类横向切换栏 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setSelectedFeedId('all')}
          className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
            selectedFeedId === 'all'
              ? 'bg-apple-text dark:bg-white text-white dark:text-apple-text font-medium'
              : 'text-apple-text-secondary hover:text-apple-text hover:bg-black/4'
          }`}
        >
          全部
        </button>

        {feeds.map((feed) => (
          <button
            key={feed.id}
            onClick={() => setSelectedFeedId(feed.id)}
            className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
              selectedFeedId === feed.id
                ? 'bg-apple-text dark:bg-white text-white dark:text-apple-text font-medium'
                : 'text-apple-text-secondary hover:text-apple-text hover:bg-black/4'
            }`}
          >
            {feed.title}
          </button>
        ))}
      </div>

      {/* 文章纯线条流 */}
      {loading ? (
        <div className="py-20 text-center text-xs text-apple-text-tertiary">
          加载中...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 text-center text-xs text-apple-text-tertiary">
          当前暂无新文章
        </div>
      ) : (
        <div className="divide-y divide-black/6 dark:divide-white/8">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="py-3 px-1 space-y-1.5 hover:bg-black/[0.02] rounded-lg transition-colors group"
            >
              <div className="flex items-baseline justify-between gap-3">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-base text-apple-text dark:text-apple-text-dark hover:text-apple-blue transition-colors leading-snug"
                >
                  {item.title}
                </a>

                <span className="text-[11px] text-apple-text-tertiary shrink-0">
                  {item.feed_title}
                </span>
              </div>

              <p className="text-apple-text-secondary dark:text-apple-text-dark-secondary text-sm leading-relaxed line-clamp-2">
                {item.snippet}
              </p>

              {/* AI 智能总结标牌 (单线轻量) */}
              {item.ai_summary && (
                <div className="pl-3 border-l-2 border-apple-blue py-1 my-1 text-xs text-apple-text-secondary">
                  <span className="font-semibold text-apple-blue mr-1">✦ 提炼:</span>
                  <span>{item.ai_summary}</span>
                </div>
              )}

              {/* 底部时间与操作 */}
              <div className="flex items-center justify-between text-xs text-apple-text-tertiary pt-0.5">
                <span>{new Date(item.published_at).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}</span>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSaveToRecord(item)}
                    disabled={item.is_saved}
                    className={`text-xs flex items-center gap-0.5 ${
                      item.is_saved
                        ? 'text-emerald-600 font-medium'
                        : 'hover:text-apple-text'
                    }`}
                  >
                    {item.is_saved ? <Check size={12} /> : <Plus size={12} />}
                    <span>{item.is_saved ? '已存' : '存入索引'}</span>
                  </button>

                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-apple-blue hover:underline flex items-center gap-0.5"
                  >
                    <span>原文</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
