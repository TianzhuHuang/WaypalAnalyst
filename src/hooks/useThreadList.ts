import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

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

export function useThreadList() {
  const { data: session } = useSession();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThreads = useCallback(async () => {
    if (!session?.user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/threads');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load threads');
      }

      const data = await response.json();
      setThreads(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load threads');
      console.error('Error loading threads:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // 刷新 Thread 列表
  const refresh = useCallback(() => {
    fetchThreads();
  }, [fetchThreads]);

  return {
    threads,
    isLoading,
    error,
    refresh,
  };
}
