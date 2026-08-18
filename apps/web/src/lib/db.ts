import { PGlite } from '@electric-sql/pglite';

let dbInstance: PGlite | null = null;
let isInitialized = false;

/**
 * 获取本地持久化 PostgreSQL 实例 (PGlite)
 */
export async function getDb(): Promise<PGlite> {
  if (!dbInstance) {
    dbInstance = new PGlite();
  }

  if (!isInitialized) {
    await initSchemaAndSeed(dbInstance);
    isInitialized = true;
  }

  return dbInstance;
}

/**
 * 初始化 PostgreSQL 数据表与初始种子数据
 */
async function initSchemaAndSeed(db: PGlite) {
  // 1. 创建核心表结构 (PostgreSQL DDL)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(128) NOT NULL DEFAULT '',
      password_hash TEXT,
      avatar_url TEXT,
      plan VARCHAR(32) NOT NULL DEFAULT 'plus',
      ai_credits INT NOT NULL DEFAULT 120,
      max_credits INT NOT NULL DEFAULT 200,
      master_key_set BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS authenticators (
      credential_id TEXT PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_public_key TEXT NOT NULL,
      counter BIGINT NOT NULL DEFAULT 0,
      device_type VARCHAR(64) NOT NULL DEFAULT 'single_device',
      backed_up BOOLEAN NOT NULL DEFAULT false,
      transports JSONB DEFAULT '[]'::jsonb,
      device_name VARCHAR(128) DEFAULT 'Passkey Device',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_authenticators_user_id ON authenticators(user_id);

    CREATE TABLE IF NOT EXISTS sessions (
      token VARCHAR(128) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS challenges (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64),
      challenge TEXT NOT NULL,
      type VARCHAR(32) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );

    -- 原始 Record 表 (闪记、片段、剪贴板、RSS、书签等)
    CREATE TABLE IF NOT EXISTS records (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL DEFAULT 'usr_default',
      type VARCHAR(32) NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      source_url TEXT,
      source_title TEXT,
      source_type VARCHAR(64),
      tags JSONB DEFAULT '[]'::jsonb,
      privacy BOOLEAN NOT NULL DEFAULT false,
      metadata JSONB DEFAULT '{}'::jsonb,
      version INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
    CREATE INDEX IF NOT EXISTS idx_records_type ON records(type);
    CREATE INDEX IF NOT EXISTS idx_records_privacy ON records(privacy);
    CREATE INDEX IF NOT EXISTS idx_records_created_at ON records(created_at DESC);

    -- Document 知识文档表 (用户可编辑的 Markdown 文档，不反向修改 Record)
    CREATE TABLE IF NOT EXISTS documents (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL DEFAULT 'usr_default',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags JSONB DEFAULT '[]'::jsonb,
      scope_meta JSONB DEFAULT '{}'::jsonb,
      version INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

    -- AI 阶段报告表 (AI 分析产物，顶部附带 Data Scope 永久回溯)
    CREATE TABLE IF NOT EXISTS reports (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL DEFAULT 'usr_default',
      title TEXT NOT NULL,
      description TEXT,
      report_type VARCHAR(32) NOT NULL,
      scope JSONB NOT NULL DEFAULT '{}'::jsonb,
      prompt TEXT,
      model VARCHAR(64) NOT NULL DEFAULT 'Gemini 1.5 Pro (iSnips Cloud)',
      result TEXT NOT NULL,
      summary TEXT,
      token_usage INT DEFAULT 0,
      ai_credit_cost INT NOT NULL DEFAULT 8,
      version INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
    CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

    -- RSS 订阅与推荐流
    CREATE TABLE IF NOT EXISTS feeds (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      url TEXT NOT NULL UNIQUE,
      site_url TEXT,
      description TEXT,
      category VARCHAR(64) DEFAULT 'General',
      unread_count INT DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS feed_items (
      id VARCHAR(64) PRIMARY KEY,
      feed_id VARCHAR(64) REFERENCES feeds(id) ON DELETE CASCADE,
      feed_title VARCHAR(255) NOT NULL,
      title TEXT NOT NULL,
      link TEXT NOT NULL,
      snippet TEXT NOT NULL,
      content TEXT,
      published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ai_summary TEXT,
      ai_score INT DEFAULT 85,
      is_saved BOOLEAN NOT NULL DEFAULT false
    );

    CREATE INDEX IF NOT EXISTS idx_feed_items_published ON feed_items(published_at DESC);
  `);

  // 2. 检查并注入默认初始用户与种子数据
  const userCheck = await db.query(`SELECT COUNT(*) as count FROM users;`);
  const userCount = Number((userCheck.rows[0] as any).count);

  if (userCount === 0) {
    // 默认测试用户 (密码: isnips123)
    await db.exec(`
      INSERT INTO users (id, email, name, password_hash, plan, ai_credits, max_credits, master_key_set)
      VALUES (
        'usr_default',
        'kevin@isnips.app',
        'Kevin',
        '$2a$10$f66r8m9G3yU/j8vE81QpI.cE8sCq4b2Zz7b6s0Z0y1Hq3F3.G9c6e',
        'plus',
        120,
        200,
        true
      )
      ON CONFLICT DO NOTHING;
    `);

    // 插入符合 V2 分类规范的初始 Records (闪记、片段、剪贴板、书签、高亮)
    await db.exec(`
      INSERT INTO records (id, user_id, type, title, content, source_url, source_title, tags, privacy, version, created_at)
      VALUES 
      ('rec_101', 'usr_default', 'clip', 'Next.js 14 App Router 官方架构与最佳实践指南', '深入探讨了 React Server Components (RSC)、流式渲染 Streaming、并行路由 Parallel Routes 与多级数据缓存策略。', 'https://nextjs.org/docs/app', 'Next.js Documentation', '["Frontend", "Nextjs", "Architecture"]'::jsonb, false, 1, NOW() - INTERVAL '2 hours'),
      ('rec_102', 'usr_default', 'note', '关于 iSnips 端到端加密 Master Key 体系的思考', '主密码通过 Argon2id 派生 Master Key，客户端加密后上传云端，AI 默认不可见。Recovery Key 作为最后紧急防线。', NULL, NULL, '["Security", "Crypto", "E2EE"]'::jsonb, true, 1, NOW() - INTERVAL '5 hours'),
      ('rec_103', 'usr_default', 'clipboard', 'curl -X POST https://api.isnips.app/v2/records -H "Authorization: Bearer key_live_..."', '剪贴板自动捕获内容：测试 API 端点调用与鉴权 Header 参数。', 'https://developers.isnips.app/api', 'Developer Docs', '["Dev", "Clipboard", "API"]'::jsonb, false, 1, NOW() - INTERVAL '1 day'),
      ('rec_104', 'usr_default', 'idea', '产品哲学：原始记录无限增长，报告负责降低信息复杂度', 'AI 工具不应停留于单轮聊天。真正的价值在于从碎片化的 Capture 中形成 Personal Index，再通过阶段性 Report 沉淀认知飞轮。', NULL, NULL, '["Philosophy", "Product", "Methodology"]'::jsonb, false, 1, NOW() - INTERVAL '2 days'),
      ('rec_105', 'usr_default', 'clip', 'SQLite FTS5 Unicode61 分词器与本地离线检索配置', 'FTS5 支持 unicode61 分词器与 remove_diacritics 参数，非常适合在桌面客户端进行毫秒级中英文全文搜索。', 'https://sqlite.org/fts5.html', 'SQLite Documentation', '["Database", "SQLite", "Search"]'::jsonb, false, 1, NOW() - INTERVAL '3 days'),
      ('rec_106', 'usr_default', 'clipboard', 'const scope = { types: ["note", "clip"], exclude_privacy: true };', '剪贴板代码片段：Scope 过滤对象构造逻辑。', 'https://github.com/istxing/iSnips', 'GitHub Repo', '["Code", "Clipboard"]'::jsonb, false, 1, NOW() - INTERVAL '4 days'),
      ('rec_107', 'usr_default', 'note', 'UI 视觉规范复盘：像 Apple Notes + iCloud，不做传统 SaaS 仪表盘', '页面要安静、轻盈、克制、大留白。不要出现大面积彩色卡片、高饱和度渐变或厚重阴影。', NULL, NULL, '["Design", "AppleStyle", "UI"]'::jsonb, false, 1, NOW() - INTERVAL '5 days')
      ON CONFLICT DO NOTHING;
    `);

    // 插入初始 Document (可编辑 Markdown 文档)
    await db.exec(`
      INSERT INTO documents (id, user_id, title, content, tags, scope_meta, created_at)
      VALUES (
        'doc_101',
        'usr_default',
        '2026年8月上旬产品与架构演进整理文档',
        '# 2026年8月上旬产品与架构演进整理\n\n> 本文档基于 8月1日～8月15日 原始 Record 生成并持续整理。\n\n## 1. 核心设计共识\n- **数据不可变原则**：原始 Record 保持原样，汇总查看完全不经 AI。\n- **文档与报告分离**：Document 由用户自主编辑整理；Report 由 AI 阶段性分析生成。\n\n## 2. 交互与视觉优化\n- 侧边栏采用分组收拢设计：\`Index\`、\`Knowledge\`、\`Home\`、\`Settings\`。\n- 全局引入 macOS Spotlight 风格检索框（⌘K 快捷唤出）。\n\n## 3. 下一步工作项\n1. 完善 Chrome 插件自动捕获 COPY 行为与云端实时增量同步。\n2. 优化 Local App 全局快捷键唤起。',
        '["Product", "Architecture", "Design"]'::jsonb,
        '{"generated_from_scope": true, "record_count": 6, "time_range_desc": "2026-08-01 ~ 2026-08-15"}'::jsonb,
        NOW() - INTERVAL '1 day'
      )
      ON CONFLICT DO NOTHING;
    `);

    // 插入初始 Report (AI 阶段性产物，顶部带 Scope 标牌)
    await db.exec(`
      INSERT INTO reports (id, user_id, title, report_type, scope, prompt, model, summary, result, ai_credit_cost, created_at)
      VALUES (
        'rep_101',
        'usr_default',
        '2026年8月第2周：个人知识索引与 AI 架构观察报告',
        'weekly',
        '{"preset": "7days", "types": ["note", "clip", "clipboard", "idea"], "exclude_privacy": true}'::jsonb,
        '总结本周在个人信息索引、加密体系与 UI 规范方面的关键思考与演进。',
        'Gemini 1.5 Pro (iSnips Cloud)',
        '本周聚焦在数据对象三层解耦（Record/Document/Report）、Apple 极简设计规范及端到端隐私加密方案。',
        '# 2026年8月第2周：个人知识索引与 AI 架构观察报告\n\n### 概览 Overview\n本周在知识管理体系与前端交互设计上取得了重要共识，明确了 **“Record 记录不可变 → 汇总查看不经 AI → Document 自主编辑 → Report 阶段洞察”** 的清晰产品飞轮。\n\n---\n\n### 主要趋势 Trends\n1. **数据三层解耦 (Three-Tier Data Decoupling)**：\n   - **Record** 作为最底层原子数据，保证原始真实性。\n   - **Document** 作为可编辑 Markdown 载体，支持自由重构。\n   - **Report** 作为 AI 深度压缩产物，降低长期认知负荷。\n\n2. **Apple 风格原生质感**：\n   - 放弃传统 SaaS 复杂仪表盘与彩色卡片，追求安静、克制、大留白的数字个人空间。\n\n3. **端到端加密体系 (E2EE)**：\n   - 仅对敏感记录使用本地 Master Key 加密，云端保存密文且默认不参与公网 AI。\n\n---\n\n### 关键行动建议\n- 继续推进快捷键全局呼出能力 (Spotlight 模式)。\n- 在 Web 端提供更流畅的纯文本 Markdown 阅读与写作体验。',
        12,
        NOW() - INTERVAL '12 hours'
      )
      ON CONFLICT DO NOTHING;
    `);

    // 插入初始 Feeds 与 Feed Items
    await db.exec(`
      INSERT INTO feeds (id, title, url, site_url, description, category, unread_count)
      VALUES 
      ('feed_1', 'Hacker News Daily Digest', 'https://news.ycombinator.com/rss', 'https://news.ycombinator.com', '前沿科技与黑客文化热点聚合', 'Tech', 3),
      ('feed_2', 'AI Research & Engineering', 'https://arxiv.org/rss/cs.AI', 'https://arxiv.org', '人工智能与大语言模型学术前沿', 'AI', 2)
      ON CONFLICT DO NOTHING;

      INSERT INTO feed_items (id, feed_id, feed_title, title, link, snippet, ai_summary, ai_score, is_saved, published_at)
      VALUES
      ('item_1', 'feed_1', 'Hacker News Daily Digest', 'Local-First Software: You own your data, in spite of the cloud', 'https://www.inkandswitch.com/local-first/', '探讨了 Local-First 软件架构如何让用户真正掌控数据，同时兼具云端同步与协作便利。', '【AI 提炼】Local-First 架构主张客户端持有主副本，解决离线可用性、所有权与响应延迟问题。与 iSnips 本地 + 云端 Sync 理念高度契合。', 95, false, NOW() - INTERVAL '3 hours'),
      ('item_2', 'feed_2', 'AI Research & Engineering', 'Memory Consolidation for Autonomous Agents over Long Horizons', 'https://arxiv.org/abs/2405.xxxxx', '提出了一种基于多层级摘要与时序索引的 Agent 长期记忆整合算法，大幅降低 Token 消耗。', '【AI 提炼】通过将周期性碎片经验压缩为阶段性 Report，实现类似人类睡眠记忆巩固的机制。', 92, false, NOW() - INTERVAL '7 hours')
      ON CONFLICT DO NOTHING;
    `);
  }
}
