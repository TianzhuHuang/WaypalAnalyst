'use client';

import { Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface DeepAnalysisButtonProps {
  onAnalyze: () => Promise<void>;
  isLoading?: boolean;
  locale?: string;
}

export default function DeepAnalysisButton({
  onAnalyze,
  isLoading = false,
  locale = 'zh',
}: DeepAnalysisButtonProps) {
  const isZh = locale === 'zh';

  return (
    <motion.button
      onClick={onAnalyze}
      disabled={isLoading}
      className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-900 hover:from-amber-100 hover:to-yellow-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-medium">
            {isZh ? '正在生成专家分析...' : 'Generating expert analysis...'}
          </span>
        </>
      ) : (
        <>
          <Sparkles className="w-5 h-5" />
          <span className="font-medium">
            {isZh ? '🤖 听听 Waypal 的建议' : '🤖 Get Waypal Expert Advice'}
          </span>
        </>
      )}
    </motion.button>
  );
}
