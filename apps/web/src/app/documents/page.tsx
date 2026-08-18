'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DocumentModel } from '../../types';
import { ApiClient } from '../../lib/api-client';
import { MarkdownEditor } from '../../components/MarkdownEditor';
import { Search, Plus, FileText, Trash2 } from 'lucide-react';

function DocumentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams?.get('id');

  const [documents, setDocuments] = useState<DocumentModel[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentModel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 编辑器状态
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await ApiClient.getDocuments({ q: searchQuery });
      setDocuments(docs);

      if (docs.length > 0) {
        const found = targetId ? docs.find((d) => d.id === targetId) : docs[0];
        const active = found || docs[0];
        setSelectedDoc(active);
        setEditTitle(active.title);
        setEditContent(active.content);
      } else {
        setSelectedDoc(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [searchQuery]);

  const handleSelectDoc = (doc: DocumentModel) => {
    setSelectedDoc(doc);
    setEditTitle(doc.title);
    setEditContent(doc.content);
  };

  const handleCreateNew = async () => {
    const newTitle = `未命名文档 ${new Date().toLocaleDateString()}`;
    const initialMd = `# ${newTitle}\n\n开始撰写你的内容...`;
    const created = await ApiClient.createDocument({
      title: newTitle,
      content: initialMd,
      tags: ['知识文档'],
    });

    if (created) {
      await loadDocuments();
      setSelectedDoc(created);
      setEditTitle(created.title);
      setEditContent(created.content);
    }
  };

  const handleSaveDoc = async () => {
    if (!selectedDoc) return;
    setIsSaving(true);
    try {
      const updated = await ApiClient.updateDocument(selectedDoc.id, {
        title: editTitle,
        content: editContent,
      });
      if (updated) {
        setSelectedDoc(updated);
        setDocuments((prev) =>
          prev.map((d) => (d.id === updated.id ? updated : d))
        );
      }
    } catch (e) {
      console.error(e);
      alert('保存文档失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这篇文档吗？')) return;

    await ApiClient.deleteDocument(id);
    await loadDocuments();
  };

  return (
    <div className="h-[calc(100vh-6.5rem)] w-full flex flex-col space-y-3">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between pb-3 border-b border-black/[0.05] dark:border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-apple-text dark:text-apple-text-dark">
            知识沉淀文档
          </span>
          <span className="text-xs text-apple-text-tertiary">· {documents.length} 篇文档</span>
        </div>

        <button
          onClick={handleCreateNew}
          className="px-3.5 py-1.5 rounded-xl bg-apple-blue hover:bg-apple-blue-hover text-white text-xs font-medium shadow-2xs transition-all flex items-center gap-1.5 btn-press"
        >
          <Plus size={14} />
          <span>新建文档</span>
        </button>
      </div>

      {/* 主体纯线条分栏 */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* 左侧文档导航列表 (纯线条流) */}
        <div className="w-64 sm:w-72 flex flex-col shrink-0 border-r border-black/[0.05] dark:border-white/[0.06] pr-4">
          {/* 搜索框 */}
          <div className="pb-2.5">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索文档..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-black/8 dark:border-white/10 bg-transparent text-xs text-apple-text dark:text-apple-text-dark placeholder-apple-text-tertiary focus:outline-none"
              />
              <Search size={13} className="absolute left-2.5 top-2.5 text-apple-text-tertiary" />
            </div>
          </div>

          {/* 文档列表项 (纯线条分割) */}
          <div className="flex-1 overflow-y-auto space-y-0.5">
            {loading ? (
              <div className="py-14 text-center text-xs text-apple-text-tertiary">
                加载中...
              </div>
            ) : documents.length === 0 ? (
              <div className="py-14 text-center text-xs text-apple-text-tertiary px-4 leading-relaxed">
                暂无文档，点击右上角新建
              </div>
            ) : (
              documents.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc)}
                    className={`py-3 px-2 cursor-pointer transition-colors group flex flex-col justify-between gap-1.5 text-xs border-b border-black/[0.04] rounded-lg ${
                      isSelected
                        ? 'bg-black/5 dark:bg-white/10 text-apple-text font-semibold'
                        : 'hover:bg-black/[0.02] text-apple-text-secondary'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate flex-1 font-medium text-sm text-apple-text dark:text-apple-text-dark">{doc.title}</span>
                      <button
                        onClick={(e) => handleDeleteDoc(doc.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-apple-text-tertiary hover:text-rose-500 text-xs p-0.5 rounded transition-opacity"
                        title="删除文档"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs text-apple-text-tertiary">
                      <span>{new Date(doc.updated_at).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}</span>
                      {doc.scope_meta?.generated_from_scope && (
                        <span className="text-[11px] text-apple-text-tertiary">
                          {doc.scope_meta.record_count || 0} 条记录转化
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 右侧主编辑器与阅读视图 */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {selectedDoc ? (
            <MarkdownEditor
              key={selectedDoc.id}
              initialValue={selectedDoc.content}
              title={editTitle}
              onTitleChange={setEditTitle}
              onChange={setEditContent}
              onSave={handleSaveDoc}
              metaInfo={
                selectedDoc.scope_meta?.generated_from_scope
                  ? `由 ${selectedDoc.scope_meta.record_count || 0} 条记录转化`
                  : undefined
              }
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-apple-text-tertiary space-y-3">
              <FileText size={28} className="text-apple-text-tertiary opacity-40" />
              <p className="text-sm">选择左侧文档或新建一篇文档进行写作与整理</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-apple-text-tertiary">加载中...</div>}>
      <DocumentsContent />
    </Suspense>
  );
}
