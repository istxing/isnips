'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { UserSubscription, PasskeyDevice } from '../../types';
import { ApiClient } from '../../lib/api-client';
import { User, Key, Lock, Sparkles, Plus, AlertTriangle, Smartphone } from 'lucide-react';

export default function SettingsPage() {
  const { user, registerPasskey, devices, removePasskeyDevice, loadDevices } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [addingCredits, setAddingCredits] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [showRecoveryKey, setShowRecoveryKey] = useState(false);

  useEffect(() => {
    loadSettings();
    if (user?.has_passkey) {
      loadDevices();
    }
  }, [user]);

  const loadSettings = async () => {
    const sub = await ApiClient.getSubscription();
    setSubscription(sub);
  };

  const handleAddPasskey = async () => {
    const deviceName = prompt('请输入新 Passkey 设备备注：', 'MacBook 指纹认证');
    if (deviceName) {
      await registerPasskey(deviceName);
    }
  };

  const handleRechargeCredits = async (amount: number) => {
    setAddingCredits(true);
    await ApiClient.addCredits(amount);
    await loadSettings();
    setAddingCredits(false);
  };

  const handleGenerateRecoveryKey = () => {
    const segments = [];
    for (let i = 0; i < 6; i++) {
      segments.push(Math.random().toString(36).substring(2, 6).toUpperCase());
    }
    setRecoveryKey(segments.join('-'));
    setShowRecoveryKey(true);
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto py-2">
      {/* 顶部标题 */}
      <div className="border-b border-black/5 dark:border-white/5 pb-4">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-apple-text dark:text-apple-text-dark">
          系统与安全设置
        </h1>
        <p className="text-xs text-apple-text-secondary dark:text-apple-text-dark-secondary mt-0.5">
          管理 Passkey 免密生物识别 · 端到端加密密钥 · 算力点与订阅方案
        </p>
      </div>

      {/* 1. 账号与个人资料 */}
      <section className="apple-card p-5 sm:p-6 space-y-4 text-sm">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3.5">
          <h2 className="font-semibold text-base text-apple-text dark:text-apple-text-dark flex items-center gap-2">
            <User size={16} />
            <span>个人账户</span>
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-black/4 dark:bg-white/6 text-xs text-apple-text-secondary">
            高级版会员
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-apple-text-tertiary mb-1">用户名</label>
            <div className="font-medium text-sm text-apple-text dark:text-apple-text-dark">
              {user?.name || 'Kevin'}
            </div>
          </div>
          <div>
            <label className="block text-xs text-apple-text-tertiary mb-1">电子邮箱</label>
            <div className="font-medium text-sm text-apple-text dark:text-apple-text-dark">
              {user?.email || 'kevin@isnips.app'}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Passkey 生物识别免密安全 */}
      <section className="apple-card p-5 sm:p-6 space-y-4 text-sm">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3.5">
          <div>
            <h2 className="font-semibold text-base text-apple-text dark:text-apple-text-dark flex items-center gap-2">
              <Key size={16} />
              <span>Passkey 生物识别免密认证</span>
            </h2>
            <p className="text-xs text-apple-text-secondary mt-0.5">
              使用指纹、面容或安全硬件密钥极速验证，杜绝密码泄露风险
            </p>
          </div>

          <button
            onClick={handleAddPasskey}
            className="px-4 py-2 rounded-xl bg-apple-blue hover:bg-apple-blue-hover text-white text-xs font-medium shadow-apple-sm transition-all flex items-center gap-1.5 btn-press"
          >
            <Plus size={13} strokeWidth={2.5} />
            <span>绑定新设备</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {devices && devices.length > 0 ? (
            devices.map((dev: PasskeyDevice) => (
              <div
                key={dev.credential_id}
                className="p-3.5 rounded-xl bg-black/3 dark:bg-white/4 border border-black/4 dark:border-white/5 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Smartphone size={16} className="text-apple-text-secondary" />
                  <div>
                    <div className="font-medium text-sm text-apple-text dark:text-apple-text-dark">
                      {dev.device_name || 'Passkey 认证设备'}
                    </div>
                    <div className="text-xs text-apple-text-tertiary mt-0.5">
                      绑定于：{new Date(dev.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => removePasskeyDevice(dev.credential_id)}
                  className="text-rose-600 hover:underline text-xs"
                >
                  解绑
                </button>
              </div>
            ))
          ) : (
            <div className="py-5 text-center text-xs text-apple-text-tertiary">
              当前尚未绑定 Passkey 生物识别凭据
            </div>
          )}
        </div>
      </section>

      {/* 3. E2EE 端到端加密与紧急恢复密钥 */}
      <section className="apple-card p-5 sm:p-6 space-y-4 text-sm">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3.5">
          <div>
            <h2 className="font-semibold text-base text-apple-text dark:text-apple-text-dark flex items-center gap-2">
              <Lock size={16} />
              <span>端到端隐私加密与主密钥</span>
            </h2>
            <p className="text-xs text-apple-text-secondary mt-0.5">
              标记为隐私的记录由本地主密钥派生加密，云端仅存密文，公共大模型无法读取
            </p>
          </div>

          <button
            onClick={handleGenerateRecoveryKey}
            className="px-4 py-2 rounded-xl border border-black/8 dark:border-white/10 hover:bg-black/4 text-apple-text text-xs font-medium"
          >
            生成紧急恢复密钥
          </button>
        </div>

        {showRecoveryKey && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 space-y-2">
            <div className="font-medium text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-xs">
              <AlertTriangle size={14} />
              <span>紧急恢复密钥（请妥善离线保存，勿向任何人透露）</span>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-black/50 border border-amber-200/60 font-mono text-center text-sm tracking-wider text-apple-text dark:text-white font-bold select-all">
              {recoveryKey}
            </div>
          </div>
        )}
      </section>

      {/* 4. AI Credits 算力余额与套餐 */}
      <section className="apple-card p-5 sm:p-6 space-y-4 text-sm">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3.5">
          <div>
            <h2 className="font-semibold text-base text-apple-text dark:text-apple-text-dark flex items-center gap-2">
              <Sparkles size={16} className="text-apple-blue" />
              <span>算力点与服务配额</span>
            </h2>
            <p className="text-xs text-apple-text-secondary mt-0.5">
              用于生成周报月报、全库知识提炼及智能认知分析
            </p>
          </div>

          <div className="text-right">
            <div className="text-lg font-bold text-apple-text dark:text-apple-text-dark">
              {subscription?.ai_credits ?? 120} / {subscription?.max_credits ?? 200}
            </div>
            <div className="text-xs text-apple-text-tertiary">可用算力点</div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => handleRechargeCredits(50)}
            disabled={addingCredits}
            className="px-4 py-2 rounded-xl border border-black/8 dark:border-white/10 hover:bg-black/4 text-apple-text text-xs font-medium"
          >
            补充 50 算力点
          </button>
          <button
            onClick={() => handleRechargeCredits(100)}
            disabled={addingCredits}
            className="px-4 py-2 rounded-xl border border-black/8 dark:border-white/10 hover:bg-black/4 text-apple-text text-xs font-medium"
          >
            补充 100 算力点
          </button>
        </div>
      </section>
    </div>
  );
}
