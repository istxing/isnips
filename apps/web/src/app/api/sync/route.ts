import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * 增量同步端点 (Record-level Sync)
 * 100% 原生兼容旧版 Chrome Extension 数据结构 (text, url, domain, 毫秒时间戳)
 * 以及 Web 端 RecordModel 标准模型
 */
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    // 兼容数组格式或带有 snippets / records 字段的请求体
    const clientItems: any[] = Array.isArray(body)
      ? body
      : body.snippets || body.records || [];

    const lastSyncTime = body.last_sync_time || body.lastSync || 0;
    const lastSyncDate = typeof lastSyncTime === 'number' && lastSyncTime > 0
      ? new Date(lastSyncTime).toISOString()
      : typeof lastSyncTime === 'string' && lastSyncTime.length > 4
      ? new Date(lastSyncTime).toISOString()
      : '1970-01-01T00:00:00Z';

    // 1. 合并客户端上传的数据 (兼容 Extension 与 Web 两种字段格式)
    for (const item of clientItems) {
      // 提取并标准化字段
      const id = item.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const userId = item.user_id || 'usr_default';

      // 内容与标题兼容：Extension 使用 text，Record 使用 content/title
      const content = item.content !== undefined ? item.content : (item.text || '');
      const rawTitle = item.title || item.source_title || (content ? content.slice(0, 30) : '未命名记录');
      const title = rawTitle;

      // 类型兼容：Extension 使用 'web' / 'note'，Record 使用 'clip' / 'note' / ...
      let type = item.type || 'clip';
      if (type === 'web') type = 'clip';

      // 链接与来源兼容
      const sourceUrl = item.source_url || item.url || null;
      let sourceTitle = item.source_title || item.title || null;
      let domain = item.domain || null;
      if (sourceUrl && !domain) {
        try {
          domain = new URL(sourceUrl).hostname;
        } catch {}
      }

      // 时间兼容：支持毫秒时间戳与 ISO 字符串
      const createdAt = item.created_at
        ? (typeof item.created_at === 'number' ? new Date(item.created_at).toISOString() : item.created_at)
        : new Date().toISOString();

      const updatedAt = item.updated_at
        ? (typeof item.updated_at === 'number' ? new Date(item.updated_at).toISOString() : item.updated_at)
        : new Date().toISOString();

      // 标签与元数据
      const tags = Array.isArray(item.tags) ? item.tags : [];
      const privacy = Boolean(item.privacy);
      const metadata = {
        ...(typeof item.metadata === 'object' ? item.metadata : {}),
        domain: domain || undefined,
        deleted_at: item.deleted_at || undefined,
        purged_at: item.purged_at || undefined,
        space_id: item.space_id || undefined,
      };

      const version = typeof item.version === 'number' ? item.version : 1;

      await db.query(`
        INSERT INTO records (id, user_id, type, title, content, source_url, source_title, tags, privacy, metadata, version, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE
        SET title = EXCLUDED.title,
            content = EXCLUDED.content,
            type = EXCLUDED.type,
            source_url = EXCLUDED.source_url,
            source_title = EXCLUDED.source_title,
            tags = EXCLUDED.tags,
            privacy = EXCLUDED.privacy,
            metadata = EXCLUDED.metadata,
            version = EXCLUDED.version,
            updated_at = EXCLUDED.updated_at
        WHERE records.version <= EXCLUDED.version OR records.updated_at < EXCLUDED.updated_at;
      `, [
        id,
        userId,
        type,
        title,
        content,
        sourceUrl,
        sourceTitle,
        JSON.stringify(tags),
        privacy,
        JSON.stringify(metadata),
        version,
        createdAt,
        updatedAt,
      ]);
    }

    // 2. 查询自 last_sync_time 之后服务端有更新的数据
    const serverUpdatesRes = await db.query(`
      SELECT * FROM records
      WHERE updated_at > $1
      ORDER BY updated_at ASC;
    `, [lastSyncDate]);

    // 3. 同时格式化成兼容 Extension 的双重形态
    const updates = serverUpdatesRes.rows.map((r: any) => {
      const tags = typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags || [];
      const metadata = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata || {};
      const createdTime = new Date(r.created_at).getTime();
      const updatedTime = new Date(r.updated_at).getTime();

      return {
        // Record 标准格式
        id: r.id,
        user_id: r.user_id,
        type: r.type,
        title: r.title,
        content: r.content,
        source_url: r.source_url,
        source_title: r.source_title,
        tags,
        privacy: r.privacy,
        metadata,
        version: r.version,
        created_at: r.created_at,
        updated_at: r.updated_at,

        // 兼容 Extension 原始字段
        text: r.content,
        url: r.source_url,
        domain: metadata.domain || (r.source_url ? (() => { try { return new URL(r.source_url).hostname; } catch { return null; } })() : null),
        created_at_ms: createdTime,
        updated_at_ms: updatedTime,
        deleted_at: metadata.deleted_at || null,
        purged_at: metadata.purged_at || null,
      };
    });

    return NextResponse.json({
      success: true,
      server_time: new Date().toISOString(),
      server_time_ms: Date.now(),
      count: updates.length,
      updates,
      // 兼容旧版 snippets key
      snippets: updates,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
