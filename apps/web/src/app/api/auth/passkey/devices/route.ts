import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const db = await getDb();
    const res = await db.query(`
      SELECT credential_id, device_type, device_name, created_at
      FROM authenticators
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `, [user.id]);

    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get('id');

    if (!credentialId) {
      return NextResponse.json({ success: false, error: '缺少凭据 ID' }, { status: 400 });
    }

    const db = await getDb();
    await db.query(`
      DELETE FROM authenticators
      WHERE credential_id = $1 AND user_id = $2;
    `, [credentialId, user.id]);

    return NextResponse.json({ success: true, message: 'Passkey 设备已移除' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
