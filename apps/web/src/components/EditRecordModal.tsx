'use client';

import React, { useState, useEffect } from 'react';
import { RecordModel, RecordType } from '../types';
import { ApiClient } from '../lib/api-client';
import { Zap, Scissors, ClipboardList, Lightbulb, Bookmark, X, Lock } from 'lucide-react';

interface EditRecordModalProps {
  record: RecordModel | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TYPE_OPTIONS: { type: RecordType; label: string; icon: React.ReactNode }[] = [
  { type: 'note', label: '闪记', icon: <Zap size={13} /> },
  { type: 'clip', label: '片段', icon: <Scissors size={13} /> },
  { type: 'clipboard', label: '剪贴板', icon: <ClipboardList size={13} /> },
  { type: 'idea', label: '灵感', icon: <Lightbulb size={13} /> },
  { type: 'bookmark', label: '书签', icon: <Bookmark size={13} /> },
];

export const EditRecordModal: React.FC<EditRecordModalProps> = ({
  record,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [type, setType] = useState<RecordType>('note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [privacy, setPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (record) {
      setType(record.type);
      setTitle(record.title);
      setContent(record.content);
      setSourceUrl(record.source_url || '');
      setPrivacy(record.privacy);
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;

    setIsSubmitting(true);
    try {
      await ApiClient.updateRecord(record.id, {
        type,
        title: title.trim(),
        content: content.trim(),
        source_url: sourceUrl.trim() || undefined,
        privacy,
      });

      onSuccess?.();
    } catch (e) {
      console.error(e);
      alert('更新记录失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl max-w-lg w-full p-6 shadow-apple-lg border border-black/10 dark:border-white/10 space-y-4 text-sm">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3.5">
          <h3 className="font-semibold text-base text-apple-text dark:text-apple-text-dark">
            编辑记录
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-apple-text-tertiary hover:text-apple-text"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 分类选项 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {TYPE_OPTIONS.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => setType(item.type)}
                className={`px-3 py-1.5 rounded-xl text-xs transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  type === item.type
                    ? 'bg-apple-text dark:bg-white text-white dark:text-apple-text font-medium'
                    : 'bg-black/4 dark:bg-white/6 hover:bg-black/8 text-apple-text-secondary dark:text-apple-text-dark-secondary'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-apple-text-secondary dark:text-apple-text-dark-secondary mb-1.5">
              标题
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/8 dark:border-white/10 bg-apple-bg dark:bg-[#2C2C2E] text-sm text-apple-text dark:text-apple-text-dark focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-apple-text-secondary dark:text-apple-text-dark-secondary mb-1.5">
              正文内容
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/8 dark:border-white/10 bg-apple-bg dark:bg-[#2C2C2E] text-sm text-apple-text dark:text-apple-text-dark focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-apple-text-secondary dark:text-apple-text-dark-secondary mb-1.5">
              来源链接
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-black/8 dark:border-white/10 bg-apple-bg dark:bg-[#2C2C2E] text-xs text-apple-text dark:text-apple-text-dark focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-black/6 dark:border-white/8 bg-apple-bg dark:bg-[#2C2C2E]">
            <div className="text-xs">
              <span className="font-medium text-apple-text dark:text-apple-text-dark flex items-center gap-1">
                <Lock size={12} />
                <span>隐私记录</span>
              </span>
            </div>
            <input
              type="checkbox"
              checked={privacy}
              onChange={(e) => setPrivacy(e.target.checked)}
              className="h-4 w-4 rounded text-apple-blue focus:ring-0 cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-black/5 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-black/8 dark:border-white/10 text-apple-text-secondary hover:text-apple-text text-xs"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-apple-blue hover:bg-apple-blue-hover text-white font-medium shadow-apple-sm text-xs btn-press"
            >
              {isSubmitting ? '保存中...' : '更新记录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
