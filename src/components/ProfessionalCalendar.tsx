'use client';

import React, { useState } from 'react';

const getLocalDateString = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

interface ProfessionalCalendarProps {
  startDate: string;
  endDate: string;
  onSelect: (s: string, e: string) => void;
  onClose: () => void;
}

export default function ProfessionalCalendar({ startDate, endDate, onSelect, onClose }: ProfessionalCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(startDate || new Date()));
  const [selection, setSelection] = useState<{ start: Date | null; end: Date | null }>({
    start: startDate ? new Date(startDate) : null,
    end: endDate ? new Date(endDate) : null,
  });

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDateClick = (day: number) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (!selection.start || (selection.start && selection.end)) {
      setSelection({ start: selectedDate, end: null });
    } else {
      if (selectedDate < selection.start) {
        setSelection({ start: selectedDate, end: selection.start });
      } else {
        setSelection({ ...selection, end: selectedDate });
      }
    }
  };

  const isSelected = (day: number) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (selection.start && d.getTime() === selection.start.getTime()) return true;
    if (selection.end && d.getTime() === selection.end.getTime()) return true;
    return false;
  };

  const isInRange = (day: number) => {
    if (!selection.start || !selection.end) return false;
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return d > selection.start && d < selection.end;
  };

  const confirmSelection = () => {
    if (selection.start && selection.end) {
      onSelect(getLocalDateString(selection.start), getLocalDateString(selection.end));
      onClose();
    }
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl animate-fade-up">
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setCurrentMonth(new Date(year, month - 1))} className="text-gray-400 hover:text-black transition-colors"><i className="fa-solid fa-chevron-left"></i></button>
            <h3 className="text-gray-900 font-black text-lg tracking-tight">{monthNames[month]} {year}</h3>
            <button onClick={() => setCurrentMonth(new Date(year, month + 1))} className="text-gray-400 hover:text-black transition-colors"><i className="fa-solid fa-chevron-right"></i></button>
          </div>
          <div className="grid grid-cols-7 mb-4">
            {daysOfWeek.map(d => <div key={d} className="text-center text-[10px] font-black text-blue-800 uppercase tracking-widest py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {blanks.map(b => <div key={`b-${b}`} className="py-3"></div>)}
            {days.map(d => {
              const selected = isSelected(d);
              const inRange = isInRange(d);
              return (
                <div 
                  key={d} 
                  onClick={() => handleDateClick(d)}
                  className={`relative py-3 cursor-pointer text-center text-sm font-bold transition-all rounded-xl 
                    ${selected ? 'bg-blue-600 text-white shadow-lg' : ''} 
                    ${inRange ? 'bg-blue-50 text-blue-700' : 'text-gray-900 hover:bg-gray-100'}`}
                >
                  {d}
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex gap-3">
            <button onClick={onClose} className="flex-1 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Cancel</button>
            <button 
              disabled={!selection.start || !selection.end} 
              onClick={confirmSelection} 
              className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl transition-all 
                ${selection.start && selection.end ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
