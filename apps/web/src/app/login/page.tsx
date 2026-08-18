'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithPassword, loginWithPasskey } = useAuth();

  const [usePassword, setUsePassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasskeyLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await loginWithPasskey(email.trim() || undefined);
      if (res.success) {
        router.push('/');
      } else {
        setError(res.error || 'Passkey 验证未通过');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('请填写邮箱与登录密码');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await loginWithPassword(email.trim(), password);
      if (res.success) {
        router.push('/');
      } else {
        setError(res.error || '登录失败，请检查账号密码');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4">
      <div className="max-w-sm w-full space-y-6 text-center">
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl bg-black dark:bg-white text-white dark:text-black font-black text-sm flex items-center justify-center mx-auto">
          is
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            登录 iSnips
          </h1>
          <p className="text-xs text-slate-500">
            访问你的 Personal Index 个人索引工作台
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs text-left">
            {error}
          </div>
        )}

        {/* 默认 Passkey 极简一键登录 */}
        {!usePassword ? (
          <div className="space-y-3">
            <button
              onClick={handlePasskeyLogin}
              disabled={loading}
              className="w-full py-3 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-50 text-xs font-semibold rounded-xl transition-opacity flex items-center justify-center gap-2 shadow-xs"
            >
              <span>🔑</span>
              <span>{loading ? '正在调起 Touch ID / 生物识别...' : '使用 Passkey 极速登录'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setUsePassword(true); setError(''); }}
              className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-[#333] hover:bg-slate-50 dark:hover:bg-[#262626] text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              使用密码登录
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordLogin} className="space-y-3 text-left">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                账号邮箱
              </label>
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                登录密码
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-xs focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-50 text-xs font-semibold rounded-xl transition-opacity"
            >
              {loading ? '验证中...' : '登录'}
            </button>

            <button
              type="button"
              onClick={() => { setUsePassword(false); setError(''); }}
              className="w-full text-center text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-white pt-1 block"
            >
              ← 返回 Passkey 登录
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-100 dark:border-[#262626] text-xs text-slate-400">
          还没有账号？{' '}
          <Link href="/register" className="text-slate-900 dark:text-white font-semibold hover:underline">
            立即注册 →
          </Link>
        </div>
      </div>
    </div>
  );
}
