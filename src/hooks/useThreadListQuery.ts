import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

export interface Thread {
  id: string;
  title: string;
  hotelName: string;
  hotelId?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// 获取 Thread 列表
async function fetchThreads(): Promise<Thread[]> {
  const response = await fetch('/api/threads');
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to load threads');
  }
  return response.json();
}

export function useThreadListQuery() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const {
    data: threads = [],
    isLoading,
    error,
  } = useQuery<Thread[]>({
    queryKey: ['threads', session?.user?.id],
    queryFn: fetchThreads,
    enabled: !!session?.user?.id,
    staleTime: 1000 * 30, // 30秒内使用缓存
  });

  // 删除 Thread（乐观更新）
  const deleteThreadMutation = useMutation({
    mutationFn: async (threadId: string) => {
      console.log('deleteThreadMutation: Starting delete for thread', threadId);
      const response = await fetch(`/api/threads/${threadId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('deleteThreadMutation: Delete failed', errorData);
        throw new Error(errorData.error || 'Failed to delete thread');
      }
      console.log('deleteThreadMutation: Delete successful');
      return threadId;
    },
    onMutate: async (threadId) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: ['threads', session?.user?.id] });

      // 保存当前状态快照
      const previousThreads = queryClient.getQueryData<Thread[]>(['threads', session?.user?.id]);

      // 乐观更新：立即从列表中移除
      queryClient.setQueryData<Thread[]>(['threads', session?.user?.id], (old = []) =>
        old.filter(thread => thread.id !== threadId)
      );

      return { previousThreads };
    },
    onError: (err, threadId, context) => {
      console.error('[useThreadListQuery] onError called for thread:', threadId, err);
      // 回滚到之前的状态
      if (context?.previousThreads) {
        console.log('[useThreadListQuery] Rolling back to previous state');
        queryClient.setQueryData(['threads', session?.user?.id], context.previousThreads);
      }
      toast.error(`删除失败: ${err instanceof Error ? err.message : '未知错误'}`);
    },
    onSuccess: (threadId) => {
      console.log('[useThreadListQuery] onSuccess called for thread:', threadId);
      toast.success('对话已删除');
      // 确保列表刷新
      queryClient.invalidateQueries({ queryKey: ['threads', session?.user?.id] });
    },
  });

  return {
    threads,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refresh: () => queryClient.invalidateQueries({ queryKey: ['threads', session?.user?.id] }),
    deleteThread: deleteThreadMutation.mutate,
    isDeleting: deleteThreadMutation.isPending,
  };
}
