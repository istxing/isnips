import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      // 若未登录，默认提供访客体验数据
      const db = await getDb();
      const defaultUserRes = await db.query(`SELECT * FROM users WHERE id = 'usr_default';`);
      if (defaultUserRes.rows.length > 0) {
        const d = defaultUserRes.rows[0] as any;
        return NextResponse.json({
          success: true,
          authenticated: false,
          data: {
            id: d.id,
            email: d.email,
            name: d.name,
            plan: d.plan,
            ai_credits: d.ai_credits,
            max_credits: d.max_credits,
            master_key_set: Boolean(d.master_key_set),
            has_password: true,
            has_passkey: false,
            created_at: d.created_at,
          },
        });
      }
      return NextResponse.json({ success: true, authenticated: false, data: null });
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      data: user,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
