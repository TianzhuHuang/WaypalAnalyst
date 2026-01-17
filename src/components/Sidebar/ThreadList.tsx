'use client';

import { useState, useRef } from 'react';
import { MessageSquare, Clock, Trash2 } from 'lucide-react';
import { formatDistanceToNow, format as formatDate } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useThreadListQuery } from '@/hooks/useThreadListQuery';
import { useQueryClient } from '@tanstack/react-query';
import ThreadListSkeleton from './ThreadListSkeleton';

// 格式化日期显示（例如：1月15日 - 1月19日）
function formatDateRange(checkIn?: string | null, checkOut?: string | null): string | null {
  if (!checkIn || !checkOut) return null;
  try {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const formattedCheckIn = formatDate(checkInDate, 'M月d日', { locale: zhCN });
    const formattedCheckOut = formatDate(checkOutDate, 'M月d日', { locale: zhCN });
    return `${formattedCheckIn} - ${formattedCheckOut}`;
  } catch (error) {
    console.error('Error formatting date range:', error);
    return null;
  }
}

interface ThreadListProps {
  onSelectThread: (threadId: string) => void;
  currentThreadId?: string | null;
  onDeleteThread?: (threadId: string) => void;
}

export default function ThreadList({ 
  onSelectThread, 
  currentThreadId,
  onDeleteThread,
}: ThreadListProps) {
  const { threads, isLoading, error, deleteThread, isDeleting } = useThreadListQuery();
  const queryClient = useQueryClient();
  const [hoveredThreadId, setHoveredThreadId] = useState<string | null>(null);
  
  // 预取 Thread 数据（当鼠标悬停超过 100ms）
  const prefetchTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  const handleMouseEnter = (threadId: string) => {
    setHoveredThreadId(threadId);
    const timer = setTimeout(() => {
      // 预取 Thread 详情和消息
      queryClient.prefetchQuery({
        queryKey: ['thread', threadId],
        queryFn: async () => {
          const response = await fetch(`/api/threads/${threadId}`);
          if (!response.ok) throw new Error('Failed to load thread');
          return response.json();
        },
      });
      queryClient.prefetchQuery({
        queryKey: ['thread-messages', threadId],
        queryFn: async () => {
          const response = await fetch(`/api/threads/${threadId}/messages`);
          if (!response.ok) throw new Error('Failed to load messages');
          return response.json();
        },
      });
      prefetchTimersRef.current.delete(threadId);
    }, 100);
    prefetchTimersRef.current.set(threadId, timer);
  };
  
  const handleMouseLeave = (threadId: string) => {
    setHoveredThreadId(null);
    const timer = prefetchTimersRef.current.get(threadId);
    if (timer) {
      clearTimeout(timer);
      prefetchTimersRef.current.delete(threadId);
    }
  };
  
  const handleDelete = (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log('[ThreadList] handleDelete called for thread:', threadId);
    console.log('[ThreadList] onDeleteThread exists:', !!onDeleteThread);
    console.log('[ThreadList] deleteThread function:', typeof deleteThread);
    
    // 如果提供了外部删除处理函数，先调用它（处理重置逻辑，如清空当前 Thread）
    if (onDeleteThread) {
      console.log('[ThreadList] Calling onDeleteThread callback');
      onDeleteThread(threadId);
    }
    
    // 始终使用 React Query 的删除 mutation（包含乐观更新和 Toast）
    // 这会立即从列表中移除 Thread，并显示 Toast 提示
    console.log('[ThreadList] Calling deleteThread mutation');
    deleteThread(threadId);
  };

  if (isLoading) {
    return (
      <div className="p-2">
        <div className="p-4 text-center text-white/40 mb-2">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm">加载中...</p>
        </div>
        <ThreadListSkeleton />
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
          onClick={(e) => {
            // 如果点击的是删除按钮或其子元素，不触发选择 Thread
            if ((e.target as HTMLElement).closest('button[title="删除对话"]')) {
              return;
            }
            onSelectThread(thread.id);
          }}
          onMouseEnter={() => handleMouseEnter(thread.id)}
          onMouseLeave={() => handleMouseLeave(thread.id)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{thread.title || thread.hotelName}</p>
              <div className="flex items-center gap-2 mt-1">
                {thread.hotelName && (
                  <p className="text-xs text-white/40 truncate">{thread.hotelName}</p>
                )}
                {(() => {
                  const dateRange = formatDateRange(thread.checkIn, thread.checkOut);
                  if (dateRange) {
                    return (
                      <>
                        {thread.hotelName && <span className="text-xs text-white/20">·</span>}
                        <p className="text-xs text-white/40">{dateRange}</p>
                      </>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 text-xs text-white/30">
                <Clock className="w-3 h-3" />
                <span className="hidden sm:inline">
                  {formatDistanceToNow(new Date(thread.updatedAt), {
                    addSuffix: true,
                    locale: zhCN,
                  })}
                </span>
              </div>
              <button
                onClick={(e) => {
                  console.log('[ThreadList] Delete button clicked for thread:', thread.id);
                  handleDelete(e, thread.id);
                }}
                disabled={isDeleting}
                className="opacity-60 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
                title="删除对话"
                type="button"
              >
                <Trash2 className={`w-3.5 h-3.5 text-white/40 hover:text-white/60 ${isDeleting ? 'animate-pulse' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
