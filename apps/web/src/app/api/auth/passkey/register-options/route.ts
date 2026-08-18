import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getDb } from '@/lib/db';
import { RP_NAME, RP_ID, getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    const currentUser = await getCurrentUser(request);

    const email = (body.email || currentUser?.email || '').trim().toLowerCase();
    const name = (body.name || currentUser?.name || email.split('@')[0] || 'User').trim();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, error: '请输入有效的邮箱地址' }, { status: 400 });
    }

    // 查询该用户已有的 Passkey
    const existingUser = await db.query(`SELECT id FROM users WHERE email = $1;`, [email]);
    let excludeCredentials: any[] = [];
    let userId = currentUser?.id || (existingUser.rows[0] as any)?.id;

    if (userId) {
      const passkeys = await db.query(`SELECT credential_id, transports FROM authenticators WHERE user_id = $1;`, [userId]);
      excludeCredentials = passkeys.rows.map((p: any) => ({
        id: p.credential_id,
        transports: typeof p.transports === 'string' ? JSON.parse(p.transports) : p.transports || [],
      }));
    } else {
      userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: new TextEncoder().encode(userId),
      userName: email,
      userDisplayName: name,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // 将 challenge 保存至数据库 (5分钟过期)
    const challengeId = `chl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    
    await db.query(`
      INSERT INTO challenges (id, user_id, challenge, type, expires_at)
      VALUES ($1, $2, $3, 'register', $4);
    `, [challengeId, userId, options.challenge, expiresAt]);

    return NextResponse.json({
      success: true,
      data: {
        options,
        challengeId,
        userId,
        email,
        name,
      },
    });
  } catch (error: any) {
    console.error('Passkey register options error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
