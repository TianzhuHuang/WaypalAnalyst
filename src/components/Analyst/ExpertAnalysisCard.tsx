'use client';

import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface ExpertAnalysisCardProps {
  analysis: string;
  locale?: string;
}

export default function ExpertAnalysisCard({
  analysis,
  locale = 'zh',
}: ExpertAnalysisCardProps) {
  const isZh = locale === 'zh';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-6 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 border border-amber-200 rounded-2xl shadow-lg"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-amber-200 rounded-lg">
          <Sparkles className="w-5 h-5 text-amber-800" />
        </div>
        <div>
          <h3 className="font-bold text-amber-900 text-lg">
            {isZh ? 'Waypal 专家建议' : 'Waypal Expert Advice'}
          </h3>
          <p className="text-xs text-amber-700 mt-1">
            {isZh ? '基于实时比价数据的专业分析' : 'Professional analysis based on real-time comparison'}
          </p>
        </div>
      </div>
      <div className="prose prose-sm max-w-none">
        <p className="text-amber-900 leading-relaxed whitespace-pre-wrap">
          {analysis}
        </p>
      </div>
    </motion.div>
  );
}
