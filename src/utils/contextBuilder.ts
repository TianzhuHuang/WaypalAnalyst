/**
 * 从比价结果中提取上下文信息，用于增强对话
 */

export interface ComparisonContext {
  hotel_name: string;
  hotel_name_cn?: string;
  checkin_date: string;
  checkout_date: string;
  nights: number;
  guests: number;
  best_choice?: {
    platform: string;
    total_price: number;
    reason: string;
    perks?: any;
  };
  table_rows_summary: Array<{
    platform: string;
    total_price: number;
    before_tax_price?: number;
    perks?: any;
    cancellation_main: string;
    risk_level?: string;
  }>;
  deep_analysis?: {
    price?: string;
    perks?: string;
    cancellation?: string;
  };
}

/**
 * 从 reply_json 构建上下文对象
 */
export function buildContextFromComparison(replyJson: any): ComparisonContext | null {
  if (!replyJson || typeof replyJson !== 'object') {
    return null;
  }

  const context: ComparisonContext = {
    hotel_name: replyJson.hotel_name || '',
    hotel_name_cn: replyJson.hotel_name_cn,
    checkin_date: replyJson.checkin_date || '',
    checkout_date: replyJson.checkout_date || '',
    nights: replyJson.nights || 0,
    guests: replyJson.guests || 0,
    table_rows_summary: [],
  };

  // 提取 best_choice
  if (replyJson.best_choice) {
    context.best_choice = {
      platform: replyJson.best_choice.platform || '',
      total_price: replyJson.best_choice.total_price || 0,
      reason: replyJson.best_choice.reason || '',
      perks: replyJson.best_choice.perks,
    };
  }

  // 提取 table_rows 摘要
  if (replyJson.table_rows && Array.isArray(replyJson.table_rows)) {
    context.table_rows_summary = replyJson.table_rows.map((row: any) => ({
      platform: row.platform || '',
      total_price: row.total_price || 0,
      before_tax_price: row.before_tax_price,
      perks: row.perks,
      cancellation_main: row.cancellation_main || '',
      risk_level: row.risk_level,
    }));
  }

  // 提取深度分析
  if (replyJson.deep_analysis) {
    context.deep_analysis = {
      price: replyJson.deep_analysis.price,
      perks: replyJson.deep_analysis.perks,
      cancellation: replyJson.deep_analysis.cancellation,
    };
  }

  return context;
}

/**
 * 检查上下文是否过期（超过 24 小时）
 */
export function isContextExpired(checkinDate: string): boolean {
  if (!checkinDate) return true;
  
  try {
    const checkin = new Date(checkinDate);
    const now = new Date();
    const hoursDiff = (checkin.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // 如果入住日期已过，或超过 24 小时，认为过期
    return hoursDiff < -24;
  } catch (error) {
    console.error('Error checking context expiration:', error);
    return true;
  }
}

/**
 * 构建上下文摘要文本（用于嵌入 message_text）
 */
export function buildContextSummary(context: ComparisonContext | null): string {
  if (!context) return '';

  let summary = `\n[当前比价上下文]\n`;
  summary += `酒店：${context.hotel_name}${context.hotel_name_cn ? ` (${context.hotel_name_cn})` : ''}\n`;
  summary += `入住日期：${context.checkin_date} - ${context.checkout_date} (${context.nights}晚，${context.guests}人)\n`;

  if (context.best_choice) {
    summary += `\n推荐最优方案：${context.best_choice.platform}\n`;
    summary += `总价：¥${context.best_choice.total_price}\n`;
    summary += `推荐理由：${context.best_choice.reason}\n`;
    
    // 如果有礼遇信息，也包含
    if (context.best_choice.perks) {
      const perksStr = JSON.stringify(context.best_choice.perks);
      if (perksStr !== '{}') {
        summary += `礼遇：${perksStr}\n`;
      }
    }
  }

  if (context.table_rows_summary.length > 0) {
    summary += `\n各平台报价对比：\n`;
    context.table_rows_summary.forEach((row, idx) => {
      summary += `${idx + 1}. ${row.platform}：¥${row.total_price}`;
      if (row.before_tax_price) {
        summary += ` (税前：¥${row.before_tax_price})`;
      }
      if (row.cancellation_main) {
        summary += `，取消政策：${row.cancellation_main}`;
      }
      if (row.risk_level) {
        summary += `，风险等级：${row.risk_level}`;
      }
      // 简要礼遇信息
      if (row.perks) {
        const perksStr = typeof row.perks === 'string' ? row.perks : JSON.stringify(row.perks);
        if (perksStr && perksStr !== '{}') {
          summary += `，礼遇：${perksStr.substring(0, 50)}${perksStr.length > 50 ? '...' : ''}`;
        }
      }
      summary += `\n`;
    });
  }

  if (context.deep_analysis) {
    if (context.deep_analysis.price) {
      summary += `\n价格分析：${context.deep_analysis.price}\n`;
    }
    if (context.deep_analysis.perks) {
      summary += `礼遇分析：${context.deep_analysis.perks}\n`;
    }
    if (context.deep_analysis.cancellation) {
      summary += `取消政策分析：${context.deep_analysis.cancellation}\n`;
    }
  }

  summary += `\n请基于以上比价数据回答用户问题。如果用户询问具体平台的礼遇、价格或政策，请准确引用上述数据。不要编造数据。\n`;

  return summary;
}
