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
    benefits?: any;
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

  // 提取 table_rows 摘要（优先使用 reply_json.table_rows）
  const tableRows = replyJson.reply_json?.table_rows || replyJson.table_rows;
  if (tableRows && Array.isArray(tableRows)) {
    context.table_rows_summary = tableRows.map((row: any) => {
      // 提取价格信息（优先使用 rateInfo）
      const rateInfo = row.rateInfo || {};
      const totalPrice = rateInfo.totalPrice || row.total_price || 0;
      const beforeTaxPrice = rateInfo.beforeTaxPrice || row.before_tax_price;
      
      // 提取礼遇信息（优先使用 benefits，其次 perks）
      let perks = row.benefits?.perks || row.perks;
      if (row.benefits?.perks_summary) {
        perks = row.benefits.perks_summary;
      }
      
      // 提取取消政策（优先使用 policy）
      const policy = row.policy || {};
      const cancellationMain = policy.cancellationPolicy || policy.cancellationDetails || row.cancellation_main || '';
      
      return {
        platform: row.platform || '',
        total_price: totalPrice,
        before_tax_price: beforeTaxPrice,
        perks: perks || row.benefits,
        cancellation_main: cancellationMain,
        risk_level: row.risk_level,
      };
    });
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
 * 格式：结构化、清晰的上下文信息，便于 AI 理解和使用
 */
export function buildContextSummary(context: ComparisonContext | null): string {
  if (!context) return '';

  let summary = `[当前比价上下文信息]\n\n`;
  
  // 基本信息
  summary += `酒店信息：${context.hotel_name}${context.hotel_name_cn ? ` (${context.hotel_name_cn})` : ''}\n`;
  summary += `入住日期：${context.checkin_date}\n`;
  summary += `退房日期：${context.checkout_date}\n`;
  summary += `住宿：${context.nights}晚，${context.guests}人\n\n`;

  // 推荐方案
  if (context.best_choice) {
    summary += `[推荐最优方案]\n`;
    summary += `平台：${context.best_choice.platform}\n`;
    summary += `总价：¥${context.best_choice.total_price}\n`;
    summary += `推荐理由：${context.best_choice.reason}\n`;
    
    // 礼遇信息（详细）
    if (context.best_choice.perks) {
      if (typeof context.best_choice.perks === 'object') {
        const perksObj = context.best_choice.perks as any;
        if (perksObj.breakfastInclude) {
          summary += `早餐：${perksObj.breakfastDetail || '包含早餐'}\n`;
        }
        // 遍历其他礼遇
        Object.keys(perksObj).forEach(key => {
          if (key !== 'breakfastInclude' && key !== 'breakfastDetail') {
            const value = perksObj[key];
            if (value && typeof value !== 'boolean') {
              summary += `${key}：${value}\n`;
            } else if (value === true) {
              summary += `${key}：是\n`;
            }
          }
        });
      } else {
        summary += `礼遇：${context.best_choice.perks}\n`;
      }
    }
    summary += `\n`;
  }

  // 各平台对比
  if (context.table_rows_summary.length > 0) {
    summary += `[各平台报价对比]\n`;
    context.table_rows_summary.forEach((row, idx) => {
      summary += `${idx + 1}. ${row.platform}：\n`;
      summary += `   - 总价：¥${row.total_price}\n`;
      if (row.before_tax_price) {
        summary += `   - 税前价：¥${row.before_tax_price}\n`;
      }
      if (row.cancellation_main) {
        summary += `   - 取消政策：${row.cancellation_main}\n`;
      }
      if (row.risk_level) {
        summary += `   - 风险等级：${row.risk_level}\n`;
      }
      // 礼遇信息（详细）
      if (row.perks) {
        if (typeof row.perks === 'object') {
          const perksObj = row.perks as any;
          
          // 处理早餐信息
          if (perksObj.breakfastInclude !== undefined) {
            if (perksObj.breakfastInclude === true || perksObj.breakfastInclude === 'true') {
              summary += `   - 早餐：${perksObj.breakfastDetail || '包含早餐'}\n`;
            } else {
              summary += `   - 早餐：不含早\n`;
            }
          }
          
          // 处理积分累积
          if (perksObj.pointsAccumulatable) {
            const pointsInfo = perksObj.pointsAccumulatable;
            if (typeof pointsInfo === 'object' && pointsInfo.is_accumulatable) {
              summary += `   - 积分：可累积${pointsInfo.points || ''}积分\n`;
            } else if (pointsInfo === true) {
              summary += `   - 积分：可累积积分\n`;
            }
          }
          
          // 处理 VIP 权益
          if (perksObj.vipBenefits && Array.isArray(perksObj.vipBenefits)) {
            perksObj.vipBenefits.forEach((benefit: string) => {
              summary += `   - ${benefit}\n`;
            });
          }
          
          // 处理结构化礼遇（如 "视房态升房": "视入住当天房态而定"）
          Object.keys(perksObj).forEach(key => {
            if (!['breakfastInclude', 'breakfastDetail', 'pointsAccumulatable', 'vipBenefits'].includes(key)) {
              const value = perksObj[key];
              if (value && typeof value !== 'boolean') {
                summary += `   - ${key}：${value}\n`;
              } else if (value === true) {
                summary += `   - ${key}：是\n`;
              }
            }
          });
        } else if (typeof row.perks === 'string') {
          summary += `   - 礼遇：${row.perks}\n`;
        }
      }
      
      // 如果 perks 为空，但 benefits 有数据，也提取
      if (!row.perks && row.benefits) {
        const benefits = row.benefits as any;
        if (benefits.perks_summary) {
          summary += `   - 礼遇：${benefits.perks_summary}\n`;
        }
        if (benefits.promotions && Array.isArray(benefits.promotions)) {
          benefits.promotions.forEach((promo: any) => {
            summary += `   - 优惠：${promo.name}${promo.description ? ` - ${promo.description}` : ''}\n`;
          });
        }
      }
      
      summary += `\n`;
    });
  }

  // 深度分析
  if (context.deep_analysis) {
    summary += `[深度分析]\n`;
    if (context.deep_analysis.price) {
      summary += `价格分析：${context.deep_analysis.price}\n`;
    }
    if (context.deep_analysis.perks) {
      summary += `礼遇分析：${context.deep_analysis.perks}\n`;
    }
    if (context.deep_analysis.cancellation) {
      summary += `取消政策分析：${context.deep_analysis.cancellation}\n`;
    }
    summary += `\n`;
  }

  summary += `[重要提示]\n`;
  summary += `请基于以上比价数据回答用户问题。如果用户询问具体平台的礼遇、价格、取消政策等信息，请准确引用上述数据，不要编造数据。\n`;
  summary += `如果用户询问"Official的官网价格有没有什么礼遇"或"LuxTrip有什么礼遇"，请直接引用上述对应平台的具体礼遇信息。\n`;

  return summary;
}
