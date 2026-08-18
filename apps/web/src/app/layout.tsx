import React from 'react';
import '../styles/globals.css';
import { AuthProvider } from '../lib/auth-context';
import { AppShell } from '../components/AppShell';

export const metadata = {
  title: 'iSnips - Personal Information OS',
  description: '安静、轻盈、私人化的个人信息空间。记录一切，沉淀为可检索、可分析、可回看的个人知识与报告。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-apple-bg dark:bg-black text-apple-text dark:text-apple-text-dark font-apple selection:bg-black/10 dark:selection:bg-white/20 selection:text-apple-text dark:selection:text-white">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
