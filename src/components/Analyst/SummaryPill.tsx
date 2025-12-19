'use client';

import { SearchContext } from './SearchContextBar';
import { motion, AnimatePresence } from 'framer-motion';
import AnalystDatePicker from './AnalystDatePicker';

interface SummaryPillProps {
  context: SearchContext;
  onUpdate: (context: SearchContext) => void;
  locale?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default function SummaryPill({
  context,
  onUpdate,
  locale = 'en',
  isExpanded,
  onToggleExpand,
}: SummaryPillProps) {
  const isZh = locale === 'zh';

  const formatDateShort = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateNights = (checkIn: Date | null, checkOut: Date | null): number => {
    if (!checkIn || !checkOut) return 0;
    const ci = new Date(checkIn);
    ci.setHours(0, 0, 0, 0);
    const co = new Date(checkOut);
    co.setHours(0, 0, 0, 0);
    if (co <= ci) return 0;
    return Math.ceil((co.getTime() - ci.getTime()) / (24 * 60 * 60 * 1000));
  };

  const nights = calculateNights(context.checkIn, context.checkOut);
  const totalGuests = context.adults + context.children;

  if (!context.hotelName && !context.isConfirmed) {
    return null;
  }

  return (
    <div className="mb-2">
      {/* Compact Summary Pill */}
      <button
        onClick={onToggleExpand}
        className="w-full px-3 py-2 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2 flex-wrap text-sm text-gray-700">
          {context.hotelName && (
            <span className="flex items-center gap-1 font-medium">
              🏨 {context.hotelName}
            </span>
          )}
          {context.checkIn && context.checkOut && (
            <span className="flex items-center gap-1">
              📅 {formatDateShort(context.checkIn)} - {formatDateShort(context.checkOut)}
              {nights > 0 && (
                <span className="text-gray-500">
                  ({nights} {isZh ? '晚' : nights === 1 ? 'Night' : 'Nights'})
                </span>
              )}
            </span>
          )}
          <span className="flex items-center gap-1">
            👥 {context.rooms} {isZh ? '间' : context.rooms === 1 ? 'Room' : 'Rooms'}, {totalGuests} {isZh ? '人' : totalGuests === 1 ? 'Guest' : 'Guests'}
          </span>
        </div>
        <span className="text-xs text-gray-500 ml-2">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {/* Expandable Edit Form */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 overflow-hidden"
          >
            <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-3">
              {/* Date Range */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  {locale === 'zh' ? '入住日期 / 退房日期' : 'Check-in / Check-out'}
                </label>
                <AnalystDatePicker
                  checkIn={context.checkIn}
                  checkOut={context.checkOut}
                  onDatesChange={(checkIn, checkOut) => {
                    const newCheckIn = checkIn ? new Date(checkIn.getTime()) : null;
                    const newCheckOut = checkOut ? new Date(checkOut.getTime()) : null;
                    
                    if (newCheckIn) {
                      newCheckIn.setHours(0, 0, 0, 0);
                    }
                    if (newCheckOut) {
                      newCheckOut.setHours(0, 0, 0, 0);
                    }
                    
                    onUpdate({
                      ...context,
                      checkIn: newCheckIn,
                      checkOut: newCheckOut,
                    });
                  }}
                  locale={locale}
                />
              </div>

              {/* Rooms & Guests */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  {locale === 'zh' ? '客房及宾客' : 'Rooms & Guests'}
                </label>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs font-medium text-gray-700">
                      {locale === 'zh' ? '客房数量' : 'Number of Rooms'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onUpdate({
                            ...context,
                            rooms: Math.max(1, context.rooms - 1),
                          });
                        }}
                        disabled={context.rooms <= 1}
                        className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-xs font-medium text-gray-900">
                        {context.rooms}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdate({
                            ...context,
                            rooms: Math.min(10, context.rooms + 1),
                          });
                        }}
                        disabled={context.rooms >= 10}
                        className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">{locale === 'zh' ? '每间客房' : 'Per Room'}</p>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs font-medium text-gray-700">
                        {locale === 'zh' ? '成人' : 'Adults'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onUpdate({
                              ...context,
                              adults: Math.max(1, context.adults - 1),
                            });
                          }}
                          disabled={context.adults <= 1}
                          className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs font-medium text-gray-900">
                          {context.adults}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdate({
                              ...context,
                              adults: context.adults + 1,
                            });
                          }}
                          className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs font-medium text-gray-700">
                        {locale === 'zh' ? '儿童' : 'Children'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onUpdate({
                              ...context,
                              children: Math.max(0, context.children - 1),
                            });
                          }}
                          disabled={context.children <= 0}
                          className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs font-medium text-gray-900">
                          {context.children}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdate({
                              ...context,
                              children: context.children + 1,
                            });
                          }}
                          className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

