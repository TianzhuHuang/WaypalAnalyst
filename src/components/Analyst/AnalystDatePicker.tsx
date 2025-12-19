/**
 * AnalystDatePicker Component
 * OTA-style date picker with strict state machine logic
 * State Machine:
 * - S1 (Empty): First click sets checkIn, checkOut = null
 * - S2 (CI Selected): If click <= checkIn, reset checkIn; if > checkIn, set checkOut
 * - S3 (Both Selected): Next click resets to S1
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface AnalystDatePickerProps {
  checkIn: Date | null;
  checkOut: Date | null;
  onDatesChange: (checkIn: Date | null, checkOut: Date | null) => void;
  locale?: string;
  minDate?: Date;
}

export default function AnalystDatePicker({
  checkIn,
  checkOut,
  onDatesChange,
  locale = 'en',
  minDate = new Date(),
}: AnalystDatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const isZh = locale === 'zh';


  // Get today's date at midnight for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Normalize date to midnight for accurate comparison
  const normalizeDate = (date: Date): Date => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  // Calculate nights between two dates
  const calculateNights = (ci: Date | null, co: Date | null): number => {
    if (!ci || !co) return 0;
    const ciNorm = normalizeDate(ci);
    const coNorm = normalizeDate(co);
    if (coNorm <= ciNorm) return 0;
    return Math.ceil((coNorm.getTime() - ciNorm.getTime()) / (24 * 60 * 60 * 1000));
  };

  // OTA-style state machine for date selection (S1/S2/S3)
  // S1: Empty - First click sets checkIn
  // S2: CI Selected - If click <= checkIn, reset checkIn; if > checkIn, set checkOut
  // S3: Both Selected - Next click resets to S1
  const handleDateChange = (dates: [Date | null, Date | null] | Date | null) => {
    if (!Array.isArray(dates)) {
      return;
    }

    const [newStart, newEnd] = dates;
    
    // Block past dates
    if (newStart && normalizeDate(newStart) < today) {
      return;
    }
    if (newEnd && normalizeDate(newEnd) < today) {
      return;
    }

    // Get current state
    const currentCI = checkIn ? normalizeDate(checkIn) : null;
    const currentCO = checkOut ? normalizeDate(checkOut) : null;
    
    // Create new Date objects
    let finalCI: Date | null = newStart ? new Date(newStart.getTime()) : null;
    let finalCO: Date | null = newEnd ? new Date(newEnd.getTime()) : null;

    // Normalize dates to midnight
    if (finalCI) {
      finalCI.setHours(0, 0, 0, 0);
    }
    if (finalCO) {
      finalCO.setHours(0, 0, 0, 0);
    }

    // State Machine Logic
    if (currentCI && currentCO) {
      // S3: Both dates selected - next click resets to S1 (only new checkIn)
      if (finalCI && !finalCO) {
        // User clicked a new date - reset to that date only
        finalCI = finalCI;
        finalCO = null;
      } else if (finalCI && finalCO) {
        // Range selected - validate
        const ciNorm = normalizeDate(finalCI);
        const coNorm = normalizeDate(finalCO);
        if (coNorm <= ciNorm) {
          // Invalid range - reset to checkIn only
          finalCO = null;
        }
      }
    } else if (currentCI && !currentCO) {
      // S2: Only checkIn selected
      if (finalCI && finalCO) {
        // Range completed
        const ciNorm = normalizeDate(finalCI);
        const coNorm = normalizeDate(finalCO);
        if (coNorm > ciNorm) {
          // Valid range
          finalCI = finalCI;
          finalCO = finalCO;
        } else {
          // Invalid range (checkOut <= checkIn) - reset checkIn
          finalCI = finalCI;
          finalCO = null;
        }
      } else if (finalCI && !finalCO) {
        // User clicked a date <= current checkIn - reset checkIn
        const newStartNorm = normalizeDate(finalCI);
        if (newStartNorm <= currentCI) {
          finalCI = finalCI;
          finalCO = null;
        }
      }
    } else {
      // S1: No dates selected - first click sets checkIn
      finalCI = finalCI;
      finalCO = finalCO; // Will be null on first click
    }

    // Final validation - ensure check-out is strictly after check-in (prevent 0 nights)
    if (finalCI && finalCO) {
      const ciNorm = normalizeDate(finalCI);
      const coNorm = normalizeDate(finalCO);
      if (coNorm <= ciNorm) {
        // Prevent 0 or negative nights
        finalCO = null;
      }
    }
    
    // Always notify parent - even if only checkIn is set
    onDatesChange(finalCI, finalCO);
  };

  // Format date for display - ensure correct date object
  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    // Ensure we have a valid Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    // Verify the date is valid
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    return dateObj.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showPicker &&
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target as Node)
      ) {
        const target = event.target as HTMLElement;
        const isDatePickerElement = target.closest('.react-datepicker');
        if (!isDatePickerElement) {
          setShowPicker(false);
        }
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPicker]);

  // Detect mobile device for responsive layout
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const nights = calculateNights(checkIn, checkOut);

  return (
    <div className="relative">
      {/* Date Display Button - Collapsed State */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors w-full"
      >
        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-gray-500">{isZh ? '入住' : 'Check-in'}</span>
            <span className="text-sm font-medium text-gray-900 truncate">
              {formatDate(checkIn)}
            </span>
          </div>
          <div className="w-px h-8 bg-gray-300 flex-shrink-0"></div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-gray-500">{isZh ? '退房' : 'Check-out'}</span>
            <span className="text-sm font-medium text-gray-900 truncate">
              {formatDate(checkOut)}
            </span>
          </div>
          {nights > 0 && (
            <>
              <div className="w-px h-8 bg-gray-300 flex-shrink-0"></div>
              <div className="flex flex-col flex-shrink-0">
                <span className="text-xs text-gray-500">{isZh ? '晚数' : 'Nights'}</span>
                <span className="text-sm font-semibold text-green-500">
                  {nights}
                </span>
              </div>
            </>
          )}
        </div>
      </button>

      {/* Date Picker Dropdown - Expanded State */}
      {showPicker && (
        <>
          {/* Mobile overlay */}
          {isMobile && (
            <div
              className="fixed inset-0 bg-black/50 z-[100]"
              onClick={() => setShowPicker(false)}
            />
          )}
          <div
            ref={datePickerRef}
            className={`
              ${isMobile 
                ? 'fixed inset-x-0 bottom-0 top-auto rounded-t-2xl rounded-b-none max-h-[90vh] overflow-y-auto z-[101]' 
                : 'absolute top-full left-1/2 -translate-x-1/2 mt-2 rounded-xl z-[100] max-h-[calc(100vh-200px)] overflow-y-auto'
              }
              bg-white shadow-2xl border border-gray-100 p-4 md:p-6
              ${isMobile ? 'w-full' : 'w-[calc(100vw-3rem)] sm:w-full max-w-[800px]'}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with nights display - matches screenshot style */}
            {checkIn && checkOut && nights > 0 && (
              <div className="mb-4 md:mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 mb-1">
                      {isZh ? '入住日期' : 'Check-in'}
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatDate(checkIn)}
                    </div>
                  </div>
                  <div className="text-center px-4 md:px-8">
                    <div className="text-xs text-gray-400 mb-1">
                      {isZh ? '入住晚数' : 'Nights'}
                    </div>
                    <div className="text-2xl md:text-3xl font-bold text-green-500">
                      {nights}
                    </div>
                  </div>
                  <div className="flex-1 text-right">
                    <div className="text-sm text-gray-500 mb-1">
                      {isZh ? '退房日期' : 'Check-out'}
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatDate(checkOut)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Calendar - Responsive months display */}
            <div className="mb-4 md:mb-6 flex-shrink-0">
              <style dangerouslySetInnerHTML={{
                __html: `
                  /* Responsive calendar styling */
                  .analyst-datepicker .react-datepicker {
                    width: 100%;
                    font-family: inherit;
                  }
                  
                  /* Mobile: Stack months vertically */
                  @media (max-width: 767px) {
                    .analyst-datepicker .react-datepicker__month-container {
                      width: 100% !important;
                    }
                    .analyst-datepicker .react-datepicker__month-container + .react-datepicker__month-container {
                      margin-top: 1.5rem;
                    }
                  }
                  
                  /* Desktop: Display months side by side, but ensure they fit */
                  @media (min-width: 768px) and (max-width: 1023px) {
                    .analyst-datepicker .react-datepicker__month-container {
                      width: 50% !important;
                    }
                  }
                  
                  /* Large desktop: Full width for both months */
                  @media (min-width: 1024px) {
                    .analyst-datepicker .react-datepicker__month-container {
                      width: 50% !important;
                    }
                  }
                  
                  /* Small screens: Single month */
                  @media (max-width: 767px) {
                    .analyst-datepicker .react-datepicker__month-container {
                      width: 100% !important;
                    }
                  }
                  
                  /* Selected date range styling - green background */
                  .analyst-datepicker .react-datepicker__day--in-range {
                    background-color: #10b981 !important;
                    color: white !important;
                  }
                  
                  .analyst-datepicker .react-datepicker__day--in-selecting-range {
                    background-color: #6ee7b7 !important;
                    color: white !important;
                  }
                  
                  .analyst-datepicker .react-datepicker__day--range-start,
                  .analyst-datepicker .react-datepicker__day--range-end {
                    background-color: #10b981 !important;
                    color: white !important;
                    font-weight: 600;
                  }
                  
                  .analyst-datepicker .react-datepicker__day--selected {
                    background-color: #10b981 !important;
                    color: white !important;
                    font-weight: 600;
                  }
                  
                  .analyst-datepicker .react-datepicker__day:hover {
                    border-radius: 0.375rem;
                  }
                  
                  /* Mobile touch targets - minimum 44x44px */
                  @media (max-width: 767px) {
                    .analyst-datepicker .react-datepicker__day {
                      min-width: 44px !important;
                      min-height: 44px !important;
                      line-height: 44px !important;
                      font-size: 16px !important;
                    }
                  }
                  
                  /* GPU acceleration for animations */
                  .analyst-datepicker .react-datepicker {
                    transform: translate3d(0, 0, 0);
                    will-change: transform;
                  }
                `
              }} />
              <div className="analyst-datepicker">
                <DatePicker
                  selected={checkIn}
                  onChange={handleDateChange}
                  startDate={checkIn}
                  endDate={checkOut}
                  selectsRange={true}
                  inline
                  monthsShown={isMobile ? 1 : 2}
                  minDate={minDate}
                  calendarClassName="!shadow-none !border-0"
                  className="w-full"
                  shouldCloseOnSelect={false}
                  openToDate={checkIn || new Date()}
                  key={checkIn?.getTime() || 'empty'}
                />
              </div>
            </div>

            {/* Action Button - Sticky at bottom */}
            <div className="flex justify-end pt-4 border-t border-gray-100 sticky bottom-0 bg-white z-10">
              <button
                onClick={() => setShowPicker(false)}
                className="px-6 py-2.5 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors w-full md:w-auto"
              >
                {isZh ? '完成' : 'Done'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


