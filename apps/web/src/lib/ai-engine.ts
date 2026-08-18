import { DataScope, RecordModel, ReportModel, ReportType } from '../types';

export interface GenerationProgress {
  step: number;
  totalSteps: number;
  message: string;
}

export class AIReportEngine {
  /**
   * 模拟多步骤 AI 报告分析引擎
   */
  public static async generateReport(
    records: RecordModel[],
    scope: DataScope,
    reportType: ReportType,
    customPrompt?: string,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<Omit<ReportModel, 'id' | 'created_at' | 'updated_at' | 'version'>> {
    // 步骤 1: 范围锁定与隐私脱敏
    onProgress?.({ step: 1, totalSteps: 4, message: `正在检索并校验范围内的 ${records.length} 条有效记录...` });
    await new Promise((r) => setTimeout(r, 400));

    // 步骤 2: 提取高频标签与主题
    onProgress?.({ step: 2, totalSteps: 4, message: '正在进行多源数据聚合、去重与主题聚类...' });
    await new Promise((r) => setTimeout(r, 500));

    // 提取所有标签
    const allTags = records.flatMap((r) => r.tags || []);
    const tagCounts: { [k: string]: number } = {};
    allTags.forEach((t) => (tagCounts[t] = (tagCounts[t] || 0) + 1));
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);

    // 步骤 3: 观点提炼与趋势分析
    onProgress?.({ step: 3, totalSteps: 4, message: 'AI 核心模型深度提炼核心观点与未决问题...' });
    await new Promise((r) => setTimeout(r, 500));

    // 步骤 4: 报告结构化合成
    onProgress?.({ step: 4, totalSteps: 4, message: '生成 Markdown 格式结构化认知报告...' });
    await new Promise((r) => setTimeout(r, 400));

    const dateStr = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const typeTitleMap: Record<ReportType, string> = {
      daily: '今日个人信息复盘与要闻摘要',
      weekly: '阶段性知识索引与注意力分析周报',
      monthly: '月度个人认知演进与核心趋势报告',
      annual: '年度认知全景与重点沉淀报告',
      custom: '专题研究与深度提炼报告',
    };

    const title = `${dateStr}：${typeTitleMap[reportType] || 'AI 个人认知分析报告'}`;

    const creditCost = Math.max(8, Math.ceil(records.length * 1.5) + 5);

    const markdownResult = `## 📑 ${title}

> **分析范围说明**：
> - **纳入记录数**：共 ${records.length} 条记录（类型涵盖：${(scope.types || ['全部']).join(', ')}）
> - **隐私状态**：${scope.exclude_privacy ? '✅ 已严格排除客户端端到端加密隐私记录' : '⚠️ 包含普通记录'}
> - **核心高频主题**：${topTags.length > 0 ? topTags.map((t) => `\`#${t}\``).join(' ') : '综合记录'}
${customPrompt ? `> - **用户分析要求**：“${customPrompt}”` : ''}

---

### 一、 核心注意力与研究趋势
通过对本阶段收集的 **${records.length} 条记录** 进行全量语义聚类，发现你的主要注意力聚焦在以下几个方向：
${topTags.map((tag, idx) => `${idx + 1}. **${tag} 领域**：共记录 ${tagCounts[tag]} 条相关内容，呈现持续升温与深度探索趋势。`).join('\n') || '- 暂无明显集中标签，内容涵盖多元信息碎片。'}

### 二、 关键事实与深度洞察提取
${records.slice(0, 4).map((r, i) => `#### ${i + 1}. ${r.title}
- **类型**：\`${r.type.toUpperCase()}\` ${r.source_title ? `| 来源：*${r.source_title}*` : ''}
- **核心提炼**：${r.content.substring(0, 120)}${r.content.length > 120 ? '...' : ''}`).join('\n\n')}

### 三、 发现的模式、重复观点与未决问题
1. **认知沉淀模式**：你正在将零散的想法（Idea）与网页高亮（Highlight）逐步串联为系统化的思考。
2. **行动项与后续建议**：
   - 建议针对 **${topTags[0] || '核心技术'}** 方向整理专题 Wiki 或进行下一阶段实践。
   - 对长期未推进的想法及时复盘归档。

---
*Generated autonomously by iSnips AI Intelligence Engine.*`;

    return {
      user_id: 'usr_default',
      title,
      description: `基于 ${records.length} 条记录生成的 ${reportType} 阶段性认知报告`,
      report_type: reportType,
      scope,
      prompt: customPrompt,
      model: 'Gemini 1.5 Pro (iSnips Cloud)',
      result: markdownResult,
      summary: `成功提炼 ${records.length} 条记录中的核心趋势与观点，发现你在 ${topTags.join('、') || '多个领域'} 具有持续关注。`,
      ai_credit_cost: creditCost,
    };
  }
}
