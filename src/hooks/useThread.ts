import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface ThreadContext {
  hotelName: string;
  hotelId?: string;
  checkIn?: string;
  checkOut?: string;
  metadata?: Record<string, any>;
}

export function useThread() {
  const { data: session } = useSession();
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 创建新 Thread
  const createThread = useCallback(async (context: ThreadContext): Promise<string | null> => {
    if (!session?.user?.id) {
      setError('User not authenticated');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create thread');
      }

      const thread = await response.json();
      setCurrentThreadId(thread.id);
      return thread.id;
    } catch (err: any) {
      setError(err.message || 'Failed to create thread');
      console.error('Error creating thread:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // 保存消息
  const saveMessage = useCallback(async (
    threadId: string,
    role: 'user' | 'assistant' | 'system',
    content: string
  ): Promise<boolean> => {
    if (!session?.user?.id) {
      setError('User not authenticated');
      return false;
    }

    try {
      const response = await fetch(`/api/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save message');
      }

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to save message');
      console.error('Error saving message:', err);
      return false;
    }
  }, [session]);

  // 加载 Thread 消息
  const loadThread = useCallback(async (threadId: string) => {
    if (!session?.user?.id) {
      setError('User not authenticated');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/threads/${threadId}/messages`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load thread');
      }

      const messages = await response.json();
      setCurrentThreadId(threadId);
      return messages;
    } catch (err: any) {
      setError(err.message || 'Failed to load thread');
      console.error('Error loading thread:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // 更新 Thread 上下文
  const updateThreadContext = useCallback(async (
    threadId: string,
    context: Partial<ThreadContext>
  ): Promise<boolean> => {
    if (!session?.user?.id) {
      setError('User not authenticated');
      return false;
    }

    try {
      const response = await fetch(`/api/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update thread');
      }

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to update thread');
      console.error('Error updating thread:', err);
      return false;
    }
  }, [session]);

  return {
    currentThreadId,
    setCurrentThreadId,
    createThread,
    saveMessage,
    loadThread,
    updateThreadContext,
    isLoading,
    error,
  };
}
