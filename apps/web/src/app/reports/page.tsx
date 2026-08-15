'use client';

import React, { useState } from 'react';
import { DataScope, ReportModel } from '@/types';
import { ScopeBuilder } from '@/components/ScopeBuilder';
import { ScopeBuilder as ScopeFilter } from '@/lib/scope-builder';

export default function ReportsPage() {
  const [scope, setScope] = useState<DataScope>({
    types: ['bookmark', 'clip', 'note', 'idea'],
    exclude_privacy: true,
  });

  const [prompt, setPrompt] = useState('');
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reports, setReports] = useState<ReportModel[]>([
    {
      id: 'rep_1',
      user_id: 'usr_1',
      title: '2026 年 8 月第 2 周：AI Agent 与个人索引系统思考周报',
      report_type: 'weekly',
      scope: {
        types: ['bookmark', 'idea', 'note'],
        exclude_privacy: true,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      result: `### 核心关注点总结
1. **统一数据模型**：所有剪贴板、高亮、网页摘录全部统一抽象为 \`Record\`。
2. **报告沉淀**：坚持“原始记录无限增长，报告负责降低信息复杂度”的核心原则。
3. **安全边界**：坚决落实隐私数据在客户端加密，AI 仅分析已授权范围。`,
      summary: '本周重点聚焦在三端一体架构与端到端安全隐私设计。',
      ai_credit_cost: 12,
      version: 1,
    },
  ]);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newRep: ReportModel = {
        id: `rep_${Date.now()}`,
        user_id: 'usr_1',
        title: `${reportType === 'weekly' ? '本周' : '阶段'} AI 个人认知报告 (${new Date().toLocaleDateString()})`,
        report_type: reportType,
        scope,
        prompt: prompt || '总结近期的主要思考和关注方向',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        result: `### 📊 自动生成的 AI 阶段性报告
- **数据范围**：${(scope.types || []).join(', ')} (已排除隐私数据)
- **核心发现**：你在前端工程化、架构解耦与大模型端侧应用上投入了最高频的注意力。
- **行动建议**：建议将近期的阶段性成果沉淀为专题文档。`,
        summary: '已成功综合分析所选范围的记录。',
        ai_credit_cost: 8,
        version: 1,
      };

      setReports([newRep, ...reports]);
      setIsGenerating(false);
    }, 1200);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          AI 报告中心 (Intelligence Reports)
        </h1>
        <p className="text-sm text-slate-500">
          把零散的记录持续提炼为阶段性认知、趋势分析与长久沉淀的报告资产。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <h2 className="font-bold text-base">新建分析报告</h2>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                报告周期 / 类型
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="weekly">周报 (最近 7 天)</option>
                <option value="monthly">月报 (最近 30 天)</option>
                <option value="custom">自定义主题报告</option>
              </select>
            </div>

            <ScopeBuilder
              scope={scope}
              onChange={setScope}
              estimatedCredits={ScopeFilter.estimateCredits(20)}
            />

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                分析目标 / 自定义 Prompt (可选)
              </label>
              <textarea
                rows={3}
                placeholder="例如：总结我关于 AI Agent 的核心想法，提炼重复出现的观点..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              {isGenerating ? 'AI 正在分析生成中...' : '生成并保存报告'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-base text-slate-900 dark:text-white">
            已沉淀的历史报告 ({reports.length})
          </h2>

          <div className="space-y-4">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                      {rep.report_type.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(rep.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    消耗 {rep.ai_credit_cost} Credits
                  </span>
                </div>

                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  {rep.title}
                </h3>

                {rep.summary && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <strong>摘要：</strong> {rep.summary}
                  </p>
                )}

                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-sans text-sm text-slate-700 dark:text-slate-300">
                  {rep.result}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
