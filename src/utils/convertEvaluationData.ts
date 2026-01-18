/**
 * 将 evaluationData 转换为 EvaluationTable 所需的格式
 */

import { EvaluationData } from '@/api/agentApi';

interface Promotion {
  name: string;
  description?: string;
  available_until?: string;
}

interface StructuredPerk {
  label: string;
  detail: string;
}

interface PerksInfo {
  breakfast: 'included' | 'not_included' | 'daily_double';
  pointsAccumulatable: boolean;
  vipBenefits?: string[];
  negativePerks?: string[];
  promotions?: Promotion[];
  structuredPerks?: StructuredPerk[];
  perksSummary?: string;
}

interface PolicyInfo {
  cancellationPolicy: string;
  cancellationPolicyType?: 'free' | 'conditional' | 'non_refundable';
  cancellationDetails?: string;
  paymentPolicy: 'online_payment' | 'guaranteed_payment_on_arrival' | 'pay_at_hotel' | 'both';
  paymentPolicyText?: string;
}

export interface EvaluationTableRow {
  platform: string;
  platformLogo?: string;
  isBest?: boolean;
  roomType?: string;
  roomTypeCn?: string;
  totalPrice: string;
  nightlyPrice: string;
  perks: PerksInfo;
  perksValue?: string;
  policy: PolicyInfo;
  websiteUrl?: string;
  promotions?: Promotion[];
  structuredPerks?: StructuredPerk[];
}

/**
 * 转换 evaluationData 为 EvaluationTable 格式
 */
export function convertEvaluationDataToTableRows(
  evaluationData: EvaluationData,
  isBest?: (row: any) => boolean
): EvaluationTableRow[] {
  const tableRows = evaluationData.reply_json?.table_rows || evaluationData.table_rows || [];
  
  return tableRows.map((row: any) => {
    // 提取价格信息
    const rateInfo = row.rateInfo || {};
    const totalPrice = rateInfo.totalPriceDisplay || 
      (rateInfo.totalPrice ? `¥${rateInfo.totalPrice.toLocaleString()}` : '') ||
      row.totalPrice ||
      (row.total_price ? `¥${row.total_price.toLocaleString()}` : 'N/A');
    
    const nightlyPrice = rateInfo.nightlyPriceDisplay || 
      (rateInfo.nightlyPrice ? `¥${rateInfo.nightlyPrice.toLocaleString()}/night` : '') ||
      row.nightlyPrice ||
      (row.nightly_price ? `¥${row.nightly_price.toLocaleString()}/night` : '');

    // 提取礼遇信息
    const benefits = row.benefits || {};
    const perks = row.perks || {};
    
    // 处理早餐信息
    let breakfast: 'included' | 'not_included' | 'daily_double' = 'not_included';
    if (perks.breakfastInclude === true || perks.breakfast === 'included' || perks.breakfast === true) {
      breakfast = 'included';
    } else if (perks.breakfast === 'daily_double') {
      breakfast = 'daily_double';
    } else if (typeof perks.breakfast === 'string') {
      if (perks.breakfast.includes('daily') || perks.breakfast.includes('双早')) {
        breakfast = 'daily_double';
      } else if (perks.breakfast.includes('included') || perks.breakfast.includes('含早')) {
        breakfast = 'included';
      }
    }

    // 处理积分累积
    const pointsAccumulatable = perks.pointsAccumulatable?.is_accumulatable || 
      perks.pointsAccumulatable === true ||
      false;

    // 处理 VIP 权益
    const vipBenefits = perks.vipBenefits || benefits.vipBenefits || [];

    // 处理结构化礼遇
    const structuredPerks: StructuredPerk[] = [];
    
    // 从 benefits.perks 提取（如果是对象格式，如 { "视房态升房": "视入住当天房态而定" }）
    if (benefits.perks && typeof benefits.perks === 'object' && !Array.isArray(benefits.perks)) {
      Object.keys(benefits.perks).forEach(key => {
        const value = benefits.perks[key];
        if (value && typeof value === 'string') {
          structuredPerks.push({
            label: key,
            detail: value,
          });
        }
      });
    }
    
    // 从 perks 对象提取（排除已处理的字段）
    if (perks && typeof perks === 'object' && !Array.isArray(perks)) {
      Object.keys(perks).forEach(key => {
        if (!['breakfastInclude', 'breakfastDetail', 'breakfast', 'pointsAccumulatable', 'vipBenefits', 'perksValue', 'perksSummary'].includes(key)) {
          const value = perks[key];
          if (value && typeof value === 'string' && value !== 'true' && value !== 'false') {
            // 避免重复
            if (!structuredPerks.some(sp => sp.label === key)) {
              structuredPerks.push({
                label: key,
                detail: value,
              });
            }
          }
        }
      });
    }

    // 处理优惠政策
    let promotions: Promotion[] = [];
    
    // 调试：打印原始数据
    if (row.platform?.toLowerCase() === 'luxtrip') {
      console.log('[convertEvaluationData] LuxTrip row data:', {
        platform: row.platform,
        benefits: row.benefits,
        promotions: row.promotions,
        promotion: row.promotion,
        fullRow: row,
      });
    }
    
    if (benefits.promotions && Array.isArray(benefits.promotions)) {
      promotions = benefits.promotions;
    } else if (row.promotions && Array.isArray(row.promotions)) {
      promotions = row.promotions;
    } else if (row.promotion) {
      // 单个 promotion 对象
      promotions = [row.promotion];
    } else if (benefits.promotion) {
      // benefits 中的单个 promotion
      promotions = [benefits.promotion];
    }
    
    // 调试：打印提取的 promotions
    if (row.platform?.toLowerCase() === 'luxtrip' && promotions.length > 0) {
      console.log('[convertEvaluationData] LuxTrip promotions extracted:', promotions);
    }

    // 处理取消政策
    const policy = row.policy || {};
    let cancellationPolicy = policy.cancellationPolicy || 
      policy.cancellationDetails ||
      row.cancellation_main ||
      row.cancellation ||
      '限时取消';
    
    let cancellationPolicyType: 'free' | 'conditional' | 'non_refundable' | undefined = 
      policy.cancellationPolicyType;
    
    if (!cancellationPolicyType) {
      const lowerPolicy = cancellationPolicy.toLowerCase();
      if (lowerPolicy.includes('free') || lowerPolicy.includes('免费')) {
        cancellationPolicyType = 'free';
      } else if (lowerPolicy.includes('non-refundable') || lowerPolicy.includes('不可退') || lowerPolicy.includes('不可取消')) {
        cancellationPolicyType = 'non_refundable';
      } else {
        cancellationPolicyType = 'conditional';
      }
    }

    const cancellationDetails = policy.cancellationDetails || 
      (cancellationPolicyType === 'free' && policy.cancellationPolicy ? undefined : policy.cancellationPolicy);

    // 处理付款政策
    let paymentPolicy: 'online_payment' | 'guaranteed_payment_on_arrival' | 'pay_at_hotel' | 'both' = 'pay_at_hotel';
    if (policy.paymentPolicy) {
      paymentPolicy = policy.paymentPolicy;
    } else if (policy.paymentPolicyText) {
      const lowerText = policy.paymentPolicyText.toLowerCase();
      if (lowerText.includes('online') || lowerText.includes('在线')) {
        paymentPolicy = 'online_payment';
      } else if (lowerText.includes('arrival') || lowerText.includes('到店')) {
        paymentPolicy = 'pay_at_hotel';
      }
    }

    // 判断是否为最佳选择
    const isBestValue = isBest ? isBest(row) : (row.isBest || row.is_best || false);

    return {
      platform: row.platform || '',
      platformLogo: row.platformLogo,
      isBest: isBestValue,
      roomType: row.room_name,
      roomTypeCn: row.room_name_cn,
      totalPrice,
      nightlyPrice,
      perks: {
        breakfast,
        pointsAccumulatable,
        vipBenefits,
        promotions,
        structuredPerks: structuredPerks.length > 0 ? structuredPerks : undefined,
        perksSummary: benefits.perks_summary || perks.perksSummary,
      },
      perksValue: perks.perksValue || benefits.perksValue,
      policy: {
        cancellationPolicy,
        cancellationPolicyType,
        cancellationDetails,
        paymentPolicy,
        paymentPolicyText: policy.paymentPolicyText,
      },
      websiteUrl: row.websiteUrl || row.website_url,
      promotions,
      structuredPerks: structuredPerks.length > 0 ? structuredPerks : undefined,
    };
  });
}
