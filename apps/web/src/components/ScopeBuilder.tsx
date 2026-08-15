'use client';

import React from 'react';
import { DataScope, RecordType } from '@/types';

interface ScopeBuilderProps {
  scope: DataScope;
  onChange: (scope: DataScope) => void;
  estimatedCredits: number;
}

const ALL_TYPES: RecordType[] = ['clip', 'bookmark', 'highlight', 'note', 'idea', 'rss'];

export const ScopeBuilder: React.FC<ScopeBuilderProps> = ({
  scope,
  onChange,
  estimatedCredits,
}) => {
  const toggleType = (t: RecordType) => {
    const current = scope.types || [];
    const updated = current.includes(t)
      ? current.filter((item) => item !== t)
      : [...current, t];
    onChange({ ...scope, types: updated });
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
        🎯 设定数据分析范围 (Data Scope)
      </h3>

      <div>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-2">
          包含的数据类型
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_TYPES.map((t) => {
            const selected = (scope.types || []).includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                className={`px-3 py-1 text-xs rounded-lg font-medium border transition-colors ${
                  selected
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                {t.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
            排除加密隐私数据 (推荐)
          </span>
          <span className="text-xs text-slate-400 block">
            启用后 AI 分析将完全无法接触受隐私标记的内容
          </span>
        </div>
        <input
          type="checkbox"
          checked={scope.exclude_privacy}
          onChange={(e) =>
            onChange({ ...scope, exclude_privacy: e.target.checked })
          }
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
      </div>

      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
        <span className="text-slate-500">预计消耗 AI 额度:</span>
        <span className="font-bold text-blue-600 dark:text-blue-400">
          {estimatedCredits} AI Credits
        </span>
      </div>
    </div>
  );
};
