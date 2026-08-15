'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-8">
      {/* 1. 顶部 Hero 与 全局搜索 */}
      <section className="text-center py-6 space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
          记录一切，提炼真正重要的东西
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          将零散的剪藏、高亮、想法与文章，持续沉淀为长期的个人认知与阶段性报告。
        </p>

        <div className="max-w-xl mx-auto mt-4">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索个人索引库 (Record / Report / Tags)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              搜索
            </button>
          </div>
        </div>
      </section>

      {/* 2. AI 实时观察 (Super Home 差异化核心) */}
      <section className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h2 className="text-lg font-bold text-indigo-950 dark:text-indigo-200">
              今日 AI 洞察与关注度分析
            </h2>
          </div>
          <Link
            href="/reports"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            生成完整报告 →
          </Link>
        </div>

        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <li className="flex items-start gap-2">
            <span className="text-indigo-500 font-bold">•</span>
            <span>
              <strong>高频关注：</strong> 本周你在 <em>“AI Agent”</em> 与 <em>“个人知识索引”</em> 方面的记录增加了 43%。
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-500 font-bold">•</span>
            <span>
              <strong>未决想法：</strong> 过去 14 天记录了 2 条关于 <em>“端到端加密架构设计”</em> 的未归档随笔。
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-500 font-bold">•</span>
            <span>
              <strong>RSS 推荐：</strong> 今日已为你筛选 3 篇与当前研究深度相关的高质量文章。
            </span>
          </li>
        </ul>
      </section>

      {/* 3. 核心功能入口看板 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-white">📥 信息捕获 (Capture)</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            支持 Chrome 插件剪藏、桌面快捷键监控与 Web 手动录入。
          </p>
          <div className="pt-2">
            <Link
              href="/index"
              className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              录入新笔记 / 想法 →
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-white">🗂️ 个人索引 (Personal Index)</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            统一索引管理 Clip、Bookmark、Note、Idea、RSS 与 Reports。
          </p>
          <div className="pt-2">
            <Link
              href="/index"
              className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              浏览所有记录 →
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-white">📊 认知报告 (AI Reports)</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            指定时间与主题范围，一键生成日报、周报与阶段性复盘报告。
          </p>
          <div className="pt-2">
            <Link
              href="/reports"
              className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              进入报告中心 →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
