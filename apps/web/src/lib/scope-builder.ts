import { DataScope, RecordModel } from '../types';

export class ScopeFilterEngine {
  /**
   * 根据 DataScope 对传入的 records 列表进行过滤
   */
  public static filterRecords(records: RecordModel[], scope: DataScope): RecordModel[] {
    let result = [...records];

    // 1. 隐私过滤
    if (scope.exclude_privacy) {
      result = result.filter((r) => !r.privacy);
    }

    // 2. 类型过滤
    if (scope.types && scope.types.length > 0) {
      result = result.filter((r) => scope.types!.includes(r.type));
    }

    // 3. 时间范围过滤
    const now = Date.now();
    if (scope.preset) {
      if (scope.preset === 'today') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        result = result.filter((r) => new Date(r.created_at).getTime() >= startOfDay.getTime());
      } else if (scope.preset === '7days') {
        const past7Days = now - 7 * 24 * 3600 * 1000;
        result = result.filter((r) => new Date(r.created_at).getTime() >= past7Days);
      } else if (scope.preset === '30days') {
        const past30Days = now - 30 * 24 * 3600 * 1000;
        result = result.filter((r) => new Date(r.created_at).getTime() >= past30Days);
      } else if (scope.preset === 'year') {
        const pastYear = now - 365 * 24 * 3600 * 1000;
        result = result.filter((r) => new Date(r.created_at).getTime() >= pastYear);
      }
    } else if (scope.time_range) {
      if (scope.time_range.start) {
        const startTime = new Date(scope.time_range.start).getTime();
        result = result.filter((r) => new Date(r.created_at).getTime() >= startTime);
      }
      if (scope.time_range.end) {
        const endTime = new Date(scope.time_range.end).getTime();
        result = result.filter((r) => new Date(r.created_at).getTime() <= endTime);
      }
    }

    // 4. 关键词与标签过滤
    if (scope.keywords && scope.keywords.length > 0) {
      const q = scope.keywords.join(' ').toLowerCase();
      result = result.filter((r) =>
        r.title.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        (r.tags && r.tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    }

    return result;
  }

  /**
   * 预估生成报告需要消耗的 AI Credits 算力点
   * 基础单次分析 5 点 + 每 10 条记录 1 点
   */
  public static estimateCredits(recordCount: number, isComprehensive = false): number {
    if (recordCount === 0) return 0;
    const base = isComprehensive ? 10 : 5;
    const variable = Math.ceil(recordCount / 8);
    return Math.max(base, base + variable);
  }
}
