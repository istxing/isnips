import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb();
    const result = await db.query(`SELECT * FROM records WHERE id = $1;`, [params.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb();
    const body = await request.json();

    const currentRes = await db.query(`SELECT * FROM records WHERE id = $1;`, [params.id]);
    if (currentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }

    const current = currentRes.rows[0] as any;
    const title = body.title !== undefined ? body.title : current.title;
    const content = body.content !== undefined ? body.content : current.content;
    const type = body.type !== undefined ? body.type : current.type;
    const sourceUrl = body.source_url !== undefined ? body.source_url : current.source_url;
    const tags = body.tags !== undefined ? JSON.stringify(body.tags) : JSON.stringify(current.tags);
    const privacy = body.privacy !== undefined ? Boolean(body.privacy) : current.privacy;

    const sql = `
      UPDATE records
      SET title = $1, content = $2, type = $3, source_url = $4, tags = $5::jsonb, privacy = $6, version = version + 1, updated_at = NOW()
      WHERE id = $7
      RETURNING *;
    `;

    const updateRes = await db.query(sql, [
      title,
      content,
      type,
      sourceUrl,
      tags,
      privacy,
      params.id,
    ]);

    return NextResponse.json({ success: true, data: updateRes.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb();
    await db.query(`DELETE FROM records WHERE id = $1;`, [params.id]);
    return NextResponse.json({ success: true, message: 'Record deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
