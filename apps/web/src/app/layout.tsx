import React from 'react';
import '../styles/globals.css';
import { Navigation } from '../components/Navigation';

export const metadata = {
  title: 'iSnips - Personal Information Index',
  description: '把零散的信息记录，持续沉淀为可检索、可分析、可回看的个人报告。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <Navigation />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500">
          iSnips — Capture → Index → AI Analysis → Report → Resurface
        </footer>
      </body>
    </html>
  );
}
