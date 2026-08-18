'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { QuickCaptureModal } from './QuickCaptureModal';
import {
  Home,
  Inbox,
  Zap,
  Scissors,
  ClipboardList,
  Rss,
  FileText,
  Sparkles,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  onCaptureSuccess?: () => void;
  onOpenSpotlight?: () => void;
}

function SidebarInternal({ onCaptureSuccess, onOpenSpotlight }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams?.get('type');
  const { user, isAuthenticated, logout } = useAuth();
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const credits = user?.ai_credits ?? 120;

  const isIndexActive = (typeVal?: string) => {
    if (pathname !== '/records') return false;
    if (!typeVal) return !currentType || currentType === 'all';
    return currentType === typeVal;
  };

  return (
    <>
      <aside
        className={`h-full flex flex-col justify-between border-r border-black/6 dark:border-white/8 bg-[#F7F8FA] dark:bg-[#161618] transition-all duration-200 select-none z-30 shrink-0 ${
          isCollapsed ? 'w-14' : 'w-56'
        }`}
      >
        {/* 顶部区域 */}
        <div className="p-3.5 space-y-4 overflow-y-auto">
          {/* Logo 与折叠按钮 */}
          <div className="flex items-center justify-between px-1.5 pt-0.5">
            {!isCollapsed && (
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-apple-text dark:bg-white text-white dark:text-apple-text font-bold text-xs flex items-center justify-center tracking-tighter shadow-2xs">
                  is
                </div>
                <span className="font-semibold text-base tracking-tight text-apple-text dark:text-apple-text-dark">
                  iSnips
                </span>
              </Link>
            )}

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-md text-apple-text-tertiary hover:text-apple-text hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title={isCollapsed ? '展开导航' : '收起导航'}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* 新建主按钮 */}
          <button
            onClick={() => setIsCaptureOpen(true)}
            className={`w-full py-2 px-3 rounded-xl bg-apple-blue hover:bg-apple-blue-hover text-white text-sm font-medium transition-all flex items-center justify-center gap-1.5 shadow-2xs btn-press ${
              isCollapsed ? 'p-2' : ''
            }`}
            title="新建记录"
          >
            <Plus size={16} strokeWidth={2.5} />
            {!isCollapsed && <span>新建记录</span>}
          </button>

          {/* 核心导航项 (调大字体) */}
          <div className="space-y-4 pt-1">
            {/* 工作台 */}
            <div className="space-y-1">
              <Link
                href="/"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                  pathname === '/'
                    ? 'bg-black/8 dark:bg-white/10 text-apple-text dark:text-apple-text-dark font-semibold'
                    : 'text-apple-text-secondary hover:text-apple-text hover:bg-black/4 dark:hover:bg-white/5'
                }`}
                title="工作台"
              >
                <Home size={17} />
                {!isCollapsed && <span>工作台</span>}
              </Link>
            </div>

            {/* 个人索引库 */}
            <div className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 py-0.5 text-xs font-semibold text-apple-text-tertiary tracking-wider uppercase">
                  索引库
                </div>
              )}
              <Link
                href="/records"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                  isIndexActive()
                    ? 'bg-black/8 dark:bg-white/10 text-apple-text dark:text-apple-text-dark font-semibold'
                    : 'text-apple-text-secondary hover:text-apple-text hover:bg-black/4 dark:hover:bg-white/5'
                }`}
                title="全部"
              >
                <Inbox size={17} />
                {!isCollapsed && <span>全部记录</span>}
              </Link>
              <Link
                href="/records?type=note"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                  isIndexActive('note')
                    ? 'bg-black/8 dark:bg-white/10 text-apple-text dark:text-apple-text-dark font-semibold'
                    : 'text-apple-text-secondary hover:text-apple-text hover:bg-black/4 dark:hover:bg-white/5'
                }`}
                title="闪记"
              >
                <Zap size={17} className="text-amber-500" />
                {!isCollapsed && <span>闪记</span>}
              </Link>
              <Link
                href="/records?type=clip"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                  isIndexActive('clip')
                    ? 'bg-black/8 dark:bg-white/10 text-apple-text dark:text-apple-text-dark font-semibold'
                    : 'text-apple-text-secondary hover:text-apple-text hover:bg-black/4 dark:hover:bg-white/5'
                }`}
                title="片段"
              >
                <Scissors size={17} className="text-blue-500" />
                {!isCollapsed && <span>片段</span>}
              </Link>
              <Link
                href="/records?type=clipboard"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                  isIndexActive('clipboard')
                    ? 'bg-black/8 dark:bg-white/10 text-apple-text dark:text-apple-text-dark font-semibold'
                    : 'text-apple-text-secondary hover:text-apple-text hover:bg-black/4 dark:hover:bg-white/5'
                }`}
                title="剪贴板"
              >
                <ClipboardList size={17} className="text-purple-500" />
                {!isCollapsed && <span>剪贴板</span>}
              </Link>
              <Link
                href="/rss"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                  pathname === '/rss'
                    ? 'bg-black/8 dark:bg-white/10 text-apple-text dark:text-apple-text-dark font-semibold'
                    : 'text-apple-text-secondary hover:text-apple-text hover:bg-black/4 dark:hover:bg-white/5'
                }`}
                title="RSS 订阅"
              >
                <Rss size={17} className="text-orange-500" />
                {!isCollapsed && <span>RSS 订阅</span>}
              </Link>
            </div>

            {/* 知识资产 */}
            <div className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 py-0.5 text-xs font-semibold text-apple-text-tertiary tracking-wider uppercase">
                  知识沉淀
                </div>
              )}
              <Link
                href="/documents"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                  pathname === '/documents'
                    ? 'bg-black/8 dark:bg-white/10 text-apple-text dark:text-apple-text-dark font-semibold'
                    : 'text-apple-text-secondary hover:text-apple-text hover:bg-black/4 dark:hover:bg-white/5'
                }`}
                title="知识文档"
              >
                <FileText size={17} />
                {!isCollapsed && <span>知识文档</span>}
              </Link>
              <Link
                href="/reports"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                  pathname === '/reports'
                    ? 'bg-black/8 dark:bg-white/10 text-apple-text dark:text-apple-text-dark font-semibold'
                    : 'text-apple-text-secondary hover:text-apple-text hover:bg-black/4 dark:hover:bg-white/5'
                }`}
                title="阶段报告"
              >
                <Sparkles size={17} className="text-apple-blue" />
                {!isCollapsed && <span>阶段报告</span>}
              </Link>
            </div>

            {/* 设置 */}
            <div className="space-y-1 pt-2 border-t border-black/5 dark:border-white/5">
              <Link
                href="/settings"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                  pathname === '/settings'
                    ? 'bg-black/8 dark:bg-white/10 text-apple-text dark:text-apple-text-dark font-semibold'
                    : 'text-apple-text-secondary hover:text-apple-text hover:bg-black/4 dark:hover:bg-white/5'
                }`}
                title="设置与安全"
              >
                <Settings size={17} />
                {!isCollapsed && <span>设置与安全</span>}
              </Link>
            </div>
          </div>
        </div>

        {/* 底部用户信息栏 (调大字体) */}
        <div className="p-3 border-t border-black/6 dark:border-white/8 relative">
          {isAuthenticated && user ? (
            <div>
              <div
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-apple-text dark:bg-white text-white dark:text-apple-text font-bold text-xs flex items-center justify-center shrink-0">
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  {!isCollapsed && (
                    <div className="truncate">
                      <div className="text-sm font-medium text-apple-text dark:text-apple-text-dark truncate">
                        {user.name}
                      </div>
                      <div className="text-xs text-apple-text-tertiary">
                        {credits} 算力点
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {showUserDropdown && !isCollapsed && (
                <div
                  onMouseLeave={() => setShowUserDropdown(false)}
                  className="absolute bottom-16 left-2 right-2 bg-white dark:bg-[#1C1C1E] rounded-xl border border-black/10 dark:border-white/10 shadow-apple-lg p-1.5 space-y-1 text-xs z-50 animate-in fade-in"
                >
                  <div className="px-3 py-2 border-b border-black/5 dark:border-white/5">
                    <div className="font-semibold text-sm text-apple-text dark:text-apple-text-dark truncate">
                      {user.name}
                    </div>
                    <div className="text-xs text-apple-text-tertiary truncate">{user.email}</div>
                  </div>

                  <Link
                    href="/settings"
                    onClick={() => setShowUserDropdown(false)}
                    className="block px-3 py-2 rounded-lg text-apple-text-secondary hover:bg-black/5 hover:text-apple-text text-xs"
                  >
                    设置与安全
                  </Link>

                  <button
                    onClick={async () => {
                      setShowUserDropdown(false);
                      await logout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium text-xs"
                  >
                    退出登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="w-full py-2 px-3 rounded-xl border border-black/8 hover:bg-white text-xs font-medium text-center block text-apple-text"
            >
              {isCollapsed ? '登录' : '登录空间'}
            </Link>
          )}
        </div>
      </aside>

      {isCaptureOpen && (
        <QuickCaptureModal
          isOpen={isCaptureOpen}
          onClose={() => setIsCaptureOpen(false)}
          onSuccess={() => {
            setIsCaptureOpen(false);
            onCaptureSuccess?.();
          }}
        />
      )}
    </>
  );
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
  return (
    <Suspense fallback={<aside className="h-full w-56 border-r border-black/6 bg-[#F7F8FA]" />}>
      <SidebarInternal {...props} />
    </Suspense>
  );
};
