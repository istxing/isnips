'use client';

import React, { useState } from 'react';
import { RecoveryKeyManager } from '@/lib/crypto';

export default function SettingsPage() {
  const [recoveryKey, setRecoveryKey] = useState<string>('');

  const generateNewKey = () => {
    setRecoveryKey(RecoveryKeyManager.generateRecoveryKey());
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          系统与隐私设置 (Settings)
        </h1>
        <p className="text-sm text-slate-500">
          管理你的会员套餐、AI 额度及端到端加密密钥。
        </p>
      </div>

      <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white">
          💎 订阅套餐与 AI Credits
        </h3>
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-200">当前方案：Plus 会员</div>
            <div className="text-xs text-slate-500 mt-1">享有完整 AI 报告、RSS 摘要与双向极速同步</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">剩余 120 AI Credits</div>
            <div className="text-xs text-slate-400">有效期至 2026-12-31</div>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white">
          🔒 隐私与端到端加密 (E2EE)
        </h3>
        <p className="text-xs text-slate-500">
          所有标记为隐私的 Record 均由主密码派生的 Master Key 在本地加密后再进行云端同步，云端服务与 AI 模型默认均无法解密。
        </p>

        <div className="pt-2 space-y-3">
          <button
            onClick={generateNewKey}
            className="px-4 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl text-xs font-semibold"
          >
            生成 / 重置应急恢复密钥 (Recovery Key)
          </button>

          {recoveryKey && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl space-y-2">
              <div className="text-xs font-bold text-amber-800 dark:text-amber-300">
                ⚠️ 请妥善保管你的 Recovery Key（离开本页后服务端将无法恢复）：
              </div>
              <div className="font-mono text-sm tracking-wider font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 p-2 rounded border">
                {recoveryKey}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
