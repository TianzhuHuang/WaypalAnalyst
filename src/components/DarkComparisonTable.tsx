'use client';

import React, { useMemo } from 'react';

interface ComparisonRow {
  platform: string;
  platformLogo?: string;
  isBest?: boolean;
  total_price?: number;
  totalPrice?: string;
  nightlyPrice?: string;
  perks?: any;
  breakfast?: boolean;
  cancellation?: string;
  websiteUrl?: string;
}

interface DarkComparisonTableProps {
  data: {
    table_rows?: ComparisonRow[];
  };
  onBook?: (row: ComparisonRow) => void;
}

export default function DarkComparisonTable({ data, onBook }: DarkComparisonTableProps) {
  const rows = useMemo(() => {
    const r = [...(data.table_rows || [])];
    // Sort by price ascending to find the best deal
    return r.sort((a, b) => (a.total_price || 0) - (b.total_price || 0));
  }, [data.table_rows]);

  if (!rows || rows.length === 0) return null;

  return (
    <div className="mt-6 w-full relative">
      <div className="absolute -top-3 right-0 flex items-center gap-1.5 opacity-40 md:hidden">
        <span className="text-[8px] font-black uppercase tracking-widest">Swipe to compare</span>
        <i className="fa-solid fa-arrow-right-long text-[8px]"></i>
      </div>
      
      <div className="w-full overflow-x-auto rounded-[24px] border border-white/5 bg-white/[0.03] backdrop-blur-xl shadow-2xl no-scrollbar">
        <table className="w-full text-left text-[12px] min-w-[500px] border-collapse">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/5">
              <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">预定渠道</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">预计总额</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row: any, idx: number) => {
              const isBest = idx === 0;
              
              // Robust string check for perks
              const perksVal = row.perks || "";
              const perksStr = (typeof perksVal === "string" ? perksVal : JSON.stringify(perksVal)).toLowerCase();
              
              // Check breakfast from multiple sources
              let hasBreakfast = false;
              if (row.breakfast !== undefined) {
                hasBreakfast = row.breakfast;
              } else if (row.perks?.breakfastInclude !== undefined) {
                hasBreakfast = row.perks.breakfastInclude;
              } else if (row.perks?.breakfast === 'included' || row.perks?.breakfast === 'daily_double') {
                hasBreakfast = true;
              } else {
                hasBreakfast = perksStr.includes('breakfast') || perksStr.includes('含早') || isBest;
              }
              
              // Robust string check for cancellation policy
              let cancelPolicy = '限时取消';
              if (row.cancellation) {
                cancelPolicy = typeof row.cancellation === "string" ? row.cancellation : String(row.cancellation);
              } else if (row.policy?.cancellationPolicy) {
                cancelPolicy = row.policy.cancellationPolicy;
              } else if (isBest) {
                cancelPolicy = '免费取消';
              }
              
              // Format price - support multiple formats
              let totalPrice = 'N/A';
              if (row.totalPrice) {
                totalPrice = row.totalPrice;
              } else if (row.total_price) {
                totalPrice = `¥${row.total_price.toLocaleString()}`;
              } else if (row.rateInfo?.totalPriceDisplay) {
                totalPrice = row.rateInfo.totalPriceDisplay;
              } else if (row.rateInfo?.totalPrice) {
                totalPrice = `¥${row.rateInfo.totalPrice.toLocaleString()}`;
              }
              
              return (
                <tr key={idx} className={`group hover:bg-white/[0.05] transition-all relative ${isBest ? 'bg-[#12d65e]/[0.02]' : ''}`}>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-[13px]">{row.platform}</span>
                        {isBest && (
                          <span className="bg-[#12d65e] text-black text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">Best Choice</span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 uppercase tracking-wider ${hasBreakfast ? 'bg-[#12d65e]/10 border-[#12d65e]/30 text-[#12d65e]' : 'bg-white/5 border-white/10 text-white/40'}`}>
                          <i className={`fa-solid ${hasBreakfast ? 'fa-coffee' : 'fa-ban'} text-[8px]`}></i>
                          {hasBreakfast ? '含早餐' : '不含早'}
                        </span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 uppercase tracking-wider ${cancelPolicy.includes('免费') ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
                          <i className="fa-solid fa-calendar-check text-[8px]"></i>
                          {cancelPolicy}
                        </span>
                      </div>

                      {row.perks && (
                        <div className="flex items-center gap-1.5 overflow-hidden mt-1">
                           <i className="fa-solid fa-star text-[9px] text-[#c5a059]"></i>
                           <span className="text-[9px] text-[#c5a059] font-bold uppercase truncate tracking-wide">Elite Perks Included</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className={`text-[15px] font-black ${isBest ? 'text-[#12d65e]' : 'text-white'}`}>
                        {totalPrice}
                      </span>
                      <span className="text-[9px] text-white/20 font-bold uppercase tracking-tight">Inc. Taxes & Fees</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button 
                      onClick={() => onBook?.(row)} 
                      className={`px-5 py-2 rounded-full text-[10px] font-black transition-all active:scale-90 shadow-lg uppercase tracking-widest ${
                        isBest 
                        ? 'bg-[#12d65e] text-black shadow-[#12d65e]/20 hover:bg-[#15e064]' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      去预订
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
