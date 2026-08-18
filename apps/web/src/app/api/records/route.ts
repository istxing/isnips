import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    const q = searchParams.get('q') || '';
    const type = searchParams.get('type') || '';
    const privacy = searchParams.get('privacy') || '';
    const tag = searchParams.get('tag') || '';

    let sql = `SELECT * FROM records WHERE 1=1`;
    const params: any[] = [];
    let paramIdx = 1;

    if (type && type !== 'all') {
      sql += ` AND type = $${paramIdx++}`;
      params.push(type);
    }

    if (privacy === 'public') {
      sql += ` AND privacy = false`;
    } else if (privacy === 'private') {
      sql += ` AND privacy = true`;
    }

    if (tag) {
      sql += ` AND tags @> $${paramIdx++}::jsonb`;
      params.push(JSON.stringify([tag]));
    }

    if (q.trim()) {
      sql += ` AND (title ILIKE $${paramIdx} OR content ILIKE $${paramIdx})`;
      params.push(`%${q.trim()}%`);
      paramIdx++;
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await db.query(sql, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching records:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const id = body.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const userId = body.user_id || 'usr_default';
    const type = body.type || 'note';
    const title = body.title || 'Untitled Record';
    const content = body.content || '';
    const sourceUrl = body.source_url || null;
    const sourceTitle = body.source_title || null;
    const tags = JSON.stringify(body.tags || []);
    const privacy = Boolean(body.privacy);
    const metadata = JSON.stringify(body.metadata || {});

    const sql = `
      INSERT INTO records (id, user_id, type, title, content, source_url, source_title, tags, privacy, metadata, version, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb, 1, NOW(), NOW())
      RETURNING *;
    `;

    const result = await db.query(sql, [
      id,
      userId,
      type,
      title,
      content,
      sourceUrl,
      sourceTitle,
      tags,
      privacy,
      metadata,
    ]);

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating record:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
