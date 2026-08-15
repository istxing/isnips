import React from 'react';
import { RecordModel } from '@/types';

export interface RecordCardProps {
  record: RecordModel;
  onEdit?: (record: RecordModel) => void;
  onDelete?: (id: string) => void;
}

export const RecordCard: React.FC<RecordCardProps> = ({ record, onEdit, onDelete }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow transition-shadow space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {record.type.toUpperCase()}
          </span>
          {record.privacy && (
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 flex items-center gap-1">
              🔒 隐私加密
            </span>
          )}
          <span className="text-xs text-slate-400">
            {new Date(record.created_at).toLocaleDateString()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(record)}
              className="text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400"
            >
              编辑
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(record.id)}
              className="text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400"
            >
              删除
            </button>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
          {record.title}
        </h4>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-3">
          {record.content}
        </p>
      </div>

      {record.tags && record.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {record.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {record.source_url && (
        <div className="text-xs text-slate-400 truncate pt-1">
          来源: <a href={record.source_url} target="_blank" rel="noreferrer" className="hover:underline text-blue-500">{record.source_url}</a>
        </div>
      )}
    </div>
  );
};
