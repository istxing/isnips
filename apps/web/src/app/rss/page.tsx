'use client';

import React from 'react';

export default function RSSPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          RSS 智能订阅与动态
        </h1>
        <p className="text-sm text-slate-500">
          RSS 是信息进入 Index 的自动化源头。由 AI 自动摘要并过滤高价值文章。
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="font-semibold text-base">订阅源管理 (Feed Sources)</h3>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="输入 RSS / Atom Feed URL..."
            className="flex-1 px-4 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700 text-sm"
          />
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">
            + 添加订阅
          </button>
        </div>
      </div>
    </div>
  );
}
