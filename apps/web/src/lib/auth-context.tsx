'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { UserModel, PasskeyDevice } from '../types';

interface AuthContextType {
  user: UserModel | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  devices: PasskeyDevice[];
  loginWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerWithPassword: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithPasskey: (email?: string) => Promise<{ success: boolean; error?: string }>;
  registerWithPasskey: (email: string, name?: string, deviceName?: string) => Promise<{ success: boolean; error?: string }>;
  registerPasskey: (deviceName?: string) => Promise<{ success: boolean; error?: string }>;
  removePasskeyDevice: (credentialId: string) => Promise<boolean>;
  loadDevices: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserModel | null>(null);
  const [devices, setDevices] = useState<PasskeyDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const json = await res.json();
      if (json.success && json.data) {
        setUser(json.data);
        setIsAuthenticated(Boolean(json.authenticated));
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const res = await fetch('/api/auth/passkey/devices');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDevices(json.data);
      }
    } catch {
      setDevices([]);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    loadDevices();
  }, []);

  const loginWithPassword = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (json.success) {
        setUser(json.data.user);
        setIsAuthenticated(true);
        await loadDevices();
        return { success: true };
      }
      return { success: false, error: json.error || '登录失败' };
    } catch (e: any) {
      return { success: false, error: e.message || '网络连接异常' };
    }
  };

  const registerWithPassword = async (email: string, password: string, name?: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const json = await res.json();
      if (json.success) {
        setUser(json.data.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: json.error || '注册失败' };
    } catch (e: any) {
      return { success: false, error: e.message || '网络连接异常' };
    }
  };

  const loginWithPasskey = async (email?: string) => {
    try {
      const optRes = await fetch('/api/auth/passkey/auth-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const optJson = await optRes.json();
      if (!optJson.success) {
        return { success: false, error: optJson.error || '无法获取 Passkey 验证参数' };
      }

      const { options, challengeId } = optJson.data;
      const asseResp = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch('/api/auth/passkey/auth-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: asseResp, challengeId }),
      });
      const verifyJson = await verifyRes.json();

      if (verifyJson.success) {
        setUser(verifyJson.data.user);
        setIsAuthenticated(true);
        await loadDevices();
        return { success: true };
      }
      return { success: false, error: verifyJson.error || 'Passkey 验证失败' };
    } catch (e: any) {
      if (e.name === 'NotAllowedError') {
        return { success: false, error: '用户取消了生物识别/Passkey 验证' };
      }
      return { success: false, error: e.message || 'Passkey 认证失败' };
    }
  };

  const registerWithPasskey = async (email: string, name?: string, deviceName?: string) => {
    try {
      const optRes = await fetch('/api/auth/passkey/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const optJson = await optRes.json();
      if (!optJson.success) {
        return { success: false, error: optJson.error || '无法获取注册参数' };
      }

      const { options, challengeId } = optJson.data;
      const attResp = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch('/api/auth/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: attResp,
          challengeId,
          email,
          name,
          deviceName: deviceName || 'Touch ID / Passkey',
        }),
      });
      const verifyJson = await verifyRes.json();

      if (verifyJson.success) {
        setUser(verifyJson.data.user);
        setIsAuthenticated(true);
        await loadDevices();
        return { success: true };
      }
      return { success: false, error: verifyJson.error || 'Passkey 绑定失败' };
    } catch (e: any) {
      if (e.name === 'NotAllowedError') {
        return { success: false, error: '用户取消了 Passkey 创建' };
      }
      return { success: false, error: e.message || 'Passkey 创建失败' };
    }
  };

  const registerPasskey = async (deviceName?: string) => {
    if (!user) return { success: false, error: '请先登录' };
    return registerWithPasskey(user.email, user.name, deviceName);
  };

  const removePasskeyDevice = async (credentialId: string) => {
    try {
      const res = await fetch(`/api/auth/passkey/devices?id=${encodeURIComponent(credentialId)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        await loadDevices();
        await fetchCurrentUser();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      await fetchCurrentUser();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        devices,
        loginWithPassword,
        registerWithPassword,
        loginWithPasskey,
        registerWithPasskey,
        registerPasskey,
        removePasskeyDevice,
        loadDevices,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
