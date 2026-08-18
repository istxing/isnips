import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const result = await db.query(`SELECT * FROM feed_items ORDER BY published_at DESC LIMIT 30;`);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    const itemId = body.item_id;

    if (!itemId) {
      return NextResponse.json({ success: false, error: 'item_id required' }, { status: 400 });
    }

    const itemRes = await db.query(`SELECT * FROM feed_items WHERE id = $1;`, [itemId]);
    if (itemRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    const item = itemRes.rows[0] as any;
    const recordId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const content = item.ai_summary
      ? `${item.ai_summary}\n\n原文概要：${item.snippet}`
      : item.snippet;

    // 插入 Record
    const recordRes = await db.query(`
      INSERT INTO records (id, user_id, type, title, content, source_url, source_title, tags, privacy, metadata, version, created_at, updated_at)
      VALUES ($1, 'usr_default', 'rss', $2, $3, $4, $5, $6::jsonb, false, $7::jsonb, 1, NOW(), NOW())
      RETURNING *;
    `, [
      recordId,
      item.title,
      content,
      item.link,
      item.feed_title,
      JSON.stringify(['RSS', item.feed_title]),
      JSON.stringify({ ai_score: item.ai_score }),
    ]);

    // 更新 feed_item 状态
    await db.query(`UPDATE feed_items SET is_saved = true WHERE id = $1;`, [itemId]);

    return NextResponse.json({ success: true, data: recordRes.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
