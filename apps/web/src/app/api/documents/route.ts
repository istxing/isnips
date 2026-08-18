import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { DocumentModel } from '@/types';

// GET /api/documents - 获取当前用户的文档列表
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = user?.id || 'usr_default';
    const db = await getDb();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const tag = searchParams.get('tag');

    let queryStr = `SELECT * FROM documents WHERE user_id = $1`;
    const params: any[] = [userId];

    if (q.trim()) {
      params.push(`%${q.trim()}%`);
      queryStr += ` AND (title ILIKE $${params.length} OR content ILIKE $${params.length})`;
    }

    if (tag) {
      params.push(JSON.stringify([tag]));
      queryStr += ` AND tags @> $${params.length}::jsonb`;
    }

    queryStr += ` ORDER BY updated_at DESC;`;

    const res = await db.query(queryStr, params);
    const documents: DocumentModel[] = res.rows.map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      title: r.title,
      content: r.content,
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags || [],
      scope_meta: typeof r.scope_meta === 'string' ? JSON.parse(r.scope_meta) : r.scope_meta || {},
      version: r.version,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return NextResponse.json({ success: true, data: documents });
  } catch (error: any) {
    console.error('Failed to get documents:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/documents - 新建文档
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = user?.id || 'usr_default';
    const body = await req.json();

    const { title, content, tags = [], scope_meta = {} } = body;
    if (!title || !content) {
      return NextResponse.json({ success: false, error: 'Title and content are required' }, { status: 400 });
    }

    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const db = await getDb();

    await db.query(
      `INSERT INTO documents (id, user_id, title, content, tags, scope_meta, version, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 1, NOW(), NOW());`,
      [docId, userId, title, content, JSON.stringify(tags), JSON.stringify(scope_meta)]
    );

    const newDoc: DocumentModel = {
      id: docId,
      user_id: userId,
      title,
      content,
      tags,
      scope_meta,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data: newDoc });
  } catch (error: any) {
    console.error('Failed to create document:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
