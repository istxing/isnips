'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';

export default function RegisterPage() {
  const router = useRouter();
  const { registerWithPassword, registerWithPasskey } = useAuth();

  const [usePassword, setUsePassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasskeyRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('请输入有效的注册邮箱');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await registerWithPasskey(email.trim(), name.trim() || undefined);
      if (res.success) {
        router.push('/');
      } else {
        setError(res.error || 'Passkey 注册创建失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('请完整填写邮箱与密码');
      return;
    }
    if (password.length < 6) {
      setError('密码长度至少需要 6 个字符');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await registerWithPassword(email.trim(), password, name.trim() || undefined);
      if (res.success) {
        router.push('/');
      } else {
        setError(res.error || '注册失败');
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
            创建 iSnips 个人空间
          </h1>
          <p className="text-xs text-slate-500">
            注册即享 200 Credits 算力与个人索引空间
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs text-left">
            {error}
          </div>
        )}

        {!usePassword ? (
          <form onSubmit={handlePasskeyRegister} className="space-y-3 text-left">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                你的称呼 / 昵称 (可选)
              </label>
              <input
                type="text"
                placeholder="例如：Alex"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                绑定邮箱
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-50 text-xs font-semibold rounded-xl transition-opacity flex items-center justify-center gap-2 shadow-xs"
            >
              <span>🔑</span>
              <span>{loading ? '调起 Passkey 注册中...' : '使用 Passkey 极速注册'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setUsePassword(true); setError(''); }}
              className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-[#333] hover:bg-slate-50 dark:hover:bg-[#262626] text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors text-center"
            >
              使用密码注册
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordRegister} className="space-y-3 text-left">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                昵称
              </label>
              <input
                type="text"
                placeholder="例如：Alex"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                电子邮箱
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
                设置密码 (至少 6 位)
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
              {loading ? '创建账号中...' : '注册'}
            </button>

            <button
              type="button"
              onClick={() => { setUsePassword(false); setError(''); }}
              className="w-full text-center text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-white pt-1 block"
            >
              ← 返回 Passkey 注册
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-100 dark:border-[#262626] text-xs text-slate-400">
          已有账号？{' '}
          <Link href="/login" className="text-slate-900 dark:text-white font-semibold hover:underline">
            直接登录 →
          </Link>
        </div>
      </div>
    </div>
  );
}
