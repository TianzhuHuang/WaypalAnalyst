'use client';

import { useState } from 'react';
import { MapPin, Calendar, CheckCircle2, XCircle, Info, ExternalLink, Star, CreditCard, Utensils, Bed, ChevronDown, ShieldCheck, X, Gift, Sparkles } from 'lucide-react';
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
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
              <h3 className="text-xl font-bold text-gray-900 mb-3 pr-8">{title}</h3>
              {description && (
                <p className="text-sm text-gray-700 mb-4 leading-relaxed">{description}</p>
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
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">
                {isZh ? '预订平台 / 价格' : 'PLATFORM / PRICE'}
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[180px]">
                {isZh ? '优惠政策' : 'PROMOTIONS'}
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[220px]">
                {isZh ? '专属礼遇' : 'PERKS'}
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">
                {isZh ? '政策' : 'POLICY'}
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px]">
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
              
              return (
                <tr
                  key={index}
                  className={`border-b border-gray-200 ${
                    row.isBest || row.platform?.toLowerCase() === 'luxtrip'
                      ? 'bg-green-50/30 border-l-4 border-l-green-500'
                      : 'bg-white'
                  }`}
                >
                  {/* Platform & Price Column */}
                  <td className="px-6 py-5">
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
                          row.isBest || row.platform?.toLowerCase() === 'luxtrip' ? 'text-green-600' : 'text-gray-700'
                        }`}>
                          {row.platform}
                        </span>
                        {(row.isBest || row.platform?.toLowerCase() === 'luxtrip') && (
                          <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded">
                            {isZh ? '最佳价值' : 'BEST VALUE'}
                          </span>
                        )}
                      </div>
                      {/* Price */}
                      <span className={`font-bold text-2xl leading-tight ${
                        row.isBest || row.platform?.toLowerCase() === 'luxtrip' ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        {row.totalPrice}
                      </span>
                      <span className="text-sm text-gray-500 mt-1">
                        {row.nightlyPrice}
                      </span>
                    </div>
                  </td>

                  {/* Promotions Column */}
                  <td className="px-6 py-5">
                    <div className="space-y-2">
                      {row.promotions && row.promotions.length > 0 ? (
                        row.promotions.map((promo, promoIndex) => (
                          <button
                            key={promoIndex}
                            onClick={() => openModal(promo.name, promo.description, promo.available_until)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                          >
                            <Gift className="w-3 h-3" />
                            <span>{promo.name}</span>
                          </button>
                        ))
                      ) : row.platform?.toLowerCase() === 'official' || row.platform?.toLowerCase().includes('官网') ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg">
                          <Star className="w-3 h-3" />
                          <span>{isZh ? 'SNP / 会员积分政策' : 'SNP / Points Policy'}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">{isZh ? '无' : 'None'}</span>
                      )}
                    </div>
                  </td>

                  {/* Perks Column */}
                  <td className="px-6 py-5">
                    <div className="space-y-2">
                      {/* Structured Perks - Green badges */}
                      {row.structuredPerks && row.structuredPerks.length > 0 ? (
                        <div className="space-y-1.5">
                          {row.structuredPerks.map((perk, perkIndex) => (
                            <button
                              key={perkIndex}
                              onClick={() => openModal(perk.label, perk.detail)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-lg transition-colors cursor-pointer w-full text-left"
                            >
                              <Sparkles className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{perk.label}</span>
                            </button>
                          ))}
                        </div>
                      ) : row.perks.perksSummary ? (
                        <span className="text-xs text-emerald-700">{row.perks.perksSummary}</span>
                      ) : (
                        <>
                          {/* Breakfast with fork/spoon icon */}
                          <div className="flex items-center gap-2">
                            <ForkSpoonIconSimple className="w-4 h-4" />
                            <span className="text-sm text-gray-900 font-medium">
                              {breakfastText}
                            </span>
                          </div>
                          
                          {/* Points with star icon */}
                          <div className="flex items-center gap-2">
                            {row.perks.pointsAccumulatable ? (
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" strokeWidth={1.5} />
                            ) : (
                              <Star className="w-4 h-4 text-gray-300" fill="none" strokeWidth={1.5} />
                            )}
                            <span className="text-sm text-gray-900">
                              {row.perks.pointsAccumulatable
                                ? (isZh ? '可累积积分' : 'Earns Points')
                                : (isZh ? '不可累积积分' : 'No Points')}
                            </span>
                          </div>
                          
                          {/* VIP Benefits - Blue bullets */}
                          {row.perks.vipBenefits && row.perks.vipBenefits.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              {row.perks.vipBenefits.map((benefit, benefitIndex) => (
                                <div key={benefitIndex} className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                                  <span className="text-xs text-green-600">{benefit}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Valued at tag */}
                      {row.perksValue && (
                        <div className="mt-3">
                          <span className="inline-block px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded">
                            {isZh ? '价值约' : 'Valued at'} {row.perksValue}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Policy Column */}
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-2">
                      {/* Cancellation Policy with icon */}
                      <div className="flex items-center gap-2">
                        {cancellationType === 'free' ? (
                          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium ${
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
                            <span className="text-xs text-gray-500 mt-0.5">
                              {row.policy.cancellationDetails}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Payment Method with card icon */}
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        <span className="text-sm text-gray-700">
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
                  <td className="px-6 py-5">
                    {row.websiteUrl ? (
                      <a
                        href={row.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-700 hover:underline inline-flex items-center gap-1 text-sm"
                      >
                        <span>{isZh ? '访问网站' : 'Visit Site'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400">{isZh ? '暂无链接' : 'No Link'}</span>
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
          
          return (
            <div
              key={index}
              className={`bg-white border-2 rounded-xl p-4 ${
                row.isBest || row.platform?.toLowerCase() === 'luxtrip' ? 'border-green-500 shadow-lg' : 'border-gray-200'
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
                    <span className={`text-base font-semibold ${
                      row.isBest || row.platform?.toLowerCase() === 'luxtrip' ? 'text-green-600' : 'text-gray-700'
                    }`}>
                      {row.platform}
                    </span>
                    {(row.isBest || row.platform?.toLowerCase() === 'luxtrip') && (
                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded">
                        {isZh ? '最佳价值' : 'BEST VALUE'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-bold text-2xl leading-tight ${
                      row.isBest || row.platform?.toLowerCase() === 'luxtrip' ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {row.totalPrice}
                    </span>
                    <span className="text-sm text-gray-500 mt-1">
                      {row.nightlyPrice}
                    </span>
                  </div>
                </div>
              </div>

              {/* Promotions Section */}
              {row.promotions && row.promotions.length > 0 && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                    {isZh ? '优惠政策' : 'PROMOTIONS'}
                  </h4>
                  <div className="space-y-2">
                    {row.promotions.map((promo, promoIndex) => (
                      <button
                        key={promoIndex}
                        onClick={() => openModal(promo.name, promo.description, promo.available_until)}
                        className="w-full inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 text-xs font-medium rounded-lg transition-colors cursor-pointer text-left"
                      >
                        <Gift className="w-3 h-3 flex-shrink-0" />
                        <span className="flex-1">{promo.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Perks Section */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  {isZh ? '专属礼遇' : 'PERKS'}
                </h4>
                <div className="space-y-2">
                  {/* Structured Perks - Green badges */}
                  {row.structuredPerks && row.structuredPerks.length > 0 ? (
                    <div className="space-y-1.5">
                      {row.structuredPerks.map((perk, perkIndex) => (
                        <button
                          key={perkIndex}
                          onClick={() => openModal(perk.label, perk.detail)}
                          className="w-full inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-lg transition-colors cursor-pointer text-left"
                        >
                          <Sparkles className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{perk.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : row.perks.perksSummary ? (
                    <span className="text-xs text-emerald-700">{row.perks.perksSummary}</span>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <ForkSpoonIconSimple className="w-4 h-4" />
                        <span className="text-sm text-gray-900 font-medium">
                          {breakfastText}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {row.perks.pointsAccumulatable ? (
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" strokeWidth={1.5} />
                        ) : (
                          <Star className="w-4 h-4 text-gray-300" fill="none" strokeWidth={1.5} />
                        )}
                        <span className="text-sm text-gray-900">
                          {row.perks.pointsAccumulatable
                            ? (isZh ? '可累积积分' : 'Earns Points')
                            : (isZh ? '不可累积积分' : 'No Points')}
                        </span>
                      </div>
                      {row.perks.vipBenefits && row.perks.vipBenefits.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {row.perks.vipBenefits.map((benefit, benefitIndex) => (
                            <div key={benefitIndex} className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                              <span className="text-xs text-green-600">{benefit}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {row.perks.negativePerks && row.perks.negativePerks.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {row.perks.negativePerks.map((perk, perkIndex) => (
                            <div key={perkIndex} className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                              <span className="text-xs text-red-600">{perk}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {row.perksValue && (
                    <div className="mt-3">
                      <span className="inline-block px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded">
                        {isZh ? '价值约' : 'Valued at'} {row.perksValue}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Policy Section */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  {isZh ? '政策' : 'POLICY'}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {cancellationType === 'free' ? (
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium ${
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
                        <span className="text-xs text-gray-500 mt-0.5">
                          {row.policy.cancellationDetails}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
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
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <span>{isZh ? '访问网站' : 'Visit Site'}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <div className="w-full px-4 py-3 bg-gray-100 text-gray-400 text-sm font-medium rounded-lg text-center">
                    {isZh ? '暂无链接' : 'No Link'}
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
