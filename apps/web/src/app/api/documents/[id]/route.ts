import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { DocumentModel } from '@/types';

// GET /api/documents/[id] - 获取单篇文档详情
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    const userId = user?.id || 'usr_default';
    const db = await getDb();

    const res = await db.query(
      `SELECT * FROM documents WHERE id = $1 AND user_id = $2;`,
      [params.id, userId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const r: any = res.rows[0];
    const doc: DocumentModel = {
      id: r.id,
      user_id: r.user_id,
      title: r.title,
      content: r.content,
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags || [],
      scope_meta: typeof r.scope_meta === 'string' ? JSON.parse(r.scope_meta) : r.scope_meta || {},
      version: r.version,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };

    return NextResponse.json({ success: true, data: doc });
  } catch (error: any) {
    console.error('Failed to get document:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/documents/[id] - 更新文档
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    const userId = user?.id || 'usr_default';
    const body = await req.json();
    const { title, content, tags, scope_meta } = body;

    const db = await getDb();

    let queryStr = `UPDATE documents SET updated_at = NOW()`;
    const updateParams: any[] = [];

    if (title !== undefined) {
      updateParams.push(title);
      queryStr += `, title = $${updateParams.length}`;
    }

    if (content !== undefined) {
      updateParams.push(content);
      queryStr += `, content = $${updateParams.length}`;
    }

    if (tags !== undefined) {
      updateParams.push(JSON.stringify(tags));
      queryStr += `, tags = $${updateParams.length}::jsonb`;
    }

    if (scope_meta !== undefined) {
      updateParams.push(JSON.stringify(scope_meta));
      queryStr += `, scope_meta = $${updateParams.length}::jsonb`;
    }

    updateParams.push(params.id);
    const idIdx = updateParams.length;
    updateParams.push(userId);
    const userIdx = updateParams.length;

    queryStr += ` WHERE id = $${idIdx} AND user_id = $${userIdx} RETURNING *;`;

    const res = await db.query(queryStr, updateParams);
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const r: any = res.rows[0];
    const updatedDoc: DocumentModel = {
      id: r.id,
      user_id: r.user_id,
      title: r.title,
      content: r.content,
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags || [],
      scope_meta: typeof r.scope_meta === 'string' ? JSON.parse(r.scope_meta) : r.scope_meta || {},
      version: r.version,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };

    return NextResponse.json({ success: true, data: updatedDoc });
  } catch (error: any) {
    console.error('Failed to update document:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/documents/[id] - 删除文档
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    const userId = user?.id || 'usr_default';
    const db = await getDb();

    await db.query(
      `DELETE FROM documents WHERE id = $1 AND user_id = $2;`,
      [params.id, userId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete document:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
