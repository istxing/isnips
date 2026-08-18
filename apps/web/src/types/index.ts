/**
 * iSnips V2 统一核心数据模型定义
 * 遵循《iSnips UI 设计说明文档》与《iSnips V2 补充产品实施方案》
 */

// 基础记录类型：闪记 (note/idea)、片段 (clip/highlight/bookmark)、剪贴板 (clipboard)、RSS (rss)、报告/文档 (report/document)
export type RecordType = 'note' | 'clip' | 'clipboard' | 'idea' | 'bookmark' | 'highlight' | 'rss' | 'report' | 'document' | 'all';

// 阶段报告类型
export type ReportType = 'daily' | 'weekly' | 'monthly' | 'annual' | 'custom';

// 时间范围预设
export type TimeRangePreset = 'today' | '7days' | '30days' | '90days' | 'year' | 'all' | 'custom';

// 汇总查看时序分组模式 (完全不经过 AI，只读查看)
export type GroupByMode = 'raw' | 'day' | 'week' | 'month' | 'year';

export interface UserSubscription {
  plan: 'free' | 'plus' | 'pro';
  ai_credits: number;
  max_credits: number;
  expires_at?: string;
  master_key_set: boolean;
}

export interface UserModel {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  plan: 'free' | 'plus' | 'pro';
  ai_credits: number;
  max_credits: number;
  master_key_set: boolean;
  has_password?: boolean;
  has_passkey?: boolean;
  created_at: string;
}

export interface PasskeyDevice {
  credential_id: string;
  device_name?: string;
  created_at: string;
}

/**
 * 原始 Record 数据模型 (底层数据，不可被汇总或报告修改)
 */
export interface RecordModel {
  id: string;
  user_id?: string;
  type: RecordType;
  title: string;
  content: string;
  source_url?: string;
  source_title?: string;
  source_type?: string;
  tags?: string[];
  privacy: boolean; // 是否启用端到端加密 E2EE (🔒 隐私)
  metadata?: Record<string, any>;
  version: number;
  created_at: string;
  updated_at: string;
}

/**
 * 数据范围 Scope (所有 AI 分析与文档生成的统一入口)
 */
export interface DataScope {
  preset?: TimeRangePreset;
  time_range?: {
    start?: string;
    end?: string;
  };
  start_time?: string;
  end_time?: string;
  types?: RecordType[];
  tags?: string[];
  topics?: string[];
  keywords?: string[];
  exclude_privacy?: boolean; // 默认 true，不将隐私记录送入公网大模型
}

/**
 * Document 知识文档模型 (用户可编辑的 Markdown 文档，由选定 Record 批量生成或手动新建)
 */
export interface DocumentModel {
  id: string;
  user_id: string;
  title: string;
  content: string; // Markdown 源码
  tags?: string[];
  scope_meta?: {
    generated_from_scope?: boolean;
    record_count?: number;
    time_range_desc?: string;
    type?: string;
  };
  version: number;
  created_at: string;
  updated_at: string;
}

/**
 * AI 报告模型 (AI 阶段性产物，顶部必带 Data Scope 永久回溯，生成后允许用户微调正文)
 */
export interface ReportModel {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  report_type: ReportType;
  scope: DataScope;
  prompt?: string;
  model: string;
  result: string; // Markdown 正文
  summary?: string; // 核心提炼
  token_usage?: number;
  ai_credit_cost: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface RSSFeed {
  id: string;
  title: string;
  url: string;
  site_url?: string;
  description?: string;
  category?: string;
  unread_count: number;
  updated_at: string;
}

export interface FeedItem {
  id: string;
  feed_id: string;
  feed_title: string;
  title: string;
  link: string;
  snippet: string;
  content?: string;
  published_at: string;
  ai_summary?: string;
  ai_score?: number;
  is_saved: boolean;
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  type: 'trend' | 'idea' | 'rss' | 'report';
  action_text?: string;
  action_href?: string;
  timestamp: string;
}

/**
 * 时序聚合分组
 */
export interface TimelineGroup {
  group_key: string;
  title: string;
  records: RecordModel[];
}
