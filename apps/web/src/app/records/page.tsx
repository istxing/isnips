'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RecordModel, GroupByMode, DataScope, RecordType } from '../../types';
import { ApiClient } from '../../lib/api-client';
import { RecordCard } from '../../components/RecordCard';
import { QuickCaptureModal } from '../../components/QuickCaptureModal';
import { EditRecordModal } from '../../components/EditRecordModal';
import { FileText, Sparkles, Lock, Calendar, Inbox } from 'lucide-react';

const GROUP_MODES: { mode: GroupByMode; label: string }[] = [
  { mode: 'raw', label: '原始流' },
  { mode: 'day', label: '按天' },
  { mode: 'week', label: '按周' },
  { mode: 'month', label: '按月' },
  { mode: 'year', label: '按年' },
];

function RecordsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams?.get('q') || '';
  const currentType = searchParams?.get('type') || 'all';

  const [records, setRecords] = useState<RecordModel[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'public' | 'private'>('all');
  const [groupByMode, setGroupByMode] = useState<GroupByMode>('raw');
  const [loading, setLoading] = useState(true);

  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordModel | null>(null);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await ApiClient.getRecords({
        q: searchQuery,
        type: currentType,
        privacy: privacyFilter,
      });
      setRecords(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [searchQuery, currentType, privacyFilter]);

  // 时序聚合分组计算
  const groupedTimeline = useMemo(() => {
    return ApiClient.groupRecordsByTimeline(records, groupByMode);
  }, [records, groupByMode]);

  // 一键生成 Markdown 文档
  const handleGenerateMarkdownDocument = async () => {
    if (records.length === 0) {
      alert('当前筛选范围内暂无记录');
      return;
    }

    setIsGeneratingDoc(true);
    try {
      const typeName = currentType === 'note' ? '闪记' : currentType === 'clip' ? '片段' : currentType === 'clipboard' ? '剪贴板' : currentType === 'rss' ? 'RSS 订阅' : '个人记录';
      const docTitle = `${new Date().toLocaleDateString()} ${typeName}整理文档`;
      const markdownContent = ApiClient.generateMarkdownFromRecords(records, docTitle);

      const newDoc = await ApiClient.createDocument({
        title: docTitle,
        content: markdownContent,
        tags: [typeName],
        scope_meta: {
          generated_from_scope: true,
          record_count: records.length,
          type: currentType,
        },
      });

      if (newDoc) {
        router.push(`/documents?id=${newDoc.id}`);
      } else {
        router.push('/documents');
      }
    } catch (e) {
      console.error(e);
      alert('生成文档失败');
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleGoToAIReport = () => {
    const scopeParam: DataScope = {
      types: currentType === 'all' ? undefined : [currentType as RecordType],
      keywords: searchQuery.trim() ? [searchQuery.trim()] : undefined,
      exclude_privacy: privacyFilter !== 'private',
    };
    router.push(`/reports?scope=${encodeURIComponent(JSON.stringify(scopeParam))}`);
  };

  const getCurrentTypeTitle = () => {
    switch (currentType) {
      case 'note':
        return '闪记';
      case 'clip':
        return '片段';
      case 'clipboard':
        return '剪贴板';
      case 'rss':
        return 'RSS 记录';
      default:
        return '全部记录';
    }
  };

  return (
    <div className="space-y-5 w-full max-w-4xl mx-auto py-1">
      {/* 顶部大字阶工具栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.05] dark:border-white/[0.06]">
        {/* 左侧：时序聚合模式切换 (大字阶 14px) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#F7F8FA] dark:bg-[#1C1C1E] p-1 rounded-xl">
            {GROUP_MODES.map((gm) => (
              <button
                key={gm.mode}
                onClick={() => setGroupByMode(gm.mode)}
                className={`px-3.5 py-1.5 rounded-lg transition-colors text-sm ${
                  groupByMode === gm.mode
                    ? 'bg-white dark:bg-[#2C2C2E] text-apple-text dark:text-apple-text-dark shadow-2xs font-semibold'
                    : 'text-apple-text-tertiary hover:text-apple-text'
                }`}
              >
                {gm.label}
              </button>
            ))}
          </div>

          <span className="text-sm text-apple-text-tertiary hidden md:inline">
            共 {records.length} 条
          </span>
        </div>

        {/* 右侧：隐私筛选与沉淀动作 (大字阶 14px) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setPrivacyFilter(privacyFilter === 'private' ? 'all' : 'private')}
            className={`px-3.5 py-2 rounded-xl text-sm transition-colors flex items-center gap-1.5 font-medium ${
              privacyFilter === 'private'
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                : 'bg-[#F7F8FA] dark:bg-[#1C1C1E] text-apple-text-tertiary hover:text-apple-text'
            }`}
            title="隐私筛选"
          >
            <Lock size={13} />
            <span>{privacyFilter === 'private' ? '仅隐私' : '全部'}</span>
          </button>

          <button
            onClick={handleGenerateMarkdownDocument}
            disabled={isGeneratingDoc || records.length === 0}
            className="px-4 py-2 rounded-xl bg-[#F7F8FA] dark:bg-[#1C1C1E] hover:bg-black/5 text-sm font-medium text-apple-text flex items-center gap-1.5 transition-colors disabled:opacity-30"
            title="将当前记录转为独立文档"
          >
            <FileText size={15} />
            <span>转为文档</span>
          </button>

          <button
            onClick={handleGoToAIReport}
            className="px-4 py-2 rounded-xl bg-apple-blue hover:bg-apple-blue-hover text-white text-sm font-medium flex items-center gap-1.5 shadow-2xs transition-all btn-press"
            title="基于当前范围进行 AI 智能分析"
          >
            <Sparkles size={15} />
            <span>AI 分析</span>
          </button>
        </div>
      </div>

      {/* 记录内容列表 (纯线条流) */}
      {loading ? (
        <div className="py-20 text-center text-sm text-apple-text-tertiary">
          加载中...
        </div>
      ) : records.length === 0 ? (
        <div className="py-20 text-center space-y-2 text-apple-text-tertiary">
          <Inbox size={28} className="mx-auto opacity-30" />
          <p className="text-sm">暂无 {getCurrentTypeTitle()}</p>
        </div>
      ) : groupByMode === 'raw' ? (
        /* 原始列表视图 */
        <div>
          {records.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onEdit={(r) => setEditingRecord(r)}
              onDelete={async (id) => {
                await ApiClient.deleteRecord(id);
                loadRecords();
              }}
            />
          ))}
        </div>
      ) : (
        /* 汇总查看视图 */
        <div className="space-y-6">
          {groupedTimeline.map((group) => (
            <section key={group.group_key} className="space-y-1">
              <div className="flex items-center justify-between pt-4 pb-1.5 border-b border-black/[0.05] dark:border-white/[0.06] text-sm font-semibold text-apple-text dark:text-apple-text-dark">
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-apple-text-secondary" />
                  <span>{group.title}</span>
                </div>
                <span className="text-xs font-normal text-apple-text-tertiary px-2.5 py-0.5 rounded-lg bg-[#F7F8FA] dark:bg-[#1C1C1E]">
                  {group.records.length} 条
                </span>
              </div>

              <div>
                {group.records.map((record) => (
                  <RecordCard
                    key={record.id}
                    record={record}
                    onEdit={(r) => setEditingRecord(r)}
                    onDelete={async (id) => {
                      await ApiClient.deleteRecord(id);
                      loadRecords();
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {isCaptureOpen && (
        <QuickCaptureModal
          isOpen={isCaptureOpen}
          onClose={() => setIsCaptureOpen(false)}
          onSuccess={() => {
            setIsCaptureOpen(false);
            loadRecords();
          }}
        />
      )}

      {editingRecord && (
        <EditRecordModal
          record={editingRecord}
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          onSuccess={() => {
            setEditingRecord(null);
            loadRecords();
          }}
        />
      )}
    </div>
  );
}

export default function RecordsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-apple-text-tertiary">加载中...</div>}>
      <RecordsContent />
    </Suspense>
  );
}
