'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  bedPreference: string | null;
  budgetLevel: string | null;
  dietaryRestrictions: string | null;
}

export default function ProfileSidebar({ isOpen, onClose }: ProfileSidebarProps) {
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    bedPreference: '',
    budgetLevel: '',
    dietaryRestrictions: '',
  });

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadProfile();
    }
  }, [isOpen, isAuthenticated]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData({
          bedPreference: data.bedPreference || 'King Size',
          budgetLevel: data.budgetLevel || 'Luxury',
          dietaryRestrictions: data.dietaryRestrictions || '',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        await loadProfile();
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

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
          {/* User Profile Section */}
          {isAuthenticated && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">个人偏好</h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-[11px] font-bold text-[#12d65e] hover:text-[#15e064] transition-colors"
                  >
                    编辑
                  </button>
                )}
              </div>
              {isLoading ? (
                <div className="p-4 text-center text-white/40">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto" />
                </div>
              ) : profile ? (
                <div className="space-y-4">
                  <div className="p-5 rounded-[20px] border border-white/5 bg-white/5">
                    <div className="flex items-center gap-4 mb-4">
                      {profile.avatarUrl ? (
                        <img
                          src={profile.avatarUrl}
                          alt={profile.fullName || profile.email}
                          className="w-16 h-16 rounded-full border-2 border-white/10"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full border-2 border-white/10 bg-white/5 flex items-center justify-center">
                          <span className="text-2xl">👤</span>
                        </div>
                      )}
                      <div>
                        <div className="text-lg font-black text-white">{profile.fullName || '用户'}</div>
                        <div className="text-xs text-white/40">{profile.email}</div>
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-white/40 mb-2 block">床型偏好</label>
                          <select
                            value={formData.bedPreference}
                            onChange={(e) => setFormData({ ...formData, bedPreference: e.target.value })}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#12d65e]"
                          >
                            <option value="King Size">大床</option>
                            <option value="Twin Beds">双床</option>
                            <option value="Queen Size">标准双人床</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-white/40 mb-2 block">预算级别</label>
                          <select
                            value={formData.budgetLevel}
                            onChange={(e) => setFormData({ ...formData, budgetLevel: e.target.value })}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#12d65e]"
                          >
                            <option value="Luxury">奢侈</option>
                            <option value="Premium">精品</option>
                            <option value="Value">性价比</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-white/40 mb-2 block">饮食禁忌</label>
                          <input
                            type="text"
                            value={formData.dietaryRestrictions}
                            onChange={(e) => setFormData({ ...formData, dietaryRestrictions: e.target.value })}
                            placeholder="例如：素食、无麸质"
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#12d65e]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSave}
                            className="flex-1 px-4 py-2 bg-[#12d65e] hover:bg-[#15e064] text-black rounded-lg font-bold text-sm transition-colors"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => {
                              setIsEditing(false);
                              loadProfile();
                            }}
                            className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold text-sm transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs font-bold text-white/40 mb-1">床型偏好</div>
                          <div className="text-sm text-white">{profile.bedPreference || '未设置'}</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white/40 mb-1">预算级别</div>
                          <div className="text-sm text-white">{profile.budgetLevel || '未设置'}</div>
                        </div>
                        {profile.dietaryRestrictions && (
                          <div>
                            <div className="text-xs font-bold text-white/40 mb-1">饮食禁忌</div>
                            <div className="text-sm text-white">{profile.dietaryRestrictions}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-white/40 text-sm">无法加载用户资料</div>
              )}
            </section>
          )}

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
