import { DataScope, RecordModel } from '../types';

export class ScopeBuilder {
  static filterRecords(records: RecordModel[], scope: DataScope): RecordModel[] {
    return records.filter((rec) => {
      if (scope.exclude_privacy && rec.privacy) {
        return false;
      }

      if (scope.types && scope.types.length > 0) {
        if (!scope.types.includes(rec.type)) {
          return false;
        }
      }

      if (scope.tags && scope.tags.length > 0) {
        const hasTag = scope.tags.some((t) => rec.tags.includes(t));
        if (!hasTag) return false;
      }

      if (scope.time_range) {
        const recTime = new Date(rec.created_at).getTime();
        if (scope.time_range.start) {
          const startTime = new Date(scope.time_range.start).getTime();
          if (recTime < startTime) return false;
        }
        if (scope.time_range.end) {
          const endTime = new Date(scope.time_range.end).getTime();
          if (recTime > endTime) return false;
        }
      }

      if (scope.keywords && scope.keywords.length > 0) {
        const matchesKeyword = scope.keywords.some((kw) => {
          const lowerKw = kw.toLowerCase();
          return (
            rec.title.toLowerCase().includes(lowerKw) ||
            rec.content.toLowerCase().includes(lowerKw)
          );
        });
        if (!matchesKeyword) return false;
      }

      return true;
    });
  }

  static estimateCredits(recordCount: number, avgCharsPerRecord: number = 200): number {
    const totalChars = recordCount * avgCharsPerRecord;
    const baseCredits = Math.ceil(totalChars / 1000);
    return Math.max(1, baseCredits * 2);
  }
}
