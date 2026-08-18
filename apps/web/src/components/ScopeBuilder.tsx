'use client';

import React, { useState } from 'react';
import { DataScope, RecordType, TimeRangePreset } from '../types';
import { Sparkles, FileText, Check, Plus, Search, Lock } from 'lucide-react';

interface ScopeBuilderProps {
  onTimelineView?: (scope: DataScope) => void;
  onGenerateDocument?: (scope: DataScope) => void;
  onAnalyzeWithAI?: (scope: DataScope) => void;
  initialScope?: DataScope;
}

const PRESET_OPTIONS: { value: TimeRangePreset; label: string }[] = [
  { value: 'today', label: '今日' },
  { value: '7days', label: '近 7 天' },
  { value: '30days', label: '近 30 天' },
  { value: '90days', label: '近 90 天' },
  { value: 'all', label: '全部数据' },
];

const TYPE_OPTIONS: { type: RecordType; label: string }[] = [
  { type: 'note', label: '闪记' },
  { type: 'clip', label: '片段' },
  { type: 'clipboard', label: '剪贴板' },
  { type: 'rss', label: 'RSS 订阅' },
];

export const ScopeBuilder: React.FC<ScopeBuilderProps> = ({
  onTimelineView,
  onGenerateDocument,
  onAnalyzeWithAI,
  initialScope,
}) => {
  const [preset, setPreset] = useState<TimeRangePreset>(initialScope?.preset || '7days');
  const [selectedTypes, setSelectedTypes] = useState<RecordType[]>(
    initialScope?.types || ['note', 'clip', 'clipboard', 'rss']
  );
  const [keyword, setKeyword] = useState(initialScope?.keywords?.[0] || '');
  const [excludePrivacy, setExcludePrivacy] = useState(initialScope?.exclude_privacy ?? true);

  const toggleType = (t: RecordType) => {
    if (selectedTypes.includes(t)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter((item) => item !== t));
      }
    } else {
      setSelectedTypes([...selectedTypes, t]);
    }
  };

  const getConstructedScope = (): DataScope => {
    return {
      preset,
      types: selectedTypes,
      keywords: keyword.trim() ? [keyword.trim()] : undefined,
      exclude_privacy: excludePrivacy,
    };
  };

  // 估算 AI 算力消耗
  const estimatedCredits = React.useMemo(() => {
    let base = 6;
    if (preset === '30days') base = 12;
    if (preset === '90days') base = 18;
    if (preset === 'all') base = 25;
    return base;
  }, [preset]);

  return (
    <div className="py-5 border-b border-black/8 dark:border-white/10 space-y-5 text-sm">
      <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
        <div>
          <h3 className="font-semibold text-lg text-apple-text dark:text-apple-text-dark">
            范围配置
          </h3>
          <p className="text-xs text-apple-text-secondary dark:text-apple-text-dark-secondary mt-0.5">
            指定信息范围，进行只读汇总回顾、生成独立文档或启动 AI 阶段分析
          </p>
        </div>

        <div className="text-xs px-2.5 py-1 rounded-md bg-[#F7F8FA] dark:bg-white/6 text-apple-text-secondary">
          预计消耗 <strong className="text-apple-blue font-semibold">{estimatedCredits}</strong> 算力点
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. 时间范围 */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-apple-text-secondary dark:text-apple-text-dark-secondary">
            时间范围
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPreset(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  preset === opt.value
                    ? 'bg-apple-text dark:bg-white text-white dark:text-apple-text font-medium'
                    : 'bg-[#F7F8FA] dark:bg-white/6 text-apple-text-secondary hover:text-apple-text'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. 数据分类多选 */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-apple-text-secondary dark:text-apple-text-dark-secondary">
            涵盖分类
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {TYPE_OPTIONS.map((opt) => {
              const isChecked = selectedTypes.includes(opt.type);
              return (
                <button
                  key={opt.type}
                  onClick={() => toggleType(opt.type)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
                    isChecked
                      ? 'bg-black/8 dark:bg-white/12 text-apple-text dark:text-apple-text-dark font-medium border border-black/10'
                      : 'bg-[#F7F8FA] dark:bg-white/4 text-apple-text-tertiary border border-transparent'
                  }`}
                >
                  {isChecked ? <Check size={13} strokeWidth={2.5} /> : <Plus size={13} strokeWidth={2} />}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. 关键词过滤与隐私保护 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-black/4 dark:border-white/4">
        <div className="w-full sm:w-1/2 relative">
          <input
            type="text"
            placeholder="限定关键词过滤..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-black/8 dark:border-white/10 bg-transparent text-xs text-apple-text dark:text-apple-text-dark placeholder-apple-text-tertiary focus:outline-none"
          />
          <Search size={13} className="absolute left-2.5 top-2.5 text-apple-text-tertiary" strokeWidth={2} />
        </div>

        <label className="flex items-center gap-2 text-xs text-apple-text-secondary dark:text-apple-text-dark-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={excludePrivacy}
            onChange={(e) => setExcludePrivacy(e.target.checked)}
            className="rounded text-apple-blue focus:ring-0"
          />
          <Lock size={13} className="text-apple-text-tertiary" />
          <span>自动排除端到端加密隐私记录</span>
        </label>
      </div>

      {/* 4. 三大核心操作分支 */}
      <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-end gap-2.5 flex-wrap">
        {onTimelineView && (
          <button
            onClick={() => onTimelineView(getConstructedScope())}
            className="px-3.5 py-1.5 rounded-lg border border-black/8 hover:bg-black/4 text-apple-text text-xs font-medium transition-colors"
          >
            汇总查看
          </button>
        )}

        {onGenerateDocument && (
          <button
            onClick={() => onGenerateDocument(getConstructedScope())}
            className="px-3.5 py-1.5 rounded-lg border border-black/8 hover:bg-black/4 text-apple-text text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <FileText size={14} />
            <span>生成文档</span>
          </button>
        )}

        {onAnalyzeWithAI && (
          <button
            onClick={() => onAnalyzeWithAI(getConstructedScope())}
            className="px-4 py-1.5 rounded-lg bg-apple-blue hover:bg-apple-blue-hover text-white text-xs font-medium shadow-2xs transition-all flex items-center gap-1.5 btn-press"
          >
            <Sparkles size={14} />
            <span>AI 分析与报告</span>
          </button>
        )}
      </div>
    </div>
  );
};
