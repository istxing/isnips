import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { getDb } from './db';
import { UserModel } from '../types';

export const RP_NAME = 'iSnips Personal Index';
export const RP_ID = process.env.NODE_ENV === 'production' ? 'isnips.app' : 'localhost';
export const ORIGIN = process.env.NODE_ENV === 'production' ? 'https://isnips.app' : 'http://localhost:3000';

export const SESSION_COOKIE_NAME = 'isnips_session';
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 天 (秒)

/**
 * 生成并保存用户会话 Session
 */
export async function createSession(userId: string): Promise<string> {
  const db = await getDb();
  const token = `sess_${crypto.randomBytes(32).toString('hex')}`;
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();

  await db.query(`
    INSERT INTO sessions (token, user_id, expires_at, created_at)
    VALUES ($1, $2, $3, NOW());
  `, [token, userId, expiresAt]);

  return token;
}

/**
 * 销毁会话
 */
export async function deleteSession(token: string): Promise<void> {
  const db = await getDb();
  await db.query(`DELETE FROM sessions WHERE token = $1;`, [token]);
}

/**
 * 从请求中提取当前登录用户
 */
export async function getCurrentUser(request: NextRequest): Promise<UserModel | null> {
  try {
    const db = await getDb();
    
    // 优先从 Cookie 读取，其次从 Authorization Header 读取
    let token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) {
      // 未携带 Token 时，默认使用缺省体验用户
      return null;
    }

    const sessionRes = await db.query(`
      SELECT s.token, s.expires_at, u.*
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = $1 AND s.expires_at > NOW();
    `, [token]);

    if (sessionRes.rows.length === 0) {
      return null;
    }

    const row = sessionRes.rows[0] as any;
    
    // 检查是否有 passkey
    const passkeyRes = await db.query(`
      SELECT COUNT(*) as count FROM authenticators WHERE user_id = $1;
    `, [row.id]);
    const hasPasskey = Number((passkeyRes.rows[0] as any).count) > 0;

    return {
      id: row.id,
      email: row.email,
      name: row.name || row.email.split('@')[0],
      avatar_url: row.avatar_url || undefined,
      plan: row.plan || 'plus',
      ai_credits: row.ai_credits,
      max_credits: row.max_credits,
      master_key_set: Boolean(row.master_key_set),
      has_password: Boolean(row.password_hash),
      has_passkey: hasPasskey,
      created_at: row.created_at,
    };
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}
