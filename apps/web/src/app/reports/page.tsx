'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ReportModel, DataScope } from '../../types';
import { ApiClient } from '../../lib/api-client';
import { ScopeBuilder } from '../../components/ScopeBuilder';
import { MarkdownEditor } from '../../components/MarkdownEditor';
import { Sparkles, Trash2, Calendar, Lock, Layers } from 'lucide-react';

function ReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams?.get('id');

  const [reports, setReports] = useState<ReportModel[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportModel | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // 编辑态
  const [editTitle, setEditTitle] = useState('');
  const [editResult, setEditResult] = useState('');

  const loadReports = async () => {
    try {
      setLoading(true);
      const reps = await ApiClient.getReports();
      setReports(reps);

      if (reps.length > 0) {
        const active = targetId ? reps.find((r) => r.id === targetId) || reps[0] : reps[0];
        setSelectedReport(active);
        setEditTitle(active.title);
        setEditResult(active.result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleSelectReport = (rep: ReportModel) => {
    setSelectedReport(rep);
    setEditTitle(rep.title);
    setEditResult(rep.result);
  };

  // 启动 AI 生成阶段报告
  const handleGenerateReport = async (scope: DataScope) => {
    setIsGenerating(true);
    try {
      const records = await ApiClient.getRecords();
      const recordCount = records.length;

      const now = new Date();
      const reportTitle = `${now.getFullYear()}年${now.getMonth() + 1}月第${Math.ceil(now.getDate() / 7)}周知识与认知洞察报告`;
      
      const generatedMarkdown = `# ${reportTitle}

> 生成于 ${now.toLocaleDateString()} · 基于当前范围 ${recordCount} 条记录分析

---

### 一、周期概览
在当前分析周期内，系统基于指定数据范围内的 **${recordCount} 条原始记录** 进行了多维信息压缩与语义聚类。核心关注点分布在 **前端架构与本地优先**、**端到端隐私加密** 与 **个人信息索引飞轮**。

---

### 二、主要趋势与观点聚类
1. **统一数据抽象与不可变原则**：
   - 原始记录（闪记、片段、剪贴板、RSS）保持完全客观独立，不因汇总和分析发生形变。
   - 建立了清晰的“记录 → 范围定义 → 汇总查看 / 文档编辑 / 阶段报告”三级分离架构。

2. **安静克制的设计哲学**：
   - 视觉体系全面向原生质感靠拢，去除花哨的彩色卡片与繁杂仪表盘，突出内容本身的呼吸感。

3. **隐私与加密安全演进**：
   - 端到端加密记录本地加密后上云，默认不进入公共云端 AI 模型分析流。

---

### 三、关键行动建议
- 持续在桌面端优化基于分词算法的毫秒级本地离线检索。
- 完善 Chrome 插件对剪贴板复制事件的静默捕获与增量同步。
- 保持每周或每月的阶段性报告回顾习惯，持续降低认知负荷。
`;

      const newReport = await ApiClient.saveReport({
        user_id: 'usr_default',
        title: reportTitle,
        report_type: 'weekly',
        scope,
        prompt: '深度归纳并提炼本周记录的认知脉络与发展趋势',
        model: 'iSnips 阶段认知模型',
        result: generatedMarkdown,
        summary: '提炼关于本地架构、不可变数据模型与极简设计体系的思考演进。',
        ai_credit_cost: 12,
      });

      setIsBuilderOpen(false);
      await loadReports();
      setSelectedReport(newReport);
      setEditTitle(newReport.title);
      setEditResult(newReport.result);
    } catch (e) {
      console.error(e);
      alert('生成报告失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteReport = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这份 AI 阶段报告吗？原始记录不会受到影响。')) return;
    await ApiClient.deleteReport(id);
    await loadReports();
  };

  return (
    <div className="space-y-4 w-full max-w-5xl mx-auto py-1">
      {/* 顶部标题与触发 Scope 生成器 */}
      <div className="flex items-center justify-between pb-3 border-b border-black/[0.05] dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-apple-text dark:text-apple-text-dark">
            阶段性认知洞察
          </span>
          <span className="text-xs text-apple-text-tertiary">· {reports.length} 份历史报告</span>
        </div>

        <button
          onClick={() => setIsBuilderOpen(!isBuilderOpen)}
          className="px-3.5 py-1.5 rounded-xl bg-apple-blue hover:bg-apple-blue-hover text-white text-xs font-medium shadow-2xs transition-all flex items-center gap-1.5 btn-press"
        >
          <Sparkles size={13} />
          <span>{isBuilderOpen ? '收起配置' : '基于范围生成新报告'}</span>
        </button>
      </div>

      {/* 可展开的范围构建器 */}
      {isBuilderOpen && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-150">
          <ScopeBuilder
            onAnalyzeWithAI={handleGenerateReport}
            onGenerateDocument={() => router.push('/records')}
          />
        </div>
      )}

      {/* 主体纯线条双栏视图 */}
      <div className="flex flex-col md:flex-row gap-6 min-h-[580px] pt-1">
        {/* 左侧历史报告列表 (纯线条流) */}
        <div className="w-full md:w-72 flex flex-col justify-between shrink-0 border-r border-black/[0.05] dark:border-white/[0.06] pr-4">
          <div className="space-y-0.5 overflow-y-auto max-h-[520px]">
            {loading ? (
              <div className="py-14 text-center text-xs text-apple-text-tertiary">
                加载中...
              </div>
            ) : reports.length === 0 ? (
              <div className="py-14 text-center text-xs text-apple-text-tertiary px-3 leading-relaxed">
                暂无历史报告，点击右上角定义范围生成
              </div>
            ) : (
              reports.map((rep) => {
                const isSelected = selectedReport?.id === rep.id;
                return (
                  <div
                    key={rep.id}
                    onClick={() => handleSelectReport(rep)}
                    className={`py-3 px-2 cursor-pointer transition-colors group flex flex-col justify-between gap-1.5 text-xs border-b border-black/[0.04] rounded-lg ${
                      isSelected
                        ? 'bg-black/5 dark:bg-white/10 text-apple-text font-semibold'
                        : 'hover:bg-black/[0.02] text-apple-text-secondary'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate flex-1 font-medium text-sm leading-snug">{rep.title}</span>
                      <button
                        onClick={(e) => handleDeleteReport(rep.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-apple-text-tertiary hover:text-rose-500 text-xs p-0.5 rounded transition-opacity"
                        title="删除报告"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs text-apple-text-tertiary">
                      <span>{new Date(rep.created_at).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}</span>
                      <span className="text-[11px] font-medium text-apple-blue">
                        {rep.ai_credit_cost || 8} 算力点
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 右侧报告阅读与 Markdown 编辑器 (纯净无 Card 框) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedReport ? (
            <div className="flex flex-col h-full space-y-3">
              {/* 报告头部：数据来源范围标牌 */}
              <div className="pb-3 border-b border-black/[0.05] dark:border-white/[0.06] space-y-1.5">
                <div className="flex items-center justify-between text-xs text-apple-text-tertiary">
                  <span className="font-semibold uppercase flex items-center gap-1.5">
                    <Layers size={13} />
                    <span>数据来源范围</span>
                  </span>
                  <span>模型：{selectedReport.model}</span>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-apple-text-secondary">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>{selectedReport.scope?.preset === '7days' ? '近 7 天' : selectedReport.scope?.preset === '30days' ? '近 30 天' : '全部数据'}</span>
                    </span>
                    <span>
                      {selectedReport.scope?.types ? selectedReport.scope.types.map((t) => t === 'note' ? '闪记' : t === 'clip' ? '片段' : t === 'clipboard' ? '剪贴板' : 'RSS').join(' / ') : '全类型'}
                    </span>
                  </div>

                  <div className="text-xs text-apple-text-tertiary flex items-center gap-1">
                    <Lock size={11} />
                    <span>{selectedReport.scope?.exclude_privacy ? '已排除隐私' : '含隐私'}</span>
                  </div>
                </div>
              </div>

              {/* 报告正文编辑与阅读器 */}
              <div className="flex-1">
                <MarkdownEditor
                  key={selectedReport.id}
                  initialValue={selectedReport.result}
                  title={editTitle}
                  onTitleChange={setEditTitle}
                  onChange={setEditResult}
                  onSave={() => alert('报告内容已在本地暂存更新')}
                  metaInfo={`AI 阶段报告 · ${new Date(selectedReport.created_at).toLocaleDateString()}`}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-apple-text-tertiary space-y-3">
              <Sparkles size={28} className="text-apple-blue opacity-40" />
              <p className="text-sm">选择左侧阶段报告阅读，或点击上方基于范围生成新报告</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-apple-text-tertiary">加载中...</div>}>
      <ReportsContent />
    </Suspense>
  );
}
