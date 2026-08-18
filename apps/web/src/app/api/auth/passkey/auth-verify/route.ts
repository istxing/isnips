import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getDb } from '@/lib/db';
import { RP_ID, ORIGIN, createSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const { response: clientResponse, challengeId } = body;

    if (!clientResponse || !challengeId) {
      return NextResponse.json({ success: false, error: '缺少认证凭据' }, { status: 400 });
    }

    const chalRes = await db.query(`
      SELECT * FROM challenges 
      WHERE id = $1 AND type = 'auth' AND expires_at > NOW();
    `, [challengeId]);

    if (chalRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: '登录认证已超时，请重试' }, { status: 400 });
    }

    const expectedChallenge = (chalRes.rows[0] as any).challenge;
    const credentialId = clientResponse.id;

    // 查找该 credentialId 对应的注册凭据
    const authRes = await db.query(`
      SELECT a.*, u.*
      FROM authenticators a
      JOIN users u ON a.user_id = u.id
      WHERE a.credential_id = $1;
    `, [credentialId]);

    if (authRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: '未识别的 Passkey 设备，请先注册绑定' }, { status: 401 });
    }

    const authenticator = authRes.rows[0] as any;
    const publicKeyBuffer = Buffer.from(authenticator.credential_public_key, 'base64');

    const verification = await verifyAuthenticationResponse({
      response: clientResponse,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: authenticator.credential_id,
        publicKey: publicKeyBuffer,
        counter: Number(authenticator.counter),
        transports: typeof authenticator.transports === 'string'
          ? JSON.parse(authenticator.transports)
          : authenticator.transports || [],
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ success: false, error: 'Passkey 身份验证未通过' }, { status: 401 });
    }

    // 更新计数器
    await db.query(`
      UPDATE authenticators
      SET counter = $1
      WHERE credential_id = $2;
    `, [verification.authenticationInfo.newCounter, credentialId]);

    // 清除 challenge
    await db.query(`DELETE FROM challenges WHERE id = $1;`, [challengeId]);

    // 颁发 Session
    const token = await createSession(authenticator.user_id);

    const apiResponse = NextResponse.json({
      success: true,
      data: {
        user: {
          id: authenticator.user_id,
          email: authenticator.email,
          name: authenticator.name || authenticator.email.split('@')[0],
          avatar_url: authenticator.avatar_url,
          plan: authenticator.plan,
          ai_credits: authenticator.ai_credits,
          max_credits: authenticator.max_credits,
          master_key_set: Boolean(authenticator.master_key_set),
          has_password: Boolean(authenticator.password_hash),
          has_passkey: true,
          created_at: authenticator.created_at,
        },
        token,
      },
    });

    apiResponse.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: '/',
      maxAge: SESSION_MAX_AGE,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return apiResponse;
  } catch (error: any) {
    console.error('Passkey auth verify error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
