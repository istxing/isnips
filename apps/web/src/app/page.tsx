'use client';

import React, { useState, useEffect } from 'react';
import { RecordModel } from '../types';
import { ApiClient } from '../lib/api-client';
import { useAuth } from '../lib/auth-context';
import { RecordCard } from '../components/RecordCard';
import { EditRecordModal } from '../components/EditRecordModal';
import { Zap, Inbox } from 'lucide-react';

export default function SuperHomePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<RecordModel[]>([]);
  const [quickNote, setQuickNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordModel | null>(null);

  const loadData = async () => {
    try {
      const recs = await ApiClient.getRecords();
      setRecords(recs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim()) return;

    setIsSubmitting(true);
    try {
      await ApiClient.createRecord({
        user_id: user?.id || 'usr_default',
        type: 'note',
        title: `闪记 ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        content: quickNote.trim(),
        privacy: false,
      });
      setQuickNote('');
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto py-2">
      {/* 结合浅灰底色的随手记输入区域 (字号升级为 15px) */}
      <form
        onSubmit={handleQuickNoteSubmit}
        className="relative p-2.5 rounded-2xl bg-[#F7F8FA] dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.06] transition-all focus-within:border-black/15 focus-within:bg-white dark:focus-within:bg-[#242426] shadow-2xs"
      >
        <div className="flex items-center gap-2.5 px-2">
          <Zap size={17} className="text-amber-500 shrink-0" />
          <input
            type="text"
            placeholder="记下一闪而过的想法、链接或备忘... 回车即存"
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            className="w-full py-1.5 bg-transparent text-[15px] text-apple-text dark:text-apple-text-dark placeholder-apple-text-tertiary focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSubmitting || !quickNote.trim()}
            className="px-4 py-1.5 rounded-xl bg-apple-text dark:bg-white text-white dark:text-apple-text disabled:opacity-20 text-xs font-semibold shrink-0 transition-all shadow-2xs"
          >
            {isSubmitting ? '保存中' : '记录'}
          </button>
        </div>
      </form>

      {/* 核心时间流 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between px-2 py-1 text-xs text-apple-text-tertiary">
          <span>时间流 · {records.length} 条记录</span>
        </div>

        {records.length === 0 ? (
          <div className="py-20 text-center space-y-2 text-apple-text-tertiary">
            <Inbox size={26} className="mx-auto opacity-30" />
            <p className="text-sm">暂无记录，在上方输入文字随时记录</p>
          </div>
        ) : (
          <div>
            {records.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onEdit={(r) => setEditingRecord(r)}
                onDelete={async (id) => {
                  await ApiClient.deleteRecord(id);
                  loadData();
                }}
              />
            ))}
          </div>
        )}
      </div>

      {editingRecord && (
        <EditRecordModal
          record={editingRecord}
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          onSuccess={() => {
            setEditingRecord(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
