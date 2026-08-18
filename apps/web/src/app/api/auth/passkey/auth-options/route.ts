import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getDb } from '@/lib/db';
import { RP_ID } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json().catch(() => ({}));
    const email = (body.email || '').trim().toLowerCase();

    let allowCredentials: any[] | undefined = undefined;
    let userId: string | null = null;

    if (email) {
      const userRes = await db.query(`SELECT id FROM users WHERE email = $1;`, [email]);
      if (userRes.rows.length > 0) {
        userId = (userRes.rows[0] as any).id;
        const passkeys = await db.query(`SELECT credential_id, transports FROM authenticators WHERE user_id = $1;`, [userId]);
        if (passkeys.rows.length > 0) {
          allowCredentials = passkeys.rows.map((p: any) => ({
            id: p.credential_id,
            transports: typeof p.transports === 'string' ? JSON.parse(p.transports) : p.transports || [],
          }));
        }
      }
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials,
      userVerification: 'preferred',
    });

    const challengeId = `chl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await db.query(`
      INSERT INTO challenges (id, user_id, challenge, type, expires_at)
      VALUES ($1, $2, $3, 'auth', $4);
    `, [challengeId, userId, options.challenge, expiresAt]);

    return NextResponse.json({
      success: true,
      data: {
        options,
        challengeId,
      },
    });
  } catch (error: any) {
    console.error('Passkey auth options error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
