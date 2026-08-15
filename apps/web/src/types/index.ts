/**
 * iSnips Core Types (Web 自包含统一数据模型)
 */

export type RecordType =
  | 'clip'
  | 'bookmark'
  | 'highlight'
  | 'note'
  | 'idea'
  | 'rss'
  | 'document'
  | 'report'
  | 'image'
  | 'conversation'
  | 'task';

export type ReportType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface TimeRange {
  start?: string;
  end?: string;
  relative?: 'today' | '7d' | '30d' | '90d' | 'year' | 'all';
}

export interface DataScope {
  time_range?: TimeRange;
  types?: RecordType[];
  topics?: string[];
  tags?: string[];
  keywords?: string[];
  exclude_privacy: boolean;
  is_dynamic?: boolean;
}

export interface RecordModel {
  id: string;
  user_id: string;
  type: RecordType;
  title: string;
  content: string;
  source_url?: string;
  source_type?: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  privacy: boolean;
  metadata: Record<string, any>;
  version: number;
  deleted_at?: string | null;
}

export interface ReportModel {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  report_type: ReportType;
  scope: DataScope;
  prompt?: string;
  model?: string;
  created_at: string;
  updated_at: string;
  result: string;
  summary?: string;
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  ai_credit_cost: number;
  version: number;
}
