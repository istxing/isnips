'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../lib/api-client';
import { RecordModel, DocumentModel, ReportModel } from '../types';
import { Search, FileText, Sparkles, Inbox, CornerDownLeft, X } from 'lucide-react';

interface SpotlightModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpotlightModal: React.FC<SpotlightModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState<RecordModel[]>([]);
  const [documents, setDocuments] = useState<DocumentModel[]>([]);
  const [reports, setReports] = useState<ReportModel[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      fetchAll();
    }
  }, [isOpen]);

  const fetchAll = async () => {
    try {
      const [recs, docs, reps] = await Promise.all([
        ApiClient.getRecords(),
        ApiClient.getDocuments(),
        ApiClient.getReports(),
      ]);
      setRecords(recs);
      setDocuments(docs);
      setReports(reps);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredItems = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const items: Array<{
      id: string;
      title: string;
      snippet: string;
      category: 'Record' | 'Document' | 'Report';
      typeLabel: string;
      href: string;
      privacy?: boolean;
    }> = [];

    // Documents
    documents.forEach((d) => {
      if (!q || d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)) {
        items.push({
          id: d.id,
          title: d.title,
          snippet: d.content.slice(0, 90),
          category: 'Document',
          typeLabel: '文档',
          href: `/documents?id=${d.id}`,
        });
      }
    });

    // Reports
    reports.forEach((r) => {
      if (!q || r.title.toLowerCase().includes(q) || (r.summary && r.summary.toLowerCase().includes(q))) {
        items.push({
          id: r.id,
          title: r.title,
          snippet: r.summary || r.result.slice(0, 90),
          category: 'Report',
          typeLabel: '阶段报告',
          href: `/reports?id=${r.id}`,
        });
      }
    });

    // Records
    records.forEach((r) => {
      if (!q || r.title.toLowerCase().includes(q) || r.content.toLowerCase().includes(q)) {
        const typeLabel = r.type === 'note' ? '闪记' : r.type === 'clip' ? '片段' : r.type === 'clipboard' ? '剪贴板' : '记录';
        items.push({
          id: r.id,
          title: r.title,
          snippet: r.content.slice(0, 90),
          category: 'Record',
          typeLabel: r.privacy ? `隐私 · ${typeLabel}` : typeLabel,
          href: `/records?type=${r.type}&q=${encodeURIComponent(r.title)}`,
          privacy: r.privacy,
        });
      }
    });

    return items.slice(0, 10);
  }, [query, records, documents, reports]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredItems[selectedIndex];
      if (target) {
        onClose();
        router.push(target.href);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-apple-lg border border-black/10 dark:border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部 Spotlight 搜索栏 */}
        <div className="flex items-center px-5 py-4 border-b border-black/5 dark:border-white/5">
          <Search size={18} className="text-apple-text-secondary mr-3 shrink-0" strokeWidth={2} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索记录、文档、阶段报告或订阅..."
            className="w-full bg-transparent text-base text-apple-text dark:text-apple-text-dark placeholder-apple-text-tertiary focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-apple-text-tertiary hover:text-apple-text"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* 搜索结果列表 */}
        <div className="max-h-[420px] overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-apple-text-tertiary">
              未检索到匹配项，按 ESC 退出
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={`${item.category}_${item.id}`}
                    onClick={() => {
                      onClose();
                      router.push(item.href);
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`px-4 py-3 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#0071E3]/10 dark:bg-[#0071E3]/20 text-apple-blue'
                        : 'hover:bg-black/4 dark:hover:bg-white/5 text-apple-text dark:text-apple-text-dark'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {item.category === 'Document' && <FileText size={15} className="shrink-0" />}
                        {item.category === 'Report' && <Sparkles size={15} className="shrink-0 text-apple-blue" />}
                        {item.category === 'Record' && <Inbox size={15} className="shrink-0" />}
                        <span className="font-medium text-sm truncate">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-xs text-apple-text-secondary dark:text-apple-text-dark-secondary truncate mt-1">
                        {item.snippet}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs px-2.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-apple-text-secondary dark:text-apple-text-dark-secondary">
                        {item.typeLabel}
                      </span>
                      {isSelected && (
                        <CornerDownLeft size={14} className="text-apple-blue" strokeWidth={2} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部快捷键提示 */}
        <div className="px-5 py-2.5 border-t border-black/5 dark:border-white/5 bg-apple-bg dark:bg-black/20 flex items-center justify-between text-xs text-apple-text-tertiary">
          <div className="flex items-center gap-4">
            <span>↑↓ 切换</span>
            <span>↵ 确认跳转</span>
            <span>ESC 关闭</span>
          </div>
          <span>iSnips 聚焦检索</span>
        </div>
      </div>
    </div>
  );
};
