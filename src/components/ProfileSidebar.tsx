'use client';

import React from 'react';

interface ProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSidebar({ isOpen, onClose }: ProfileSidebarProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[400px] h-full bg-[#0a0b0d] border-l border-white/5 flex flex-col animate-slide-in-right overflow-y-auto no-scrollbar shadow-2xl">
        <header className="flex items-center justify-between px-6 py-6 md:px-8 md:py-8">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-black tracking-tighter uppercase text-white">WAYPAL<span className="text-[#00df81]">.ME</span></span>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </header>
        <div className="px-6 pb-12 md:px-8 space-y-10">
          <section className="space-y-4">
            <h3 className="text-[12px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">历史入住记录足迹</h3>
            <div className="relative w-full aspect-[16/9] rounded-[24px] overflow-hidden bg-white/5 border border-white/5">
              <img src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover opacity-20 grayscale" alt="Map" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                  <div className="relative w-4 h-4 rounded-full bg-[#12d65e] border-4 border-black shadow-lg shadow-[#12d65e]/40" />
                </div>
              </div>
              <div className="absolute bottom-6 left-6 space-y-1">
                <div className="text-2xl md:text-3xl font-black tracking-tighter text-white">12 个目的地</div>
                <div className="text-[11px] font-bold text-white/40 tracking-wide">已探索全球 24 家高奢酒店</div>
              </div>
            </div>
          </section>
          <section className="space-y-4">
            <div className="flex items-center justify-between ml-1">
              <h3 className="text-[12px] font-black text-white/30 uppercase tracking-[0.2em]">常旅客会员信息</h3>
              <button className="text-[11px] font-bold text-[#12d65e]">+ 关联新计划</button>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Marriott Bonvoy', tier: 'TITANIUM ELITE', color: 'bg-[#1a1c1e]' },
                { name: 'Hilton Honors', tier: 'DIAMOND MEMBER', color: 'bg-[#0f172a]' },
                { name: 'Hyatt Privé', tier: 'GLOBALIST', color: 'bg-[#1a1610]' },
                { name: 'IHG One Rewards', tier: 'DIAMOND ELITE', color: 'bg-[#1c1410]' },
              ].map((p, i) => (
                <div key={i} className={`flex items-center justify-between p-5 rounded-[20px] border border-white/5 ${p.color} hover:border-white/20 transition-all cursor-pointer group`}>
                  <div className="space-y-1">
                    <div className="text-[15px] font-black text-white/90">{p.name}</div>
                    <div className="text-[10px] font-bold text-white/30 tracking-widest">{p.tier}</div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-[10px] text-white/10 group-hover:text-white/40 group-hover:translate-x-1 transition-all"></i>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
