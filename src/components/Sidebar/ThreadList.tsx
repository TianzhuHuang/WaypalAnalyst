'use client';

import { useThreadList } from '@/hooks/useThreadList';
import { MessageSquare, Clock, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ThreadListProps {
  onSelectThread: (threadId: string) => void;
  currentThreadId?: string | null;
  onDeleteThread?: (threadId: string) => void;
}

export default function ThreadList({ 
  onSelectThread, 
  currentThreadId,
  onDeleteThread 
}: ThreadListProps) {
  const { threads, isLoading, error } = useThreadList();

  const handleDelete = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (onDeleteThread) {
      onDeleteThread(threadId);
    } else {
      // 默认删除逻辑
      try {
        const response = await fetch(`/api/threads/${threadId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          // 刷新列表
          window.location.reload();
        }
      } catch (err) {
        console.error('Failed to delete thread:', err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-white/40">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm">加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-white/40">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="p-4 text-center text-white/40">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">暂无对话历史</p>
        <p className="text-xs mt-1 opacity-60">开始一次新的酒店查询吧</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {threads.map((thread) => (
        <div
          key={thread.id}
          className={`group relative w-full text-left p-3 rounded-lg transition-colors cursor-pointer ${
            currentThreadId === thread.id
              ? 'bg-white/10 text-white'
              : 'text-white/60 hover:bg-white/5 hover:text-white/80'
          }`}
          onClick={() => onSelectThread(thread.id)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{thread.title || thread.hotelName}</p>
              <p className="text-xs text-white/40 truncate mt-1">{thread.hotelName}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 text-xs text-white/30">
                <Clock className="w-3 h-3" />
                <span className="hidden md:inline">
                  {formatDistanceToNow(new Date(thread.updatedAt), {
                    addSuffix: true,
                    locale: zhCN,
                  })}
                </span>
              </div>
              <button
                onClick={(e) => handleDelete(e, thread.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
                title="删除对话"
              >
                <Trash2 className="w-3.5 h-3.5 text-white/40 hover:text-white/60" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
