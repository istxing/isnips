import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { createSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const name = (body.name || '').trim() || email.split('@')[0];

    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, error: '请输入有效的邮箱地址' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: '密码长度至少需 6 位字符' }, { status: 400 });
    }

    // 检查邮箱是否已存在
    const existing = await db.query(`SELECT id FROM users WHERE email = $1;`, [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ success: false, error: '该邮箱已被注册，请直接登录' }, { status: 409 });
    }

    // 密码加盐哈希
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 插入新用户，赠送 200 初始算力
    const insertRes = await db.query(`
      INSERT INTO users (id, email, name, password_hash, plan, ai_credits, max_credits, master_key_set, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'plus', 120, 200, true, NOW(), NOW())
      RETURNING id, email, name, plan, ai_credits, max_credits, master_key_set, created_at;
    `, [userId, email, name, passwordHash]);

    const user = insertRes.rows[0] as any;

    // 颁发 Session
    const token = await createSession(userId);

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          ...user,
          has_password: true,
          has_passkey: false,
        },
        token,
      },
    });

    // 写入 HTTP-only Cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: '/',
      maxAge: SESSION_MAX_AGE,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
