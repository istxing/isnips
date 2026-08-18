import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { getDb } from '@/lib/db';
import { RP_ID, ORIGIN, createSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const { response: clientResponse, challengeId, email, name, deviceName } = body;

    if (!clientResponse || !challengeId) {
      return NextResponse.json({ success: false, error: '缺少认证凭据数据' }, { status: 400 });
    }

    // 查询对应 challenge
    const chalRes = await db.query(`
      SELECT * FROM challenges 
      WHERE id = $1 AND type = 'register' AND expires_at > NOW();
    `, [challengeId]);

    if (chalRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: '注册认证已超时或失效，请重试' }, { status: 400 });
    }

    const challengeRecord = chalRes.rows[0] as any;
    const expectedChallenge = challengeRecord.challenge;
    let userId = challengeRecord.user_id;

    const verification = await verifyRegistrationResponse({
      response: clientResponse,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ success: false, error: 'Passkey 校验失败' }, { status: 400 });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    // 清除该 challenge
    await db.query(`DELETE FROM challenges WHERE id = $1;`, [challengeId]);

    // 检查/创建用户
    const userRes = await db.query(`SELECT * FROM users WHERE email = $1;`, [email]);
    let user: any;

    if (userRes.rows.length === 0) {
      const insertUser = await db.query(`
        INSERT INTO users (id, email, name, plan, ai_credits, max_credits, master_key_set, created_at, updated_at)
        VALUES ($1, $2, $3, 'plus', 120, 200, true, NOW(), NOW())
        RETURNING *;
      `, [userId, email, name || email.split('@')[0]]);
      user = insertUser.rows[0];
    } else {
      user = userRes.rows[0];
      userId = user.id;
    }

    // 存储 Passkey 凭据
    const credentialId = clientResponse.id;
    const publicKeyBase64 = Buffer.from(credential.publicKey).toString('base64');

    await db.query(`
      INSERT INTO authenticators (credential_id, user_id, credential_public_key, counter, device_type, backed_up, transports, device_name, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, NOW())
      ON CONFLICT (credential_id) DO UPDATE
      SET counter = EXCLUDED.counter,
          backed_up = EXCLUDED.backed_up;
    `, [
      credentialId,
      userId,
      publicKeyBase64,
      credential.counter,
      credentialDeviceType,
      credentialBackedUp,
      JSON.stringify(clientResponse.response?.transports || []),
      deviceName || 'Touch ID / Passkey',
    ]);

    // 颁发 Session
    const token = await createSession(userId);

    const apiResponse = NextResponse.json({
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
          has_password: Boolean(user.password_hash),
          has_passkey: true,
          created_at: user.created_at,
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
    console.error('Passkey register verify error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
