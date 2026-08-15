'use client';

import React, { useState } from 'react';
import { RecordModel, RecordType } from '@/types';
import { RecordCard } from '@/components/RecordCard';

const MOCK_RECORDS: RecordModel[] = [
  {
    id: 'rec_1',
    user_id: 'usr_1',
    type: 'bookmark',
    title: 'Next.js 14 App Router 官方架构与最佳实践',
    content: '深入探讨了 React Server Components、流式渲染与数据缓存策略。',
    source_url: 'https://nextjs.org/docs',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['Frontend', 'Nextjs', 'React'],
    privacy: false,
    metadata: {},
    version: 1,
  },
  {
    id: 'rec_2',
    user_id: 'usr_1',
    type: 'idea',
    title: '关于 iSnips 端到端加密 Master Key 体系的思考',
    content: '用户主密码通过 Argon2id 派生 Master Key，客户端加密后上传云端，AI 默认不可见。',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['Security', 'Crypto', 'Architecture'],
    privacy: true,
    metadata: {},
    version: 1,
  },
  {
    id: 'rec_3',
    user_id: 'usr_1',
    type: 'clip',
    title: 'SQLite FTS5 Unicode61 分词器特性配置说明',
    content: 'FTS5 支持 unicode61 分词器，可直接用于本地离线快速搜索中英文文本。',
    source_url: 'https://sqlite.org/fts5.html',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['Database', 'SQLite'],
    privacy: false,
    metadata: {},
    version: 1,
  },
];

export default function IndexPage() {
  const [records, setRecords] = useState<RecordModel[]>(MOCK_RECORDS);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<RecordType>('note');
  const [newPrivacy, setNewPrivacy] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newRec: RecordModel = {
      id: `rec_${Date.now()}`,
      user_id: 'usr_1',
      type: newType,
      title: newTitle,
      content: newContent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: ['Manual'],
      privacy: newPrivacy,
      metadata: {},
      version: 1,
    };

    setRecords([newRec, ...records]);
    setNewTitle('');
    setNewContent('');
    setShowNewModal(false);
  };

  const handleDelete = (id: string) => {
    setRecords(records.filter((r) => r.id !== id));
  };

  const filtered = selectedType === 'all'
    ? records
    : records.filter((r) => r.type === selectedType);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            个人索引库 (Personal Index)
          </h1>
          <p className="text-sm text-slate-500">
            共沉淀 {records.length} 条记录，统一检索、过滤与分类。
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          + 手动录入记录
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['all', 'bookmark', 'clip', 'note', 'idea', 'rss'].map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              selectedType === t
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            {t === 'all' ? '全部类型' : t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((record) => (
          <RecordCard
            key={record.id}
            record={record}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold">新增一条信息记录</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">标题</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">类型</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as RecordType)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="note">Note (笔记)</option>
                  <option value="idea">Idea (想法)</option>
                  <option value="bookmark">Bookmark (书签)</option>
                  <option value="clip">Clip (剪藏)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">内容</label>
                <textarea
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="privacy"
                  checked={newPrivacy}
                  onChange={(e) => setNewPrivacy(e.target.checked)}
                />
                <label htmlFor="privacy" className="text-xs text-slate-600 dark:text-slate-400">
                  🔒 标记为隐私记录（客户端端到端加密）
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs border rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  保存记录
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
