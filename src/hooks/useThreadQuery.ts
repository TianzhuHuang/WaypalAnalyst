import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

export interface ThreadContext {
  hotelName: string;
  hotelId?: string;
  checkIn?: string;
  checkOut?: string;
  metadata?: Record<string, any>;
}

export interface ThreadUpdateContext {
  hotelName?: string;
  hotelId?: string;
  checkIn?: string;
  checkOut?: string;
  metadata?: Record<string, any>;
  title?: string;
}

export interface Message {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface Thread {
  id: string;
  userId: string;
  hotelName: string;
  hotelId?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  metadata?: Record<string, any>;
  title?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 获取 Thread 详情
async function fetchThread(threadId: string): Promise<Thread> {
  const response = await fetch(`/api/threads/${threadId}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to load thread');
  }
  return response.json();
}

// 获取 Thread 消息
async function fetchThreadMessages(threadId: string): Promise<Message[]> {
  const response = await fetch(`/api/threads/${threadId}/messages`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to load messages');
  }
  return response.json();
}

export function useThreadQuery(threadId: string | null) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  // 获取 Thread 详情
  const threadQuery = useQuery<Thread>({
    queryKey: ['thread', threadId],
    queryFn: () => fetchThread(threadId!),
    enabled: !!threadId && !!session?.user?.id,
    staleTime: 1000 * 60 * 5, // 5分钟内使用缓存
    gcTime: 1000 * 60 * 10, // 10分钟后垃圾回收
  });

  // 获取 Thread 消息
  const messagesQuery = useQuery<Message[]>({
    queryKey: ['thread-messages', threadId],
    queryFn: () => fetchThreadMessages(threadId!),
    enabled: !!threadId && !!session?.user?.id,
    staleTime: 1000 * 60 * 5, // 5分钟内使用缓存
    gcTime: 1000 * 60 * 10, // 10分钟后垃圾回收
  });

  // 创建 Thread
  const createThreadMutation = useMutation({
    mutationFn: async (context: ThreadContext) => {
      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create thread');
      }
      return response.json() as Promise<Thread>;
    },
    onSuccess: () => {
      // 刷新 Thread 列表
      queryClient.invalidateQueries({ queryKey: ['threads', session?.user?.id] });
    },
  });

  // 保存消息
  const saveMessageMutation = useMutation({
    mutationFn: async ({ threadId, role, content }: { threadId: string; role: 'user' | 'assistant' | 'system'; content: string }) => {
      console.log('[useThreadQuery] Saving message:', {
        threadId,
        role,
        contentLength: content?.length || 0,
        hasSession: !!session,
        userId: session?.user?.id || 'NONE',
      });
      
      const response = await fetch(`/api/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[useThreadQuery] Failed to save message:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          threadId,
          role,
        });
        throw new Error(errorData.error || errorData.details || `Failed to save message: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('[useThreadQuery] Message saved successfully:', result.id);
      return result;
    },
    onSuccess: (_, variables) => {
      console.log('[useThreadQuery] Message save success, invalidating queries');
      // 刷新消息列表
      queryClient.invalidateQueries({ queryKey: ['thread-messages', variables.threadId] });
      // 刷新 Thread 列表（更新 updatedAt）
      queryClient.invalidateQueries({ queryKey: ['threads', session?.user?.id] });
    },
    onError: (error: any) => {
      console.error('[useThreadQuery] Message save mutation error:', {
        error: error.message,
        stack: error.stack,
      });
    },
  });

  // 更新 Thread 上下文
  const updateThreadMutation = useMutation({
    mutationFn: async ({ threadId, context }: { threadId: string; context: ThreadUpdateContext }) => {
      const response = await fetch(`/api/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update thread');
      }
      return response.json() as Promise<Thread>;
    },
    onSuccess: (_, variables) => {
      // 刷新 Thread 详情
      queryClient.invalidateQueries({ queryKey: ['thread', variables.threadId] });
      // 刷新 Thread 列表
      queryClient.invalidateQueries({ queryKey: ['threads', session?.user?.id] });
    },
  });

  return {
    thread: threadQuery.data,
    messages: messagesQuery.data || [],
    isLoadingThread: threadQuery.isLoading,
    isLoadingMessages: messagesQuery.isLoading,
    error: threadQuery.error || messagesQuery.error,
    createThread: createThreadMutation.mutateAsync,
    saveMessage: saveMessageMutation.mutateAsync,
    updateThread: updateThreadMutation.mutateAsync,
    isCreating: createThreadMutation.isPending,
    isSaving: saveMessageMutation.isPending,
  };
}
