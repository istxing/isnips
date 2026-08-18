'use client';

import React, { useState } from 'react';
import { ReportModel } from '../types';
import { ApiClient } from '../lib/api-client';

interface ReportViewModalProps {
  report: ReportModel | null;
  isOpen: boolean;
  onClose: () => void;
  onSavedAsRecord?: () => void;
}

export const ReportViewModal: React.FC<ReportViewModalProps> = ({
  report,
  isOpen,
  onClose,
  onSavedAsRecord,
}) => {
  const [copied, setCopied] = useState(false);
  const [savedAsRecord, setSavedAsRecord] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !report) return null;

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(report.result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([report.result], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.title.replace(/[\/\\:?*"><|]/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToRecord = async () => {
    setIsSaving(true);
    try {
      await ApiClient.createRecord({
        user_id: report.user_id,
        type: 'report',
        title: `[报告] ${report.title}`,
        content: report.result,
        tags: ['Report', report.report_type, ...(report.scope.topics || [])],
        privacy: false,
        source_type: 'iSnips AI Report Engine',
      });
      setSavedAsRecord(true);
      onSavedAsRecord?.();
      setTimeout(() => setSavedAsRecord(false), 3000);
    } catch (e) {
      console.error(e);
      alert('沉淀报告失败');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-[#2f2f2f] text-xs">
        {/* 头部 */}
        <div className="p-5 border-b border-slate-200 dark:border-[#2a2a2a] flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-0.5">
              <span className="font-mono uppercase font-semibold text-slate-600 dark:text-slate-300">
                {report.report_type} REPORT
              </span>
              <span>• {new Date(report.created_at).toLocaleDateString()}</span>
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
              {report.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-base font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* 报告正文 */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 font-sans text-slate-700 dark:text-[#ccc] leading-relaxed whitespace-pre-wrap">
          {report.summary && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#212121] border border-slate-200 dark:border-[#333] text-[11px] font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
              <strong>概要：</strong> {report.summary}
            </div>
          )}

          <div>{report.result}</div>
        </div>

        {/* 底部操作 */}
        <div className="p-3.5 bg-slate-50 dark:bg-[#151515] border-t border-slate-200 dark:border-[#2a2a2a] rounded-b-2xl flex items-center justify-between">
          <button
            onClick={handleSaveToRecord}
            disabled={savedAsRecord || isSaving}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#333] hover:bg-white dark:hover:bg-[#212121] text-slate-700 dark:text-slate-300 font-semibold"
          >
            {savedAsRecord ? '✓ 已沉淀入 Index' : isSaving ? '沉淀中...' : '📥 沉淀为 Record'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              {copied ? '✓ 已复制' : '复制 Markdown'}
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold hover:opacity-90"
            >
              导出 .md
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
