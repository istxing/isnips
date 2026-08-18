'use client';

import React from 'react';
import { RecordModel } from '../types';
import { Lock, Copy, Check, Edit3, Trash2, ExternalLink } from 'lucide-react';

interface RecordCardProps {
  record: RecordModel;
  onEdit?: (record: RecordModel) => void;
  onDelete?: (id: string) => void;
}

export const RecordCard: React.FC<RecordCardProps> = ({
  record,
  onEdit,
  onDelete,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(record.content || record.title);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'note':
        return '闪记';
      case 'clip':
        return '片段';
      case 'clipboard':
        return '剪贴板';
      case 'rss':
        return 'RSS';
      default:
        return '记录';
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="py-4 border-b border-black/8 dark:border-white/10 transition-colors group space-y-1.5">
      {/* 头部：标题与状态 (无卡片，纯线条排版) */}
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-semibold text-lg text-apple-text dark:text-apple-text-dark leading-snug tracking-tight">
          {record.title}
        </h3>

        <div className="flex items-center gap-2.5 shrink-0 text-xs text-apple-text-tertiary">
          {record.privacy && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
              <Lock size={11} />
              <span>隐私</span>
            </span>
          )}
          <span className="font-medium text-apple-text-secondary dark:text-apple-text-dark-secondary">
            {getTypeLabel(record.type)}
          </span>
          <span>·</span>
          <span>{formatTime(record.created_at)}</span>
        </div>
      </div>

      {/* 正文内容：大字阶舒适行高 */}
      <p className="text-apple-text-secondary dark:text-apple-text-dark-secondary text-[15px] leading-relaxed whitespace-pre-wrap line-clamp-3">
        {record.content}
      </p>

      {/* 来源链接与底部操作 */}
      <div className="flex items-center justify-between pt-1 text-xs text-apple-text-tertiary">
        {record.source_url ? (
          <a
            href={record.source_url}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] text-apple-blue hover:underline inline-flex items-center gap-1 max-w-[70%] truncate font-normal"
          >
            <span>{record.source_title || record.source_url}</span>
            <ExternalLink size={11} className="shrink-0" />
          </a>
        ) : (
          <div />
        )}

        {/* 悬浮操作按钮 */}
        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="text-xs text-apple-text-secondary hover:text-apple-text flex items-center gap-1 transition-colors"
            title="复制"
          >
            {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            <span>{copied ? '已复制' : '复制'}</span>
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(record)}
              className="text-xs text-apple-text-secondary hover:text-apple-text flex items-center gap-1 transition-colors"
              title="编辑"
            >
              <Edit3 size={13} />
              <span>编辑</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(record.id)}
              className="text-xs text-apple-text-secondary hover:text-rose-600 flex items-center gap-1 transition-colors"
              title="删除"
            >
              <Trash2 size={13} />
              <span>删除</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
