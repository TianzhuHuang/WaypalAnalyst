'use client';

import React from 'react';

interface OccupancyPickerProps {
  rooms: number;
  adults: number;
  children: number;
  onUpdate: (r: number, a: number, c: number) => void;
  onClose: () => void;
}

export default function OccupancyPicker({ rooms, adults, children, onUpdate, onClose }: OccupancyPickerProps) {
  const Stepper = ({ label, sub, value, min, onInc, onDec }: any) => (
    <div className="flex items-center justify-between py-5 border-b border-gray-100 last:border-0">
      <div>
        <div className="text-[15px] font-black text-gray-900">{label}</div>
        {sub && <div className="text-[11px] font-bold text-gray-400">{sub}</div>}
      </div>
      <div className="flex items-center gap-6">
        <button 
          onClick={onDec} 
          disabled={value <= min}
          className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${value <= min ? 'border-gray-100 text-gray-200' : 'border-blue-100 text-blue-600 active:scale-90 hover:bg-blue-50'}`}
        >
          <i className="fa-solid fa-minus"></i>
        </button>
        <span className="text-lg font-black text-gray-900 w-4 text-center">{value}</span>
        <button 
          onClick={onInc} 
          className="w-10 h-10 rounded-full border border-blue-600 flex items-center justify-center text-blue-600 transition-all active:scale-90 hover:bg-blue-50"
        >
          <i className="fa-solid fa-plus"></i>
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl animate-fade-up">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6 bg-blue-50/50 p-4 rounded-2xl">
            <i className="fa-solid fa-user-group text-blue-600"></i>
            <span className="text-[13px] font-black text-gray-900">{rooms} room, {adults} adults, {children} children</span>
          </div>
          <div className="space-y-1">
            <Stepper label="Rooms" value={rooms} min={1} onInc={() => onUpdate(rooms + 1, adults, children)} onDec={() => onUpdate(rooms - 1, adults, children)} />
            <Stepper label="Adults" sub="18+ yrs" value={adults} min={1} onInc={() => onUpdate(rooms, adults + 1, children)} onDec={() => onUpdate(rooms, adults - 1, children)} />
            <Stepper label="Children" sub="0-17 yrs" value={children} min={0} onInc={() => onUpdate(rooms, adults, children + 1)} onDec={() => onUpdate(rooms, adults, children - 1)} />
          </div>
          <button 
            onClick={onClose} 
            className="w-full mt-10 bg-blue-600 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
