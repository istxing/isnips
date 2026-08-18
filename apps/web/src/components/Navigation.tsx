'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { QuickCaptureModal } from './QuickCaptureModal';
import {
  Home,
  Inbox,
  FileText,
  Sparkles,
  Rss,
  Search,
  Plus,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

interface NavigationProps {
  onRecordCreated?: () => void;
  onOpenSpotlight?: () => void;
}

const NAV_TABS = [
  { href: '/', label: '工作台', icon: Home },
  { href: '/records', label: '索引库', icon: Inbox },
  { href: '/documents', label: '知识文档', icon: FileText },
  { href: '/reports', label: '阶段报告', icon: Sparkles },
  { href: '/rss', label: 'RSS 订阅', icon: Rss },
];

export const Navigation: React.FC<NavigationProps> = ({ onRecordCreated, onOpenSpotlight }) => {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const credits = user?.ai_credits ?? 120;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/85 dark:bg-[#1C1C1E]/85 border-b border-black/6 dark:border-white/8 transition-all select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-4">
          {/* 1. 左侧品牌 */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-8 h-8 rounded-xl bg-apple-text dark:bg-white text-white dark:text-apple-text font-bold text-sm flex items-center justify-center tracking-tighter shadow-apple-sm group-hover:scale-105 transition-transform">
                is
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-base tracking-tight text-apple-text dark:text-apple-text-dark leading-tight">
                  iSnips
                </span>
                <span className="text-[10px] text-apple-text-tertiary">个人空间</span>
              </div>
            </Link>

            {/* 2. 中间 Apple 风格一体化场景导航 (Segment Tabs) */}
            <nav className="hidden md:flex items-center bg-black/4 dark:bg-white/6 p-1 rounded-xl gap-0.5">
              {NAV_TABS.map((tab) => {
                const active = isActive(tab.href);
                const IconComponent = tab.icon;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-3.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                      active
                        ? 'bg-white dark:bg-[#2C2C2E] text-apple-text dark:text-apple-text-dark font-semibold shadow-apple-sm'
                        : 'text-apple-text-secondary hover:text-apple-text dark:text-apple-text-dark-secondary dark:hover:text-apple-text-dark'
                    }`}
                  >
                    <IconComponent size={14} className={active ? 'text-apple-blue' : ''} />
                    <span>{tab.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* 3. 中右侧 Spotlight 聚焦检索框 */}
          <div className="flex-1 max-w-sm hidden lg:block">
            <button
              onClick={onOpenSpotlight}
              className="w-full px-3.5 py-1.5 rounded-xl border border-black/6 dark:border-white/8 bg-black/2 dark:bg-white/4 hover:bg-white dark:hover:bg-[#2C2C2E] hover:border-black/15 text-xs text-apple-text-secondary dark:text-apple-text-dark-secondary flex items-center justify-between transition-all shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <Search size={13} className="text-apple-text-tertiary" strokeWidth={2} />
                <span className="text-xs">聚焦检索全库资产...</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-apple-text-tertiary font-mono">
                ⌘K
              </span>
            </button>
          </div>

          {/* 4. 右侧操作区：快速新建、算力与个人菜单 */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* 移动端/平板 Spotlight 触发按钮 */}
            <button
              onClick={onOpenSpotlight}
              className="lg:hidden p-2 rounded-xl text-apple-text-secondary hover:bg-black/5 dark:hover:bg-white/5"
              title="聚焦检索 (⌘K)"
            >
              <Search size={16} />
            </button>

            {/* 新建记录 */}
            <button
              onClick={() => setShowCaptureModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-apple-blue hover:bg-apple-blue-hover text-white text-xs font-medium shadow-apple-sm transition-all flex items-center gap-1.5 btn-press"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>新建</span>
            </button>

            {/* 算力点状态 */}
            <Link
              href="/settings"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/6 text-xs text-apple-text-secondary dark:text-apple-text-dark-secondary transition-colors"
              title="可用算力点"
            >
              <Sparkles size={13} className="text-apple-blue" />
              <span className="font-semibold text-apple-text dark:text-apple-text-dark">{credits}</span>
            </Link>

            {/* 用户菜单 */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-black/10 dark:hover:ring-white/10 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-apple-text dark:bg-white text-white dark:text-apple-text flex items-center justify-center font-bold text-xs">
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                </button>

                {showUserMenu && (
                  <div
                    onMouseLeave={() => setShowUserMenu(false)}
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-apple-lg border border-black/10 dark:border-white/10 p-1.5 space-y-1 text-xs z-50 animate-in fade-in"
                  >
                    <div className="px-3.5 py-2.5 border-b border-black/5 dark:border-white/5">
                      <div className="font-semibold text-sm text-apple-text dark:text-apple-text-dark truncate">
                        {user.name}
                      </div>
                      <div className="text-[11px] text-apple-text-tertiary truncate mt-0.5">
                        {user.email}
                      </div>
                    </div>

                    <Link
                      href="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-apple-text-secondary dark:text-apple-text-dark-secondary hover:bg-black/5 dark:hover:bg-white/5 hover:text-apple-text"
                    >
                      <Settings size={14} />
                      <span>系统与安全设置</span>
                    </Link>

                    <button
                      onClick={async () => {
                        setShowUserMenu(false);
                        await logout();
                      }}
                      className="w-full flex items-center gap-2 text-left px-3.5 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium"
                    >
                      <LogOut size={14} />
                      <span>退出登录</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-xl border border-black/8 dark:border-white/10 hover:bg-black/4 text-xs font-medium text-apple-text dark:text-apple-text-dark transition-colors"
              >
                登录
              </Link>
            )}
          </div>
        </div>

        {/* 移动端底部/次级导航条 */}
        <div className="md:hidden flex items-center justify-around border-t border-black/5 dark:border-white/5 px-2 py-1.5 bg-white/90 dark:bg-[#1C1C1E]/90">
          {NAV_TABS.map((tab) => {
            const active = isActive(tab.href);
            const IconComponent = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] ${
                  active
                    ? 'text-apple-blue font-semibold'
                    : 'text-apple-text-tertiary hover:text-apple-text'
                }`}
              >
                <IconComponent size={16} />
                <span className="mt-0.5">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {showCaptureModal && (
        <QuickCaptureModal
          isOpen={showCaptureModal}
          onClose={() => setShowCaptureModal(false)}
          onSuccess={() => {
            setShowCaptureModal(false);
            onRecordCreated?.();
          }}
        />
      )}
    </>
  );
};
