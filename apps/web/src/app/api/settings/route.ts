import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const result = await db.query(`SELECT * FROM users WHERE id = 'usr_default';`);
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          plan: 'plus',
          ai_credits: 120,
          max_credits: 200,
          master_key_set: true,
          expires_at: '2026-12-31T23:59:59Z',
        },
      });
    }
    const user = result.rows[0] as any;
    return NextResponse.json({
      success: true,
      data: {
        plan: user.plan,
        ai_credits: user.ai_credits,
        max_credits: user.max_credits,
        master_key_set: user.master_key_set,
        expires_at: '2026-12-31T23:59:59Z',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    if (body.add_credits) {
      const res = await db.query(`
        UPDATE users
        SET ai_credits = ai_credits + $1
        WHERE id = 'usr_default'
        RETURNING *;
      `, [Number(body.add_credits)]);
      return NextResponse.json({ success: true, data: res.rows[0] });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
