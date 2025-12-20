'use client';

import { useState } from 'react';
import { MapPin, Calendar, CheckCircle2, XCircle, Info, ExternalLink, Star, CreditCard, Utensils, Bed, ChevronDown, ShieldCheck, X, Gift, Sparkles, Coffee, DollarSign, TrendingUp, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  breakfast: 'included' | 'not_included' | 'daily_double'; // 含早/无早/每日双早，必须显示
  pointsAccumulatable: boolean; // 是否可累积酒店会员积分，必须显示
  vipBenefits?: string[]; // VIP权益列表，如：['$100 USD dining credit', 'Room upgrade (subject to availability)', 'Late checkout until 4PM']
  negativePerks?: string[]; // 负面权益列表，如：['No Extra Gift']
  promotions?: Promotion[]; // 优惠政策列表
  structuredPerks?: StructuredPerk[]; // 结构化礼遇列表
  perksSummary?: string; // 礼遇摘要（fallback）
}

interface PolicyInfo {
  cancellationPolicy: string; // 取消政策
  cancellationPolicyType?: 'free' | 'conditional' | 'non_refundable'; // 取消政策类型
  cancellationDetails?: string; // 取消详情，如：'Until Dec 24 18:00', '2 days prior'
  paymentPolicy: 'online_payment' | 'guaranteed_payment_on_arrival' | 'pay_at_hotel' | 'both'; // 付款政策
  paymentPolicyText?: string; // 付款政策文本描述
}

interface ComparisonRow {
  platform: string;
  platformLogo?: string;
  isBest?: boolean;
  roomType?: string; // 房型名称
  roomTypeCn?: string; // 房型中文名称
  totalPrice: string;
  nightlyPrice: string;
  perks: PerksInfo; // 改为结构化对象
  perksValue?: string; // 礼遇总价值
  policy: PolicyInfo; // 改为结构化对象
  websiteUrl?: string;
  promotions?: Promotion[]; // 优惠政策
  structuredPerks?: StructuredPerk[]; // 结构化礼遇
}

interface AnalystComparisonCardProps {
  hotelName: string;
  location: string;
  dateRange: string;
  rows: ComparisonRow[];
  suggestion?: {
    title: string;
    content: string;
  };
  followUpChips?: string[];
  locale?: string;
  onDateChange?: (checkIn: Date, checkOut: Date) => void;
  showDatePicker?: boolean;
}

// Fork and Spoon Icon Component
const ForkSpoonIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 3v18h18" />
    <path d="M18.7 8l-3.1 8.6c-.1.3-.3.5-.6.6l-6.5 2c-.2.1-.5.1-.7 0-.3-.1-.5-.3-.6-.6L3.9 8" />
    <path d="M9 8l1 12" />
    <path d="M15 8l-1 12" />
  </svg>
);

// Custom Fork Spoon Icon (simpler version - using Utensils icon)
const ForkSpoonIconSimple = ({ className = "w-4 h-4" }: { className?: string }) => (
  <Utensils className={`${className} text-gray-700`} strokeWidth={2} />
);

// Get cancellation policy type from text
const getCancellationType = (policy: string): 'free' | 'conditional' | 'non_refundable' => {
  const lowerPolicy = policy.toLowerCase();
  if (lowerPolicy.includes('free') || lowerPolicy.includes('免费')) {
    return 'free';
  } else if (lowerPolicy.includes('non-refundable') || lowerPolicy.includes('不可退') || lowerPolicy.includes('no refund')) {
    return 'non_refundable';
  } else {
    return 'conditional';
  }
};

// Detail Modal Component
function DetailModal({
  isOpen,
  onClose,
  title,
  description,
  expiry,
  locale = 'zh',
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  expiry?: string;
  locale?: string;
}) {
  const isZh = locale === 'zh';

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[200]"
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
            onClick={onClose}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors z-10"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
              <h3 className="text-xl font-bold text-gray-900 mb-3 pr-8">{title}</h3>
              {description && (
                <p className="text-sm text-gray-700 mb-4 leading-relaxed whitespace-pre-wrap break-words">{description}</p>
              )}
              {expiry && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    {isZh ? '有效期至' : 'Valid until'}: {expiry}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function AnalystComparisonCard({
  hotelName,
  location,
  dateRange,
  rows,
  suggestion,
  followUpChips = [],
  locale = 'zh',
  onDateChange,
  showDatePicker: showDatePickerProp = false,
}: AnalystComparisonCardProps) {
  const isZh = locale === 'zh';
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    expiry?: string;
  }>({
    isOpen: false,
    title: '',
  });

  const openModal = (title: string, description?: string, expiry?: string) => {
    setModalState({ isOpen: true, title, description, expiry });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, title: '', description: undefined, expiry: undefined });
  };

  return (
    <>
      <DetailModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        description={modalState.description}
        expiry={modalState.expiry}
        locale={locale}
      />
      <div className="w-full bg-white overflow-visible">
      {/* Card Header */}
      <div className="p-4 md:p-6 border-b border-gray-200 bg-white">
        {/* Hotel Name with Official Site Button */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">{hotelName}</h2>
          {rows.length > 0 && rows[0].websiteUrl && (
            <a
              href={rows[0].websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-normal rounded-lg transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isZh ? '官方网站' : 'Official Site'}</span>
            </a>
          )}
        </div>

        {/* Current Room Type Display */}
        {rows.length > 0 && rows[0].roomType && (
          <div className="flex items-center gap-2 mb-4">
            <Bed className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700">
              {isZh ? rows[0].roomTypeCn || rows[0].roomType : rows[0].roomType}
            </span>
          </div>
        )}

        {/* Interactive Selection Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Room Type Selector */}
          {rows.length > 0 && rows[0].roomType && (
            <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-100 transition-colors">
              <Bed className="w-4 h-4 text-gray-400" />
              <span>{isZh ? rows[0].roomTypeCn || rows[0].roomType : rows[0].roomType}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          )}

          {/* Location Selector with Map Link */}
          {location && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <MapPin className="w-4 h-4 text-gray-400" />
              <span>{location}</span>
              <ExternalLink className="w-3 h-3 text-gray-400" />
            </a>
          )}
        </div>
      </div>

      {/* Comparison Table - Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gray-50/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider align-middle" style={{ width: '180px' }}>
                {isZh ? '预订平台 / 价格' : 'PLATFORM / PRICE'}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider align-middle" style={{ width: '180px' }}>
                {isZh ? '优惠政策' : 'PROMOTIONS'}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider align-middle" style={{ width: '240px' }}>
                {isZh ? '专属礼遇' : 'PERKS'}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider align-middle" style={{ width: '150px' }}>
                {isZh ? '政策' : 'POLICY'}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider align-middle" style={{ width: '120px' }}>
                {isZh ? '操作' : 'ACTION'}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const cancellationType = row.policy.cancellationPolicyType || getCancellationType(row.policy.cancellationPolicy);
              const breakfastText = row.perks.breakfast === 'daily_double'
                ? (isZh ? '每日双早' : 'Daily Double Breakfast')
                : row.perks.breakfast === 'included'
                ? (isZh ? '含早' : 'Breakfast Included')
                : (isZh ? '无早' : 'No Breakfast');
              
              const isLuxTrip = row.isBest || row.platform?.toLowerCase() === 'luxtrip';
              
              return (
                <tr
                  key={index}
                  className={`border-b border-gray-100 transition-colors ${
                    isLuxTrip
                      ? 'bg-emerald-50/20 border-l-4 border-l-[#00CD52] hover:bg-emerald-50/30'
                      : 'bg-white hover:bg-gray-50/50'
                  }`}
                >
                  {/* Platform & Price Column */}
                  <td className="px-4 py-4 align-middle">
                    <div className="flex flex-col">
                      {/* Platform Name */}
                      <div className="flex items-center gap-2 mb-2">
                        {row.platformLogo && (
                          <img 
                            src={row.platformLogo} 
                            alt={row.platform}
                            className="w-5 h-5 object-contain"
                          />
                        )}
                        <span className={`text-sm font-medium ${
                          isLuxTrip ? 'text-[#00CD52]' : 'text-gray-700'
                        }`}>
                          {row.platform}
                        </span>
                        {isLuxTrip && (
                          <span className="px-2 py-0.5 bg-[#00CD52] text-white text-[10px] font-bold rounded whitespace-nowrap min-w-fit">
                            {isZh ? '最佳价值' : 'BEST VALUE'}
                          </span>
                        )}
                      </div>
                      {/* Price */}
                      <span className={`font-bold text-lg leading-tight ${
                        isLuxTrip ? 'text-[#00CD52]' : 'text-gray-900'
                      }`}>
                        {row.totalPrice}
                      </span>
                      <span className="text-xs text-gray-500 mt-0.5">
                        {row.nightlyPrice}
                      </span>
                    </div>
                  </td>

                  {/* Promotions Column */}
                  <td className="px-4 py-4 align-middle">
                    <div className="flex flex-col gap-1">
                      {row.promotions && row.promotions.length > 0 ? (
                        row.promotions.map((promo, promoIndex) => (
                          <button
                            key={promoIndex}
                            onClick={() => openModal(promo.name, promo.description, promo.available_until)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-transparent border border-amber-300/60 text-amber-700 text-xs font-medium rounded transition-colors cursor-pointer hover:bg-amber-50/50 hover:border-amber-400 text-left w-fit"
                          >
                            <Zap className="w-3 h-3 text-amber-600 flex-shrink-0" />
                            <span className="whitespace-nowrap">{promo.name}</span>
                          </button>
                        ))
                      ) : row.platform?.toLowerCase() === 'official' || row.platform?.toLowerCase().includes('官网') ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-transparent border border-gray-200 text-gray-500 text-xs font-normal rounded w-fit">
                          <Info className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span>{isZh ? 'SNP / 会员积分政策' : 'SNP / Points Policy'}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">{isZh ? '—' : '—'}</span>
                      )}
                    </div>
                  </td>

                  {/* Perks Column */}
                  <td className="px-4 py-4 align-middle">
                    <div className="flex flex-col gap-1.5">
                      {/* Structured Perks - Clean green style with icons */}
                      {row.structuredPerks && row.structuredPerks.length > 0 ? (
                        row.structuredPerks.map((perk, perkIndex) => {
                          // Determine icon based on perk label
                          const getPerkIcon = (label: string) => {
                            const lowerLabel = label.toLowerCase();
                            if (lowerLabel.includes('breakfast') || lowerLabel.includes('早') || lowerLabel.includes('早餐')) {
                              return <Coffee className="w-3.5 h-3.5 text-[#00CD52] flex-shrink-0" />;
                            }
                            if (lowerLabel.includes('credit') || lowerLabel.includes('美金') || lowerLabel.includes('dollar') || lowerLabel.includes('$')) {
                              return <DollarSign className="w-3.5 h-3.5 text-[#00CD52] flex-shrink-0" />;
                            }
                            if (lowerLabel.includes('upgrade') || lowerLabel.includes('升房') || lowerLabel.includes('room')) {
                              return <TrendingUp className="w-3.5 h-3.5 text-[#00CD52] flex-shrink-0" />;
                            }
                            return <Sparkles className="w-3.5 h-3.5 text-[#00CD52] flex-shrink-0" />;
                          };
                          
                          return (
                            <button
                              key={perkIndex}
                              onClick={() => openModal(perk.label, perk.detail)}
                              className="inline-flex items-center gap-1.5 px-2 py-1 bg-transparent text-[#00CD52] text-xs font-medium rounded transition-colors cursor-pointer hover:bg-emerald-50/30 text-left w-fit group"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-[#00CD52] flex-shrink-0 group-hover:scale-125 transition-transform" />
                              {getPerkIcon(perk.label)}
                              <span className="whitespace-nowrap">{perk.label}</span>
                            </button>
                          );
                        })
                      ) : row.perks.perksSummary ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-transparent text-[#00CD52] text-xs font-medium rounded w-fit">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#00CD52] flex-shrink-0" />
                          <Sparkles className="w-3.5 h-3.5 text-[#00CD52] flex-shrink-0" />
                          <span>{row.perks.perksSummary}</span>
                        </div>
                      ) : (
                        <>
                          {/* Breakfast with coffee icon */}
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-transparent text-[#00CD52] text-xs font-medium rounded w-fit">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00CD52] flex-shrink-0" />
                            <Coffee className="w-3.5 h-3.5 text-[#00CD52] flex-shrink-0" />
                            <span>{breakfastText}</span>
                          </div>
                          
                          {/* Points with star icon */}
                          {row.perks.pointsAccumulatable && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-transparent text-[#00CD52] text-xs font-medium rounded w-fit">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#00CD52] flex-shrink-0" />
                              <Star className="w-3.5 h-3.5 fill-[#00CD52] text-[#00CD52] flex-shrink-0" strokeWidth={1.5} />
                              <span>{isZh ? '可累积积分' : 'Earns Points'}</span>
                            </div>
                          )}
                          
                          {/* VIP Benefits - Clean green style */}
                          {row.perks.vipBenefits && row.perks.vipBenefits.length > 0 && (
                            <>
                              {row.perks.vipBenefits.map((benefit, benefitIndex) => {
                                const getBenefitIcon = (benefitText: string) => {
                                  const lower = benefitText.toLowerCase();
                                  if (lower.includes('credit') || lower.includes('$') || lower.includes('dollar')) {
                                    return <DollarSign className="w-3.5 h-3.5 text-[#00CD52] flex-shrink-0" />;
                                  }
                                  if (lower.includes('upgrade') || lower.includes('room')) {
                                    return <TrendingUp className="w-3.5 h-3.5 text-[#00CD52] flex-shrink-0" />;
                                  }
                                  return <Sparkles className="w-3.5 h-3.5 text-[#00CD52] flex-shrink-0" />;
                                };
                                
                                return (
                                  <div
                                    key={benefitIndex}
                                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-transparent text-[#00CD52] text-xs font-medium rounded w-fit"
                                  >
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#00CD52] flex-shrink-0" />
                                    {getBenefitIcon(benefit)}
                                    <span className="whitespace-nowrap">{benefit}</span>
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </>
                      )}
                      
                      {/* Valued at tag - Subtle badge */}
                      {row.perksValue && (
                        <div className="mt-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#00CD52]/10 text-[#00CD52] text-[10px] font-semibold rounded border border-[#00CD52]/20">
                            <DollarSign className="w-3 h-3 flex-shrink-0" />
                            <span>{isZh ? '价值约' : 'Valued at'} {row.perksValue}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Policy Column */}
                  <td className="px-4 py-4 align-middle">
                    <div className="flex flex-col gap-2">
                      {/* Cancellation Policy with icon */}
                      <div className="flex items-center gap-2">
                        {cancellationType === 'free' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                        <div className="flex flex-col">
                          <span className={`text-xs font-medium whitespace-nowrap ${
                            cancellationType === 'free'
                              ? 'text-green-600'
                              : cancellationType === 'non_refundable'
                              ? 'text-red-600'
                              : 'text-orange-600'
                          }`}>
                            {cancellationType === 'free'
                              ? (isZh ? '免费取消' : 'Free Cancel')
                              : cancellationType === 'non_refundable'
                              ? (isZh ? '不可退' : 'Non-refundable')
                              : (isZh ? '有条件取消' : 'Conditional')}
                          </span>
                          {row.policy.cancellationDetails && (
                            <span className="text-[10px] text-gray-500 mt-0.5 whitespace-nowrap">
                              {row.policy.cancellationDetails}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Payment Method with card icon */}
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                        <span className="text-xs text-gray-600">
                          {row.policy.paymentPolicyText ||
                            (row.policy.paymentPolicy === 'online_payment'
                              ? (isZh ? '在线预付' : 'Prepay Online')
                              : row.policy.paymentPolicy === 'pay_at_hotel'
                              ? (isZh ? '到店付' : 'Pay at Hotel')
                              : row.policy.paymentPolicy === 'guaranteed_payment_on_arrival'
                              ? (isZh ? '担保到付' : 'Guarantee')
                              : (isZh ? '在线付/担保到付' : 'Prepay Online / Guarantee'))}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Action Column - Booking Link */}
                  <td className="px-4 py-4 align-middle">
                    {row.websiteUrl ? (
                      <a
                        href={row.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`hover:underline inline-flex items-center gap-1 text-xs font-medium transition-colors whitespace-nowrap ${
                          isLuxTrip ? 'text-[#00CD52] hover:text-[#00CD52]/80' : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        <span>{isZh ? '访问网站' : 'Visit Site'}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">{isZh ? '—' : '—'}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout - Responsive */}
      <div className="md:hidden space-y-4">
        {rows.map((row, index) => {
          const cancellationType = row.policy.cancellationPolicyType || getCancellationType(row.policy.cancellationPolicy);
          const breakfastText = row.perks.breakfast === 'daily_double'
            ? (isZh ? '每日双早' : 'Daily Double Breakfast')
            : row.perks.breakfast === 'included'
            ? (isZh ? '含早' : 'Breakfast Included')
            : (isZh ? '无早' : 'No Breakfast');
          
          const isLuxTrip = row.isBest || row.platform?.toLowerCase() === 'luxtrip';
          
          return (
            <div
              key={index}
              className={`bg-white border rounded-xl p-4 transition-all ${
                isLuxTrip 
                  ? 'border-l-4 border-l-[#00CD52] bg-emerald-50/20 shadow-sm' 
                  : 'border-gray-200'
              }`}
            >
              {/* Card Header - Platform & Price */}
              <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {row.platformLogo && (
                      <img 
                        src={row.platformLogo} 
                        alt={row.platform}
                        className="w-5 h-5 object-contain"
                      />
                    )}
                    <span className={`text-base font-medium ${
                      isLuxTrip ? 'text-[#00CD52]' : 'text-gray-700'
                    }`}>
                      {row.platform}
                    </span>
                    {isLuxTrip && (
                      <span className="px-2 py-0.5 bg-[#00CD52] text-white text-[10px] font-bold rounded whitespace-nowrap min-w-fit">
                        {isZh ? '最佳价值' : 'BEST VALUE'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-bold text-lg leading-tight ${
                      isLuxTrip ? 'text-[#00CD52]' : 'text-gray-900'
                    }`}>
                      {row.totalPrice}
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5">
                      {row.nightlyPrice}
                    </span>
                  </div>
                </div>
              </div>

              {/* Member Deals Section (Promotions) */}
              {(row.promotions && row.promotions.length > 0) || (row.platform?.toLowerCase() === 'official' || row.platform?.toLowerCase().includes('官网')) ? (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    {isZh ? '会员优惠' : 'MEMBER DEALS'}
                  </h4>
                  <div className="flex flex-col gap-1">
                    {row.promotions && row.promotions.length > 0 ? (
                      row.promotions.map((promo, promoIndex) => (
                        <button
                          key={promoIndex}
                          onClick={() => openModal(promo.name, promo.description, promo.available_until)}
                          className="inline-flex items-center gap-1.5 px-2 py-1 bg-transparent border border-amber-300/60 text-amber-700 text-xs font-medium rounded transition-colors cursor-pointer hover:bg-amber-50/50 hover:border-amber-400 text-left w-fit"
                        >
                          <Zap className="w-3 h-3 text-amber-600 flex-shrink-0" />
                          <span>{promo.name}</span>
                        </button>
                      ))
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-transparent border border-gray-200 text-gray-500 text-xs font-normal rounded w-fit">
                        <Info className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span>{isZh ? 'SNP / 会员积分政策' : 'SNP / Points Policy'}</span>
                      </span>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Exclusive Perks Section */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  {isZh ? '专属礼遇' : 'EXCLUSIVE PERKS'}
                </h4>
                <div className="flex flex-col gap-1.5">
                  {/* Structured Perks - Clean green style with icons */}
                  {row.structuredPerks && row.structuredPerks.length > 0 ? (
                    row.structuredPerks.map((perk, perkIndex) => {
                      const getPerkIcon = (label: string) => {
                        const lowerLabel = label.toLowerCase();
                        if (lowerLabel.includes('breakfast') || lowerLabel.includes('早') || lowerLabel.includes('早餐')) {
                          return <Coffee className="w-3.5 h-3.5 text-[#00CD52] flex-shrink-0" />;
                        }
                        if (lowerLabel.includes('credit') || lowerLabel.includes('美金') || lowerLabel.includes('dollar') || lowerLabel.includes('$')) {
                          return <DollarSign className="w-3.5 h-3.5 text-[#00CD52] flex-shrink-0" />;
                        }
                        if (lowerLabel.includes('upgrade') || lowerLabel.includes('升房') || lowerLabel.includes('room')) {
                          return <TrendingUp className="w-3.5 h-3.5 text-[#00CD52] flex-shrink-0" />;
                        }
                        return <Sparkles className="w-3.5 h-3.5 text-[#00CD52] flex-shrink-0" />;
                      };
                      
                      return (
                        <button
                          key={perkIndex}
                          onClick={() => openModal(perk.label, perk.detail)}
                          className="inline-flex items-center gap-1.5 px-2 py-1 bg-transparent text-[#00CD52] text-xs font-medium rounded transition-colors cursor-pointer hover:bg-emerald-50/30 text-left w-fit group"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-[#00CD52] flex-shrink-0 group-hover:scale-125 transition-transform" />
                          {getPerkIcon(perk.label)}
                          <span>{perk.label}</span>
                        </button>
                      );
                    })
                  ) : row.perks.perksSummary ? (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-transparent text-[#00CD52] text-xs font-medium rounded w-fit">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00CD52] flex-shrink-0" />
                      <Sparkles className="w-3.5 h-3.5 text-[#00CD52] flex-shrink-0" />
                      <span>{row.perks.perksSummary}</span>
                    </div>
                  ) : (
                    <>
                      {/* Breakfast with coffee icon */}
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-transparent text-[#00CD52] text-xs font-medium rounded w-fit">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00CD52] flex-shrink-0" />
                        <Coffee className="w-3.5 h-3.5 text-[#00CD52] flex-shrink-0" />
                        <span>{breakfastText}</span>
                      </div>
                      
                      {/* Points with star icon */}
                      {row.perks.pointsAccumulatable && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-transparent text-[#00CD52] text-xs font-medium rounded w-fit">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#00CD52] flex-shrink-0" />
                          <Star className="w-3.5 h-3.5 fill-[#00CD52] text-[#00CD52] flex-shrink-0" strokeWidth={1.5} />
                          <span>{isZh ? '可累积积分' : 'Earns Points'}</span>
                        </div>
                      )}
                      
                      {/* VIP Benefits - Clean green style */}
                      {row.perks.vipBenefits && row.perks.vipBenefits.length > 0 && (
                        <>
                          {row.perks.vipBenefits.map((benefit, benefitIndex) => {
                            const getBenefitIcon = (benefitText: string) => {
                              const lower = benefitText.toLowerCase();
                              if (lower.includes('credit') || lower.includes('$') || lower.includes('dollar')) {
                                return <DollarSign className="w-3.5 h-3.5 text-[#00CD52] flex-shrink-0" />;
                              }
                              if (lower.includes('upgrade') || lower.includes('room')) {
                                return <TrendingUp className="w-3.5 h-3.5 text-[#00CD52] flex-shrink-0" />;
                              }
                              return <Sparkles className="w-3.5 h-3.5 text-[#00CD52] flex-shrink-0" />;
                            };
                            
                            return (
                              <div
                                key={benefitIndex}
                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-transparent text-[#00CD52] text-xs font-medium rounded w-fit"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00CD52] flex-shrink-0" />
                                {getBenefitIcon(benefit)}
                                <span>{benefit}</span>
                              </div>
                            );
                          })}
                        </>
                      )}
                      
                      {/* Negative Perks - Red style */}
                      {row.perks.negativePerks && row.perks.negativePerks.length > 0 && (
                        <>
                          {row.perks.negativePerks.map((perk, perkIndex) => (
                            <div
                              key={perkIndex}
                              className="inline-flex items-center gap-1.5 px-2 py-1 bg-transparent border border-red-200 text-red-600 text-xs font-medium rounded w-fit"
                            >
                              <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                              <span>{perk}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                  
                  {/* Valued at tag - Subtle badge */}
                  {row.perksValue && (
                    <div className="mt-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#00CD52]/10 text-[#00CD52] text-[10px] font-semibold rounded border border-[#00CD52]/20">
                        <DollarSign className="w-3 h-3 flex-shrink-0" />
                        <span>{isZh ? '价值约' : 'Valued at'} {row.perksValue}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Policy Section */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  {isZh ? '政策' : 'POLICY'}
                </h4>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {cancellationType === 'free' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <div className="flex flex-col">
                      <span className={`text-xs font-medium whitespace-nowrap ${
                        cancellationType === 'free'
                          ? 'text-green-600'
                          : cancellationType === 'non_refundable'
                          ? 'text-red-600'
                          : 'text-orange-600'
                      }`}>
                        {cancellationType === 'free'
                          ? (isZh ? '免费取消' : 'Free Cancel')
                          : cancellationType === 'non_refundable'
                          ? (isZh ? '不可退' : 'Non-refundable')
                          : (isZh ? '有条件取消' : 'Conditional')}
                      </span>
                      {row.policy.cancellationDetails && (
                        <span className="text-[10px] text-gray-500 mt-0.5 whitespace-nowrap">
                          {row.policy.cancellationDetails}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <span className="text-xs text-gray-600">
                      {row.policy.paymentPolicyText ||
                        (row.policy.paymentPolicy === 'online_payment'
                          ? (isZh ? '在线预付' : 'Prepay Online')
                          : row.policy.paymentPolicy === 'pay_at_hotel'
                          ? (isZh ? '到店付' : 'Pay at Hotel')
                          : row.policy.paymentPolicy === 'guaranteed_payment_on_arrival'
                          ? (isZh ? '担保到付' : 'Guarantee')
                          : (isZh ? '在线付/担保到付' : 'Prepay Online / Guarantee'))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div>
                {row.websiteUrl ? (
                  <a
                    href={row.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      isLuxTrip 
                        ? 'bg-[#00CD52] text-white hover:bg-[#00CD52]/90' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{isZh ? '访问网站' : 'Visit Site'}</span>
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  </a>
                ) : (
                  <div className="w-full px-4 py-2.5 bg-gray-50 text-gray-400 text-xs font-medium rounded-lg text-center border border-gray-200">
                    {isZh ? '—' : '—'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Follow-up Action Chips */}
      {followUpChips && followUpChips.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex flex-wrap gap-2">
            {followUpChips.map((chip, index) => (
              <button
                key={index}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}
      </div>
    </>
  );
}
