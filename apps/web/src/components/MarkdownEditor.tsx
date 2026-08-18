'use client';

import React, { useState, useRef } from 'react';
import { Download, Save, Eye, Edit3, Columns } from 'lucide-react';

interface MarkdownEditorProps {
  initialValue: string;
  title: string;
  onTitleChange?: (title: string) => void;
  onChange?: (value: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
  metaInfo?: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  initialValue,
  title,
  onTitleChange,
  onChange,
  onSave,
  readOnly = false,
  metaInfo,
}) => {
  const [content, setContent] = useState(initialValue);
  const [viewMode, setViewMode] = useState<'write' | 'split' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleContentChange = (newVal: string) => {
    setContent(newVal);
    onChange?.(newVal);
  };

  const insertFormat = (prefix: string, suffix = '') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    const replacement = `${prefix}${selected}${suffix}`;
    const newText = text.substring(0, start) + replacement + text.substring(end);

    handleContentChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);
  };

  // 纯前端 Markdown 渲染器 (符合 Apple Notes / Bear 简洁阅读感)
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];

    lines.forEach((line, idx) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code_${idx}`} className="bg-black/5 dark:bg-white/5 p-4 rounded-xl my-3 overflow-x-auto text-sm font-mono leading-relaxed">
              <code>{codeBuffer.join('\n')}</code>
            </pre>
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={idx} className="text-2xl font-bold tracking-tight text-apple-text dark:text-apple-text-dark mt-6 mb-3">
            {line.replace('# ', '')}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={idx} className="text-lg font-semibold tracking-tight text-apple-text dark:text-apple-text-dark mt-5 mb-2.5">
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={idx} className="text-base font-semibold text-apple-text dark:text-apple-text-dark mt-4 mb-2">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={idx} className="border-l-3 border-apple-blue pl-4 py-1.5 bg-black/2 dark:bg-white/2 text-sm text-apple-text-secondary dark:text-apple-text-dark-secondary my-3 rounded-r-lg">
            {line.replace('> ', '')}
          </blockquote>
        );
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={idx} className="text-sm text-apple-text dark:text-apple-text-dark ml-5 list-disc my-1">
            {line.replace(/^[-*]\s+/, '')}
          </li>
        );
      } else if (line.trim() === '---') {
        elements.push(<hr key={idx} className="border-black/6 dark:border-white/8 my-4" />);
      } else if (line.trim() === '') {
        elements.push(<div key={idx} className="h-3" />);
      } else {
        elements.push(
          <p key={idx} className="text-sm leading-relaxed text-apple-text dark:text-apple-text-dark my-1.5">
            {line}
          </p>
        );
      }
    });

    return elements;
  };

  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_') || 'document'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/6 dark:border-white/8 overflow-hidden">
      {/* 顶部控制栏 */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/5 dark:border-white/5 bg-apple-bg dark:bg-[#171717]">
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
          <input
            type="text"
            value={title}
            disabled={readOnly}
            onChange={(e) => onTitleChange?.(e.target.value)}
            placeholder="无标题文档"
            className="text-base font-semibold text-apple-text dark:text-apple-text-dark bg-transparent focus:outline-none w-full truncate"
          />
          {metaInfo && (
            <span className="text-xs text-apple-text-tertiary whitespace-nowrap hidden sm:inline">
              {metaInfo}
            </span>
          )}
        </div>

        {/* 右侧工具栏 */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-black/4 dark:bg-white/6 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('write')}
              className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                viewMode === 'write'
                  ? 'bg-white dark:bg-[#2C2C2E] text-apple-text dark:text-apple-text-dark shadow-xs font-medium'
                  : 'text-apple-text-secondary hover:text-apple-text'
              }`}
            >
              <Edit3 size={12} />
              <span>编辑</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 rounded-md transition-colors hidden md:flex items-center gap-1 ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-[#2C2C2E] text-apple-text dark:text-apple-text-dark shadow-xs font-medium'
                  : 'text-apple-text-secondary hover:text-apple-text'
              }`}
            >
              <Columns size={12} />
              <span>分栏</span>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                viewMode === 'preview'
                  ? 'bg-white dark:bg-[#2C2C2E] text-apple-text dark:text-apple-text-dark shadow-xs font-medium'
                  : 'text-apple-text-secondary hover:text-apple-text'
              }`}
            >
              <Eye size={12} />
              <span>预览</span>
            </button>
          </div>

          <button
            onClick={handleExport}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-apple-text-secondary hover:text-apple-text text-xs flex items-center gap-1"
            title="导出文档"
          >
            <Download size={14} />
            <span className="hidden sm:inline">导出</span>
          </button>

          {onSave && !readOnly && (
            <button
              onClick={onSave}
              className="px-4 py-1.5 rounded-xl bg-apple-blue hover:bg-apple-blue-hover text-white text-xs font-medium shadow-apple-sm btn-press flex items-center gap-1"
            >
              <Save size={13} />
              <span>保存</span>
            </button>
          )}
        </div>
      </div>

      {/* 快捷格式工具栏 */}
      {!readOnly && viewMode !== 'preview' && (
        <div className="flex items-center gap-1.5 px-5 py-2 border-b border-black/4 dark:border-white/4 bg-white dark:bg-[#1C1C1E] text-xs text-apple-text-secondary overflow-x-auto">
          <button
            onClick={() => insertFormat('**', '**')}
            className="px-2.5 py-1 rounded hover:bg-black/4 dark:hover:bg-white/6 font-bold"
            title="加粗"
          >
            B
          </button>
          <button
            onClick={() => insertFormat('*', '*')}
            className="px-2.5 py-1 rounded hover:bg-black/4 dark:hover:bg-white/6 italic font-serif"
            title="斜体"
          >
            I
          </button>
          <div className="w-[1px] h-4 bg-black/8 dark:bg-white/10 mx-1" />
          <button
            onClick={() => insertFormat('# ')}
            className="px-2.5 py-1 rounded hover:bg-black/4 dark:hover:bg-white/6 font-semibold"
            title="一级标题"
          >
            H1
          </button>
          <button
            onClick={() => insertFormat('## ')}
            className="px-2.5 py-1 rounded hover:bg-black/4 dark:hover:bg-white/6 font-medium text-[11px]"
            title="二级标题"
          >
            H2
          </button>
          <div className="w-[1px] h-4 bg-black/8 dark:bg-white/10 mx-1" />
          <button
            onClick={() => insertFormat('- ')}
            className="px-2.5 py-1 rounded hover:bg-black/4 dark:hover:bg-white/6"
            title="无序列表"
          >
            列表
          </button>
          <button
            onClick={() => insertFormat('> ')}
            className="px-2.5 py-1 rounded hover:bg-black/4 dark:hover:bg-white/6"
            title="引用"
          >
            引用
          </button>
          <button
            onClick={() => insertFormat('`', '`')}
            className="px-2.5 py-1 rounded hover:bg-black/4 dark:hover:bg-white/6 font-mono text-[11px]"
            title="行内代码"
          >
            代码
          </button>
        </div>
      )}

      {/* 编辑与阅读区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 编辑视图 */}
        {(viewMode === 'write' || viewMode === 'split') && (
          <div className={`h-full flex-1 p-5 ${viewMode === 'split' ? 'border-r border-black/5 dark:border-white/5' : ''}`}>
            <textarea
              ref={textareaRef}
              value={content}
              disabled={readOnly}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="在此输入 Markdown 内容..."
              className="w-full h-full resize-none bg-transparent text-sm leading-relaxed text-apple-text dark:text-apple-text-dark placeholder-apple-text-tertiary focus:outline-none font-mono"
            />
          </div>
        )}

        {/* 预览视图 */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="h-full flex-1 p-8 overflow-y-auto max-w-3xl">
            {content.trim() ? (
              <div className="space-y-1.5">{renderMarkdown(content)}</div>
            ) : (
              <div className="text-apple-text-tertiary text-sm italic">暂无内容，请在左侧编辑...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
