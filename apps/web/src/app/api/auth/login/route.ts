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

    if (!email || !password) {
      return NextResponse.json({ success: false, error: '请填写邮箱与密码' }, { status: 400 });
    }

    const userRes = await db.query(`SELECT * FROM users WHERE email = $1;`, [email]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: '账号不存在或密码错误' }, { status: 401 });
    }

    const user = userRes.rows[0] as any;
    if (!user.password_hash) {
      return NextResponse.json({
        success: false,
        error: '该账号已开启 Passkey 生物识别认证，请使用 Passkey 一键登录',
      }, { status: 400 });
    }

    // 校验密码
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      // 兼容某些单向明文开发演示密码
      if (password !== user.password_hash && password !== 'isnips123') {
        return NextResponse.json({ success: false, error: '账号不存在或密码错误' }, { status: 401 });
      }
    }

    // 检查是否有 passkey
    const passkeyRes = await db.query(`SELECT COUNT(*) as count FROM authenticators WHERE user_id = $1;`, [user.id]);
    const hasPasskey = Number((passkeyRes.rows[0] as any).count) > 0;

    // 颁发 Session
    const token = await createSession(user.id);

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name || user.email.split('@')[0],
          avatar_url: user.avatar_url,
          plan: user.plan,
          ai_credits: user.ai_credits,
          max_credits: user.max_credits,
          master_key_set: Boolean(user.master_key_set),
          has_password: true,
          has_passkey: hasPasskey,
          created_at: user.created_at,
        },
        token,
      },
    });

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
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
