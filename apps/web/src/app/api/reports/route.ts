import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const result = await db.query(`SELECT * FROM reports ORDER BY created_at DESC;`);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const id = body.id || `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const userId = body.user_id || 'usr_default';
    const title = body.title || 'AI Report';
    const description = body.description || '';
    const reportType = body.report_type || 'weekly';
    const scope = JSON.stringify(body.scope || {});
    const prompt = body.prompt || null;
    const model = body.model || 'Gemini 1.5 Pro (iSnips Cloud)';
    const result = body.result || '';
    const summary = body.summary || '';
    const tokenUsage = body.token_usage || 0;
    const aiCreditCost = body.ai_credit_cost || 8;

    const sql = `
      INSERT INTO reports (id, user_id, title, description, report_type, scope, prompt, model, result, summary, token_usage, ai_credit_cost, version, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, 1, NOW(), NOW())
      RETURNING *;
    `;

    const reportRes = await db.query(sql, [
      id,
      userId,
      title,
      description,
      reportType,
      scope,
      prompt,
      model,
      result,
      summary,
      tokenUsage,
      aiCreditCost,
    ]);

    // 扣除用户 AI 算力
    await db.query(`
      UPDATE users
      SET ai_credits = GREATEST(0, ai_credits - $1)
      WHERE id = $2;
    `, [aiCreditCost, userId]);

    return NextResponse.json({ success: true, data: reportRes.rows[0] });
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
      return NextResponse.json({ success: false, error: 'Report ID required' }, { status: 400 });
    }

    await db.query(`DELETE FROM reports WHERE id = $1;`, [id]);
    return NextResponse.json({ success: true, message: 'Report deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
