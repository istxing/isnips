import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const result = await db.query(`SELECT * FROM feeds ORDER BY updated_at DESC;`);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const id = `feed_${Date.now()}`;
    const title = body.title || '自定义订阅源';
    const url = body.url;
    const category = body.category || 'General';

    if (!url) {
      return NextResponse.json({ success: false, error: 'Feed URL is required' }, { status: 400 });
    }

    const sql = `
      INSERT INTO feeds (id, title, url, category, unread_count, updated_at)
      VALUES ($1, $2, $3, $4, 0, NOW())
      RETURNING *;
    `;

    const res = await db.query(sql, [id, title, url, category]);
    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Feed ID required' }, { status: 400 });
    }

    await db.query(`DELETE FROM feeds WHERE id = $1;`, [id]);
    return NextResponse.json({ success: true, message: 'Feed deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
