import { RecordModel, ReportModel, RSSFeed, FeedItem, UserSubscription, DocumentModel, GroupByMode, TimelineGroup } from '../types';
import { AppStorage } from './storage';

export class ApiClient {
  // --- Records ---
  public static async getRecords(params?: {
    q?: string;
    type?: string;
    privacy?: string;
    tag?: string;
  }): Promise<RecordModel[]> {
    try {
      const query = new URLSearchParams();
      if (params?.q && params.q.trim()) query.set('q', params.q.trim());
      if (params?.type && params.type !== 'all') query.set('type', params.type);
      if (params?.privacy && params.privacy !== 'all') query.set('privacy', params.privacy);
      if (params?.tag) query.set('tag', params.tag);

      const url = `/api/records${query.toString() ? `?${query.toString()}` : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data.map(this.normalizeRecord);
      }
      return AppStorage.getRecords();
    } catch (e) {
      console.warn('Fallback to local storage:', e);
      return AppStorage.getRecords();
    }
  }

  public static async createRecord(
    record: Omit<RecordModel, 'id' | 'created_at' | 'updated_at' | 'version'> & { id?: string }
  ): Promise<RecordModel> {
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      const json = await res.json();
      if (json.success) {
        return this.normalizeRecord(json.data);
      }
      return AppStorage.saveRecord(record);
    } catch {
      return AppStorage.saveRecord(record);
    }
  }

  public static async updateRecord(id: string, updates: Partial<RecordModel>): Promise<RecordModel | null> {
    try {
      const res = await fetch(`/api/records/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (json.success) {
        return this.normalizeRecord(json.data);
      }
      return AppStorage.updateRecord(id, updates);
    } catch {
      return AppStorage.updateRecord(id, updates);
    }
  }

  public static async deleteRecord(id: string): Promise<boolean> {
    try {
      await fetch(`/api/records/${id}`, { method: 'DELETE' });
      AppStorage.deleteRecord(id);
      return true;
    } catch {
      AppStorage.deleteRecord(id);
      return true;
    }
  }

  // --- Documents (V2 知识文档：用户可编辑的 Markdown) ---
  public static async getDocuments(params?: { q?: string; tag?: string }): Promise<DocumentModel[]> {
    try {
      const query = new URLSearchParams();
      if (params?.q && params.q.trim()) query.set('q', params.q.trim());
      if (params?.tag) query.set('tag', params.tag);

      const url = `/api/documents${query.toString() ? `?${query.toString()}` : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
      return [];
    } catch (e) {
      console.warn('Failed to fetch documents:', e);
      return [];
    }
  }

  public static async getDocument(id: string): Promise<DocumentModel | null> {
    try {
      const res = await fetch(`/api/documents/${id}`);
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  public static async createDocument(doc: {
    title: string;
    content: string;
    tags?: string[];
    scope_meta?: any;
  }): Promise<DocumentModel | null> {
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      const json = await res.json();
      if (json.success) {
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  public static async updateDocument(id: string, updates: Partial<DocumentModel>): Promise<DocumentModel | null> {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (json.success) {
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  public static async deleteDocument(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      const json = await res.json();
      return Boolean(json.success);
    } catch {
      return false;
    }
  }

  // --- Reports (AI 阶段性报告) ---
  public static async getReports(): Promise<ReportModel[]> {
    try {
      const res = await fetch('/api/reports');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data.map((r: any) => ({
          ...r,
          scope: typeof r.scope === 'string' ? JSON.parse(r.scope) : r.scope,
        }));
      }
      return AppStorage.getReports();
    } catch {
      return AppStorage.getReports();
    }
  }

  public static async saveReport(
    report: Omit<ReportModel, 'id' | 'created_at' | 'updated_at' | 'version'>
  ): Promise<ReportModel> {
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
      const json = await res.json();
      if (json.success) {
        return {
          ...json.data,
          scope: typeof json.data.scope === 'string' ? JSON.parse(json.data.scope) : json.data.scope,
        };
      }
      return AppStorage.saveReport(report);
    } catch {
      return AppStorage.saveReport(report);
    }
  }

  public static async updateReport(id: string, updates: Partial<ReportModel>): Promise<ReportModel | null> {
    try {
      // 可以在本地更新或通过 API 保存
      return null;
    } catch {
      return null;
    }
  }

  public static async deleteReport(id: string): Promise<boolean> {
    try {
      await fetch(`/api/reports?id=${id}`, { method: 'DELETE' });
      AppStorage.deleteReport(id);
      return true;
    } catch {
      AppStorage.deleteReport(id);
      return true;
    }
  }

  // --- RSS Feeds & Items ---
  public static async getFeeds(): Promise<RSSFeed[]> {
    try {
      const res = await fetch('/api/rss/feeds');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
      return AppStorage.getFeeds();
    } catch {
      return AppStorage.getFeeds();
    }
  }

  public static async addFeed(title: string, url: string, category = 'General'): Promise<RSSFeed> {
    try {
      const res = await fetch('/api/rss/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url, category }),
      });
      const json = await res.json();
      if (json.success) {
        return json.data;
      }
      return AppStorage.addFeed(title, url, category);
    } catch {
      return AppStorage.addFeed(title, url, category);
    }
  }

  public static async deleteFeed(id: string): Promise<boolean> {
    try {
      await fetch(`/api/rss/feeds?id=${id}`, { method: 'DELETE' });
      AppStorage.deleteFeed(id);
      return true;
    } catch {
      AppStorage.deleteFeed(id);
      return true;
    }
  }

  public static async getFeedItems(): Promise<FeedItem[]> {
    try {
      const res = await fetch('/api/rss/items');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
      return AppStorage.getFeedItems();
    } catch {
      return AppStorage.getFeedItems();
    }
  }

  public static async saveFeedItemToRecord(item: FeedItem): Promise<RecordModel> {
    try {
      const res = await fetch('/api/rss/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id }),
      });
      const json = await res.json();
      if (json.success) {
        return this.normalizeRecord(json.data);
      }
      return AppStorage.saveFeedItemToRecord(item);
    } catch {
      return AppStorage.saveFeedItemToRecord(item);
    }
  }

  // --- Settings & Credits ---
  public static async getSubscription(): Promise<UserSubscription> {
    try {
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (json.success) {
        return json.data;
      }
      return AppStorage.getSubscription();
    } catch {
      return AppStorage.getSubscription();
    }
  }

  public static async addCredits(amount: number): Promise<UserSubscription> {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add_credits: amount }),
      });
      const json = await res.json();
      if (json.success) {
        return this.getSubscription();
      }
      return AppStorage.addCredits(amount);
    } catch {
      return AppStorage.addCredits(amount);
    }
  }

  // --- V2 辅助算法：时序分组聚合 (完全不经过 AI，只读查看) ---
  public static groupRecordsByTimeline(records: RecordModel[], mode: GroupByMode): TimelineGroup[] {
    if (mode === 'raw') {
      return [{ group_key: 'raw', title: '全部记录 (按创建时间倒序)', records }];
    }

    const groupsMap = new Map<string, { title: string; records: RecordModel[] }>();

    records.forEach((record) => {
      const date = new Date(record.created_at || Date.now());
      let key = '';
      let title = '';

      if (mode === 'day') {
        key = date.toISOString().slice(0, 10);
        title = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
      } else if (mode === 'week') {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
        title = `${date.getFullYear()} 年 第 ${weekNum} 周`;
      } else if (mode === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        title = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
      } else if (mode === 'year') {
        key = `${date.getFullYear()}`;
        title = `${date.getFullYear()} 年`;
      }

      if (!groupsMap.has(key)) {
        groupsMap.set(key, { title, records: [] });
      }
      groupsMap.get(key)!.records.push(record);
    });

    const result: TimelineGroup[] = [];
    Array.from(groupsMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .forEach(([key, val]) => {
        result.push({
          group_key: key,
          title: val.title,
          records: val.records,
        });
      });

    return result;
  }

  // --- V2 辅助算法：由 Record 范围直接生成 Markdown 文档源码 (不经过 AI) ---
  public static generateMarkdownFromRecords(records: RecordModel[], docTitle?: string): string {
    const now = new Date();
    const title = docTitle || `记录整理文档 (${now.toLocaleDateString()})`;
    let md = `# ${title}\n\n`;
    md += `> 本文档由 iSnips 筛选的 ${records.length} 条原始记录直接生成。可在此自由编辑整理。\n\n---\n\n`;

    const groups = this.groupRecordsByTimeline(records, 'day');
    groups.forEach((group) => {
      md += `## 📅 ${group.title}\n\n`;
      group.records.forEach((r) => {
        const timeStr = new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const typeLabel = r.type === 'note' ? '闪记' : r.type === 'clip' ? '片段' : r.type === 'clipboard' ? '剪贴板' : '记录';
        md += `### [${typeLabel}] ${r.title} \`(${timeStr})\`\n\n`;
        if (r.content) {
          md += `${r.content}\n\n`;
        }
        if (r.source_url) {
          md += `*来源: [${r.source_title || r.source_url}](${r.source_url})*\n\n`;
        }
        if (r.tags && r.tags.length > 0) {
          md += `*标签: ${r.tags.map((t) => `#${t}`).join(' ')}*\n\n`;
        }
        md += `---\n\n`;
      });
    });

    return md;
  }

  private static normalizeRecord(r: any): RecordModel {
    return {
      id: r.id,
      user_id: r.user_id,
      type: r.type,
      title: r.title,
      content: r.content,
      source_url: r.source_url || undefined,
      source_title: r.source_title || undefined,
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags || [],
      privacy: Boolean(r.privacy),
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata || {},
      created_at: r.created_at,
      updated_at: r.updated_at,
      version: r.version || 1,
    };
  }
}
