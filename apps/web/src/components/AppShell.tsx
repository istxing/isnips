'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { SpotlightModal } from './SpotlightModal';
import { Search } from 'lucide-react';

function HeaderContent({ onOpenSpotlight }: { onOpenSpotlight: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams?.get('type');

  // 动态生成大字体页面主标题与副标题
  const getPageHeader = () => {
    if (pathname === '/') {
      return { title: '工作台', subtitle: '随手记录与近期捕获' };
    }
    if (pathname.startsWith('/records')) {
      let sub = '全部记录';
      if (currentType === 'note') sub = '闪记';
      else if (currentType === 'clip') sub = '片段';
      else if (currentType === 'clipboard') sub = '剪贴板';
      else if (currentType === 'rss') sub = 'RSS 记录';
      return { title: '个人索引库', subtitle: sub };
    }
    if (pathname.startsWith('/documents')) {
      return { title: '知识文档', subtitle: 'Markdown 沉淀资产' };
    }
    if (pathname.startsWith('/reports')) {
      return { title: '阶段报告', subtitle: 'AI 深度分析与洞察' };
    }
    if (pathname.startsWith('/rss')) {
      return { title: 'RSS 订阅', subtitle: '智能订阅与文章流' };
    }
    if (pathname.startsWith('/settings')) {
      return { title: '设置与安全', subtitle: '空间配置与 Passkey 管理' };
    }
    return { title: '个人空间', subtitle: '' };
  };

  const headerInfo = getPageHeader();

  return (
    <header className="h-16 border-b border-black/6 dark:border-white/8 px-8 flex items-center justify-between gap-6 select-none shrink-0 bg-white/95 dark:bg-[#141416]/95 backdrop-blur-md z-10">
      {/* 左侧：大字体模块标题与清晰副标 */}
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-bold tracking-tight text-apple-text dark:text-apple-text-dark">
          {headerInfo.title}
        </h1>
        {headerInfo.subtitle && (
          <span className="text-sm font-medium text-apple-text-secondary dark:text-apple-text-dark-secondary">
            · {headerInfo.subtitle}
          </span>
        )}
      </div>

      {/* 右侧：放大后的极速聚焦检索条 */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSpotlight}
          className="w-60 sm:w-72 px-3.5 py-2 rounded-xl border border-black/8 dark:border-white/10 bg-[#F7F8FA] dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 text-sm text-apple-text-secondary dark:text-apple-text-dark-secondary flex items-center justify-between transition-all shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <Search size={15} className="text-apple-text-tertiary" />
            <span className="text-sm">聚焦检索全库资产...</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-apple-text-tertiary font-mono font-medium">
            ⌘K
          </span>
        </button>
      </div>
    </header>
  );
}

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSpotlightOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-screen w-screen flex bg-white dark:bg-[#121214] text-apple-text dark:text-apple-text-dark antialiased overflow-hidden select-none">
      {/* 第一栏：左侧精致轻量导航栏 */}
      <Sidebar onOpenSpotlight={() => setIsSpotlightOpen(true)} />

      {/* 第二栏：右侧主工作区 */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-white dark:bg-[#141416] relative">
        {/* 顶部独立大字阶顶栏 */}
        <Suspense fallback={<header className="h-16 border-b border-black/6 bg-white" />}>
          <HeaderContent onOpenSpotlight={() => setIsSpotlightOpen(true)} />
        </Suspense>

        {/* 主内容区域 */}
        <main className="flex-1 overflow-y-auto px-8 py-6 relative">
          <div className="max-w-4xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* macOS Spotlight 全局聚焦检索框 */}
      <SpotlightModal
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
      />
    </div>
  );
};
