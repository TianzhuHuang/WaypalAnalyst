/**
 * FloatingCriteriaBar Component
 * Compact criteria bar that appears near the input box
 * Will animate to become the sticky bar at the top
 */

'use client';

import { Calendar, Users } from 'lucide-react';
import { SearchContext } from './SearchContextBar';

interface FloatingCriteriaBarProps {
  context: SearchContext;
  onClick: () => void;
  locale?: string;
}

export default function FloatingCriteriaBar({
  context,
  onClick,
  locale = 'en',
}: FloatingCriteriaBarProps) {
  const isZh = locale === 'zh';

  // Calculate nights
  const calculateNights = (checkIn: Date | null, checkOut: Date | null): number => {
    if (!checkIn || !checkOut) return 0;
    const ci = new Date(checkIn);
    ci.setHours(0, 0, 0, 0);
    const co = new Date(checkOut);
    co.setHours(0, 0, 0, 0);
    if (co <= ci) return 0;
    return Math.ceil((co.getTime() - ci.getTime()) / (24 * 60 * 60 * 1000));
  };

  // Format date for summary
  const formatDateShort = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
      month: 'numeric',
      day: 'numeric',
    });
  };

  const nights = calculateNights(context.checkIn, context.checkOut);
  const totalGuests = context.adults + context.children;

  // Show default hint if dates are default
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 4);

  const isDefaultDates =
    context.checkIn?.getTime() === tomorrow.getTime() &&
    context.checkOut?.getTime() === dayAfter.getTime();

  return (
    <button
      onClick={onClick}
      className="w-full bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 px-4 py-3 text-left"
    >
      <div className="flex items-center gap-3">
        {context.checkIn && context.checkOut && (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>
                {formatDateShort(context.checkIn)} - {formatDateShort(context.checkOut)}
              </span>
              {nights > 0 && (
                <span className="text-gray-500">
                  ({nights} {isZh ? '晚' : 'Night'}{nights > 1 ? (isZh ? '' : 's') : ''})
                </span>
              )}
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
          </>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Users className="w-4 h-4 text-gray-400" />
          <span>
            {context.rooms} {isZh ? '间客房' : context.rooms === 1 ? 'Room' : 'Rooms'}, {totalGuests} {isZh ? '位客人' : totalGuests === 1 ? 'Guest' : 'Guests'}
          </span>
        </div>
        {isDefaultDates && (
          <>
            <div className="w-px h-4 bg-gray-300"></div>
            <span className="text-xs text-indigo-600 italic">
              {isZh ? '默认日期，点击修改' : 'Default dates, click to edit'}
            </span>
          </>
        )}
      </div>
    </button>
  );
}


