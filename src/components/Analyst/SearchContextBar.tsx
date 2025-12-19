/**
 * SearchContextBar Component
 * Sticky search context bar with collapsed/expanded states
 * Similar to Ctrip/Booking.com hotel list pages
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Hotel, Users, Bed, Heart } from 'lucide-react';
import AnalystDatePicker from './AnalystDatePicker';

export interface SearchContext {
  hotelName: string;
  checkIn: Date | null;
  checkOut: Date | null;
  rooms: number;
  adults: number;
  children: number;
  roomType: string;
  preferences: string;
  isConfirmed: boolean;
}

interface SearchContextBarProps {
  context: SearchContext;
  onUpdate: (context: SearchContext) => void;
  locale?: string;
}

// Counter Input Component - Compact
function CounterInput({
  label,
  value,
  min = 1,
  max = 20,
  onIncrement,
  onDecrement,
  locale = 'en',
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onIncrement: () => void;
  onDecrement: () => void;
  locale?: string;
}) {
  const isZh = locale === 'zh';
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onDecrement}
          disabled={value <= min}
          className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="text-xs text-gray-600">−</span>
        </button>
        <span className="w-6 text-center text-xs font-medium text-gray-900">{value}</span>
        <button
          type="button"
          onClick={onIncrement}
          disabled={value >= max}
          className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="text-xs text-gray-600">+</span>
        </button>
      </div>
    </div>
  );
}

export default function SearchContextBar({
  context,
  onUpdate,
  locale = 'en',
}: SearchContextBarProps) {
  const [expanded, setExpanded] = useState(!context.isConfirmed);
  const [draft, setDraft] = useState<SearchContext>(context);
  const isZh = locale === 'zh';

  // Track if we're updating from user interaction
  const isUserUpdateRef = useRef(false);
  
  // Helper function to update draft from user interaction
  const updateDraft = (updates: Partial<SearchContext>) => {
    isUserUpdateRef.current = true;
    setDraft({ ...draft, ...updates });
  };
  
  // Sync draft with context when context changes externally
  // Use ref to track if update is from user interaction to avoid overwriting
  useEffect(() => {
    // Skip sync if this is from user interaction
    if (isUserUpdateRef.current) {
      isUserUpdateRef.current = false;
      return;
    }
    
    // Compare dates by value to detect real changes
    const datesChanged = 
      draft.checkIn?.getTime() !== context.checkIn?.getTime() ||
      draft.checkOut?.getTime() !== context.checkOut?.getTime();
    
    const otherFieldsChanged = 
      draft.hotelName !== context.hotelName ||
      draft.rooms !== context.rooms ||
      draft.adults !== context.adults ||
      draft.children !== context.children ||
      draft.roomType !== context.roomType ||
      draft.preferences !== context.preferences ||
      draft.isConfirmed !== context.isConfirmed;
    
    // Only update draft if context actually changed
    if (datesChanged || otherFieldsChanged) {
      setDraft(context);
    }
    
    // Auto-collapse if context is confirmed
    if (context.isConfirmed) {
      setExpanded(false);
    }
  }, [context]);

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
      month: 'short',
      day: 'numeric',
    });
  };

  const nights = calculateNights(draft.checkIn, draft.checkOut);
  const totalGuests = draft.adults + draft.children;

  // Handle update button click
  const handleUpdate = () => {
    const updatedContext: SearchContext = {
      ...draft,
      // Preserve hotel name from original context (don't allow editing)
      hotelName: context.hotelName || draft.hotelName,
      isConfirmed: true,
    };
    onUpdate(updatedContext);
    setExpanded(false);
  };

  // Handle toggle expand/collapse
  const handleToggle = () => {
    setExpanded(!expanded);
  };

  return (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm md:shadow-md" id="search-criteria-bar">
      {/* State A: Collapsed Summary View */}
      {!expanded && (
        <button
          onClick={handleToggle}
          className="w-full px-3 md:px-4 py-2.5 md:py-3 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
              {draft.hotelName && (
                <>
                  <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                    <Hotel className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-xs md:text-sm font-medium text-gray-900 truncate">
                      {draft.hotelName}
                    </span>
                  </div>
                  <span className="text-gray-300 hidden sm:inline">|</span>
                </>
              )}
              {draft.checkIn && draft.checkOut && (
                <>
                  <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-gray-700">
                    <span className="hidden sm:inline">{formatDateShort(draft.checkIn)}</span>
                    <span className="sm:hidden">{formatDateShort(draft.checkIn).replace(/\s/g, '')}</span>
                    <span className="hidden sm:inline">—</span>
                    <span className="sm:hidden">-</span>
                    <span className="hidden sm:inline">{formatDateShort(draft.checkOut)}</span>
                    <span className="sm:hidden">{formatDateShort(draft.checkOut).replace(/\s/g, '')}</span>
                    {nights > 0 && (
                      <span className="text-gray-500">({nights} {isZh ? '晚' : 'N'})</span>
                    )}
                  </div>
                  <span className="text-gray-300 hidden sm:inline">|</span>
                </>
              )}
              <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-700">
                <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
                <span className="hidden sm:inline">
                  {draft.rooms} {isZh ? '间客房' : draft.rooms === 1 ? 'Room' : 'Rooms'}, {totalGuests} {isZh ? '位客人' : 'Guests'}
                </span>
                <span className="sm:hidden">
                  {draft.rooms}{isZh ? '间' : 'R'}, {totalGuests}{isZh ? '人' : 'G'}
                </span>
              </div>
              {draft.roomType && draft.roomType !== 'Basic Room' && (
                <>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Bed className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{draft.roomType}</span>
                  </div>
                </>
              )}
            </div>
            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
          </div>
        </button>
      )}

      {/* State B: Expanded Edit View */}
      {expanded && (
        <div className="px-4 py-4 border-t border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {isZh ? '搜索条件' : 'Search Criteria'}
              </h3>
              <button
                onClick={handleToggle}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronUp className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Range */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isZh ? '入住日期 / 退房日期' : 'Check-in / Check-out'}
                </label>
                <AnalystDatePicker
                  checkIn={draft.checkIn}
                  checkOut={draft.checkOut}
                  onDatesChange={(checkIn, checkOut) => {
                    updateDraft({ checkIn, checkOut });
                  }}
                  locale={locale}
                />
              </div>

              {/* Rooms & Guests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isZh ? '客房及宾客' : 'Rooms & Guests'}
                </label>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <CounterInput
                    label={isZh ? '客房数量' : 'Number of Rooms'}
                    value={draft.rooms}
                    min={1}
                    max={10}
                    onIncrement={() => updateDraft({ rooms: Math.min(10, draft.rooms + 1) })}
                    onDecrement={() => updateDraft({ rooms: Math.max(1, draft.rooms - 1) })}
                    locale={locale}
                  />
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">{isZh ? '每间客房' : 'Per Room'}</p>
                    <CounterInput
                      label={isZh ? '成人' : 'Adults'}
                      value={draft.adults}
                      min={1}
                      onIncrement={() => updateDraft({ adults: draft.adults + 1 })}
                      onDecrement={() => updateDraft({ adults: Math.max(1, draft.adults - 1) })}
                      locale={locale}
                    />
                    <CounterInput
                      label={isZh ? '儿童' : 'Children'}
                      value={draft.children}
                      min={0}
                      onIncrement={() => updateDraft({ children: draft.children + 1 })}
                      onDecrement={() => updateDraft({ children: Math.max(0, draft.children - 1) })}
                      locale={locale}
                    />
                  </div>
                </div>
              </div>

              {/* Room Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isZh ? '房型' : 'Room Type'}
                </label>
                <select
                  value={draft.roomType}
                  onChange={(e) => updateDraft({ roomType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="Basic Room">{isZh ? '基础房型' : 'Basic Room'}</option>
                  <option value="Deluxe Room">{isZh ? '豪华房' : 'Deluxe Room'}</option>
                  <option value="Suite">{isZh ? '套房' : 'Suite'}</option>
                  <option value="Presidential Suite">{isZh ? '总统套房' : 'Presidential Suite'}</option>
                </select>
              </div>

              {/* Preferences */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isZh ? '个人偏好' : 'Preferences'}
                </label>
                <input
                  type="text"
                  value={draft.preferences}
                  onChange={(e) => updateDraft({ preferences: e.target.value })}
                  placeholder={isZh ? '例如：早餐、海景、高层等' : 'e.g., Breakfast, Sea view, High floor, etc.'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Update Button */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={handleUpdate}
                disabled={!draft.hotelName.trim() || !draft.checkIn || !draft.checkOut}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isZh ? '更新并分析' : 'Update & Analyze'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
