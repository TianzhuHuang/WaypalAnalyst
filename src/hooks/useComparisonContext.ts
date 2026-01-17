import { useQuery } from '@tanstack/react-query';
import { useThreadQuery } from './useThreadQuery';
import { buildContextFromComparison, ComparisonContext, isContextExpired } from '@/utils/contextBuilder';

/**
 * 从当前 Thread 中获取比价上下文
 */
export function useComparisonContext(threadId: string | null) {
  const threadQuery = useThreadQuery(threadId);

  const contextQuery = useQuery<ComparisonContext | null>({
    queryKey: ['comparison-context', threadId],
    queryFn: async () => {
      if (!threadId || !threadQuery.thread) {
        return null;
      }

      const comparisonData = threadQuery.thread.metadata?.comparisonData;
      if (!comparisonData) {
        return null;
      }

      // 优先使用 reply_json，如果没有则使用 comparisonData
      const replyJson = comparisonData.reply_json || comparisonData;
      const context = buildContextFromComparison(replyJson);

      return context;
    },
    enabled: !!threadId && !!threadQuery.thread,
    staleTime: 1000 * 60 * 5, // 5分钟缓存
  });

  const context = contextQuery.data || null;
  const isExpired = context ? isContextExpired(context.checkin_date) : false;

  return {
    context,
    isLoading: contextQuery.isLoading,
    isExpired,
    hasContext: !!context,
  };
}
