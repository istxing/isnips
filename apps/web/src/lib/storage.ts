import { RecordModel, ReportModel, RSSFeed, FeedItem, UserSubscription, AIInsight } from '../types';

const STORAGE_KEYS = {
  RECORDS: 'isnips_records',
  REPORTS: 'isnips_reports',
  FEEDS: 'isnips_feeds',
  FEED_ITEMS: 'isnips_feed_items',
  SUBSCRIPTION: 'isnips_subscription',
  RECOVERY_KEY: 'isnips_recovery_key',
};

const INITIAL_RECORDS: RecordModel[] = [
  {
    id: 'rec_101',
    user_id: 'usr_default',
    type: 'bookmark',
    title: 'Next.js 14 App Router 官方架构与最佳实践指南',
    content: '深入探讨了 React Server Components (RSC)、流式渲染 Streaming、并行路由 Parallel Routes 与多级数据缓存策略。',
    source_url: 'https://nextjs.org/docs/app',
    source_title: 'Next.js Documentation',
    tags: ['Frontend', 'Nextjs', 'React', 'Architecture'],
    privacy: false,
    created_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    version: 1,
  },
  {
    id: 'rec_102',
    user_id: 'usr_default',
    type: 'idea',
    title: '关于 iSnips 端到端加密 Master Key 体系的思考',
    content: '用户主密码通过 Argon2id 派生 Master Key，客户端加密后上传云端，AI 默认不可见。Recovery Key 作为最后紧急防线。',
    tags: ['Security', 'Crypto', 'E2EE', 'Architecture'],
    privacy: true,
    created_at: new Date(Date.now() - 3600 * 1000 * 24 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000 * 24 * 2).toISOString(),
    version: 1,
  },
  {
    id: 'rec_103',
    user_id: 'usr_default',
    type: 'clip',
    title: 'SQLite FTS5 Unicode61 分词器与本地离线检索配置',
    content: 'FTS5 支持 unicode61 分词器与 remove_diacritics 参数，非常适合在桌面客户端进行毫秒级中英文全文搜索。',
    source_url: 'https://sqlite.org/fts5.html',
    source_title: 'SQLite Documentation',
    tags: ['Database', 'SQLite', 'Search', 'Desktop'],
    privacy: false,
    created_at: new Date(Date.now() - 3600 * 1000 * 24 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000 * 24 * 4).toISOString(),
    version: 1,
  },
  {
    id: 'rec_104',
    user_id: 'usr_default',
    type: 'note',
    title: '现代 AI Agent 架构演进：从单轮对话到长期记忆沉淀',
    content: 'AI 工具不应停留于聊天界面。真正的价值在于从碎片化的 Capture 中形成 Personal Index，再通过阶段性 Report 沉淀认知飞轮。',
    tags: ['AI', 'Agent', 'PersonalIndex', 'Knowledge'],
    privacy: false,
    created_at: new Date(Date.now() - 3600 * 1000 * 24 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000 * 24 * 5).toISOString(),
    version: 1,
  },
  {
    id: 'rec_105',
    user_id: 'usr_default',
    type: 'highlight',
    title: '“原始记录可以无限增长，报告负责不断降低信息复杂度”',
    content: '摘自产品核心哲学：用户不需要 10 万条记录 + 5 万条 AI 摘要，而是需要经过阶段性 Report 压缩后的核心认知与趋势。',
    source_url: 'https://isnips.app/philosophy',
    source_title: 'iSnips Philosophy',
    tags: ['Philosophy', 'Product', 'Methodology'],
    privacy: false,
    created_at: new Date(Date.now() - 3600 * 1000 * 24 * 6).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000 * 24 * 6).toISOString(),
    version: 1,
  },
];

const INITIAL_REPORTS: ReportModel[] = [
  {
    id: 'rep_101',
    user_id: 'usr_default',
    title: '2026 年 8 月第 2 周：AI Agent 与个人索引系统思考周报',
    report_type: 'weekly',
    scope: {
      preset: '7days',
      types: ['bookmark', 'idea', 'note', 'clip'],
      exclude_privacy: true,
    },
    prompt: '总结本周关于 AI Agent 与个人知识索引的核心想法，提炼重复出现的观点与新的方向。',
    model: 'Gemini 1.5 Pro (iSnips Cloud)',
    created_at: new Date(Date.now() - 3600 * 1000 * 24 * 1).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000 * 24 * 1).toISOString(),
    summary: '本周重点聚焦在多端解耦架构、本地离线检索 FTS5 及端到端隐私加密设计。',
    result: `## 📊 2026 年 8 月第 2 周：认知阶段性总结报告

### 1. 核心主题与注意力分布
本周主要精力集中于 **AI Agent 架构**、**个人信息索引 (Personal Index)** 及 **本地与云端混合存储**：
- **统一抽象 (Unified Record)**：将网页书签、剪藏、随笔与代码片段全部抹平为 \`Record\` 模型。
- **报告认知飞轮**：明确了“原始记录无限增长，报告负责持续降低信息复杂度”的核心原则。

### 2. 关键技术方案确认
1. **Web 端主工作台**：基于 Next.js 14 + Tailwind CSS，承担数据管理、Scope 分析与 Super Home 仪表盘。
2. **离线检索能力**：桌面端采用 SQLite + FTS5 unicode61 分词，保障毫秒级全文匹配。
3. **端到端加密体系**：Master Key 本地派生，隐私数据在云端不解密、不参与公共 AI 分析。

### 3. 下一步行动建议
- 持续完善 Scope Builder，支持更加灵活的动态范围与固定范围报告回放。
- 在 Super Home 增加 AI Digest 每日要闻推送流。`,
    ai_credit_cost: 12,
    version: 1,
  },
];

const INITIAL_FEEDS: RSSFeed[] = [
  {
    id: 'feed_1',
    title: 'Hacker News Daily Digest',
    url: 'https://news.ycombinator.com/rss',
    site_url: 'https://news.ycombinator.com',
    description: '前沿科技与黑客文化热点聚合',
    category: 'Tech',
    updated_at: new Date().toISOString(),
    unread_count: 5,
  },
  {
    id: 'feed_2',
    title: 'AI Research & Engineering',
    url: 'https://arxiv.org/rss/cs.AI',
    site_url: 'https://arxiv.org',
    description: '人工智能与大语言模型学术前沿',
    category: 'AI',
    updated_at: new Date().toISOString(),
    unread_count: 3,
  },
];

const INITIAL_FEED_ITEMS: FeedItem[] = [
  {
    id: 'item_1',
    feed_id: 'feed_1',
    feed_title: 'Hacker News Daily Digest',
    title: 'Local-First Software: You own your data, in spite of the cloud',
    link: 'https://www.inkandswitch.com/local-first/',
    snippet: '探讨了 Local-First 软件架构如何让用户真正掌控数据，同时兼具云端同步与协作便利。',
    published_at: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
    ai_summary: '【AI 提炼】Local-First 架构主张客户端持有主副本，解决离线可用性、所有权与响应延迟问题。与 iSnips 本地 SQLite + 云端 Sync 理念高度契合。',
    ai_score: 95,
    is_saved: false,
  },
  {
    id: 'item_2',
    feed_id: 'feed_2',
    feed_title: 'AI Research & Engineering',
    title: 'Memory Consolidation for Autonomous Agents over Long Horizons',
    link: 'https://arxiv.org/abs/2405.xxxxx',
    snippet: '提出了一种基于多层级摘要与时序索引的 Agent 长期记忆整合算法，大幅降低 Token 消耗。',
    published_at: new Date(Date.now() - 3600 * 1000 * 7).toISOString(),
    ai_summary: '【AI 提炼】通过将周期性经验压缩为阶段性 Report，实现类似人类睡眠记忆巩固的机制。',
    ai_score: 92,
    is_saved: false,
  },
  {
    id: 'item_3',
    feed_id: 'feed_1',
    feed_title: 'Hacker News Daily Digest',
    title: 'Next-Generation Web Typography and Fluid Design Tokens',
    link: 'https://example.com/web-typography',
    snippet: '现代 Web 排版与流动式设计规范，如何在深色与浅色模式下保持极佳的阅读舒适度。',
    published_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    ai_summary: '【AI 提炼】设计系统最佳实践，针对长文本工作台界面的字阶与对比度优化方案。',
    ai_score: 84,
    is_saved: false,
  },
];

const INITIAL_SUBSCRIPTION: UserSubscription = {
  plan: 'plus',
  ai_credits: 120,
  max_credits: 200,
  expires_at: '2026-12-31T23:59:59Z',
  master_key_set: true,
};

export class AppStorage {
  private static isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  // --- Records ---
  public static getRecords(): RecordModel[] {
    if (!this.isBrowser()) return INITIAL_RECORDS;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(INITIAL_RECORDS));
        return INITIAL_RECORDS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_RECORDS;
    }
  }

  public static saveRecord(record: Omit<RecordModel, 'id' | 'created_at' | 'updated_at' | 'version'> & { id?: string }): RecordModel {
    const records = this.getRecords();
    const now = new Date().toISOString();
    const newRecord: RecordModel = {
      ...record,
      id: record.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: now,
      updated_at: now,
      version: 1,
    };
    const updated = [newRecord, ...records];
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updated));
    }
    return newRecord;
  }

  public static updateRecord(id: string, updates: Partial<RecordModel>): RecordModel | null {
    const records = this.getRecords();
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) return null;
    const updatedRecord: RecordModel = {
      ...records[index],
      ...updates,
      updated_at: new Date().toISOString(),
      version: records[index].version + 1,
    };
    records[index] = updatedRecord;
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
    }
    return updatedRecord;
  }

  public static deleteRecord(id: string): boolean {
    const records = this.getRecords();
    const filtered = records.filter((r) => r.id !== id);
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(filtered));
    }
    return true;
  }

  // --- Reports ---
  public static getReports(): ReportModel[] {
    if (!this.isBrowser()) return INITIAL_REPORTS;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REPORTS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(INITIAL_REPORTS));
        return INITIAL_REPORTS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_REPORTS;
    }
  }

  public static saveReport(report: Omit<ReportModel, 'id' | 'created_at' | 'updated_at' | 'version'>): ReportModel {
    const reports = this.getReports();
    const now = new Date().toISOString();
    const newReport: ReportModel = {
      ...report,
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: now,
      updated_at: now,
      version: 1,
    };
    const updated = [newReport, ...reports];
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(updated));
      // Deduct AI credits
      this.deductCredits(report.ai_credit_cost);
    }
    return newReport;
  }

  public static deleteReport(id: string): boolean {
    const reports = this.getReports();
    const filtered = reports.filter((r) => r.id !== id);
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(filtered));
    }
    return true;
  }

  // Report-to-Record: Turn an AI Report into a new searchable Record
  public static reportToRecord(report: ReportModel): RecordModel {
    return this.saveRecord({
      user_id: report.user_id,
      type: 'report',
      title: `[报告] ${report.title}`,
      content: report.result,
      tags: ['Report', report.report_type, ...(report.scope.topics || [])],
      privacy: false,
      source_type: 'iSnips AI Report Engine',
      metadata: {
        original_report_id: report.id,
        ai_credit_cost: report.ai_credit_cost,
      },
    });
  }

  // --- RSS Feeds & Items ---
  public static getFeeds(): RSSFeed[] {
    if (!this.isBrowser()) return INITIAL_FEEDS;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FEEDS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.FEEDS, JSON.stringify(INITIAL_FEEDS));
        return INITIAL_FEEDS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_FEEDS;
    }
  }

  public static addFeed(title: string, url: string, category = 'General'): RSSFeed {
    const feeds = this.getFeeds();
    const newFeed: RSSFeed = {
      id: `feed_${Date.now()}`,
      title,
      url,
      category,
      updated_at: new Date().toISOString(),
      unread_count: 0,
    };
    const updated = [newFeed, ...feeds];
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.FEEDS, JSON.stringify(updated));
    }
    return newFeed;
  }

  public static deleteFeed(id: string): boolean {
    const feeds = this.getFeeds().filter((f) => f.id !== id);
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.FEEDS, JSON.stringify(feeds));
    }
    return true;
  }

  public static getFeedItems(): FeedItem[] {
    if (!this.isBrowser()) return INITIAL_FEED_ITEMS;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FEED_ITEMS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.FEED_ITEMS, JSON.stringify(INITIAL_FEED_ITEMS));
        return INITIAL_FEED_ITEMS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_FEED_ITEMS;
    }
  }

  public static saveFeedItemToRecord(item: FeedItem): RecordModel {
    const rec = this.saveRecord({
      user_id: 'usr_default',
      type: 'rss',
      title: item.title,
      content: item.ai_summary ? `${item.ai_summary}\n\n原文概要：${item.snippet}` : item.snippet,
      source_url: item.link,
      source_title: item.feed_title,
      tags: ['RSS', item.feed_title],
      privacy: false,
      metadata: { ai_score: item.ai_score },
    });

    // Mark as saved in feed items
    const items = this.getFeedItems().map((i) => (i.id === item.id ? { ...i, is_saved: true } : i));
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.FEED_ITEMS, JSON.stringify(items));
    }
    return rec;
  }

  // --- Subscription & Credits ---
  public static getSubscription(): UserSubscription {
    if (!this.isBrowser()) return INITIAL_SUBSCRIPTION;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(INITIAL_SUBSCRIPTION));
        return INITIAL_SUBSCRIPTION;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_SUBSCRIPTION;
    }
  }

  public static deductCredits(amount: number): UserSubscription {
    const sub = this.getSubscription();
    sub.ai_credits = Math.max(0, sub.ai_credits - amount);
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(sub));
    }
    return sub;
  }

  public static addCredits(amount: number): UserSubscription {
    const sub = this.getSubscription();
    sub.ai_credits += amount;
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(sub));
    }
    return sub;
  }

  // --- Full Backup & Restore ---
  public static exportAllData(): string {
    const payload = {
      records: this.getRecords(),
      reports: this.getReports(),
      feeds: this.getFeeds(),
      feed_items: this.getFeedItems(),
      subscription: this.getSubscription(),
      exported_at: new Date().toISOString(),
      app_version: '1.0.0',
    };
    return JSON.stringify(payload, null, 2);
  }

  public static importData(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.records && Array.isArray(parsed.records) && this.isBrowser()) {
        localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(parsed.records));
      }
      if (parsed.reports && Array.isArray(parsed.reports) && this.isBrowser()) {
        localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(parsed.reports));
      }
      if (parsed.feeds && Array.isArray(parsed.feeds) && this.isBrowser()) {
        localStorage.setItem(STORAGE_KEYS.FEEDS, JSON.stringify(parsed.feeds));
      }
      return true;
    } catch {
      return false;
    }
  }
}
