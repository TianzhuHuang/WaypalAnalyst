'use client';

import { useState, useEffect } from 'react';
import { Plus, Settings, X, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ThreadList from './Sidebar/ThreadList';
import LoginButton from './auth/LoginButton';
import { useAuth } from '@/hooks/useAuth';
// Removed useThreadList - now using React Query

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onSelectThread: (threadId: string) => void;
  currentThreadId?: string | null;
  locale?: string;
}

export default function Sidebar({
  isOpen,
  onToggle,
  onNewChat,
  onSelectThread,
  currentThreadId,
  locale = 'en',
}: SidebarProps) {
  const isZh = locale === 'zh';
  const [isMobile, setIsMobile] = useState(false);
  const { isAuthenticated } = useAuth();

  // Detect mobile and manage sidebar state
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-close sidebar on mobile, auto-open on desktop
      if (mobile && isOpen) {
        // Keep current state on mobile
      } else if (!mobile && !isOpen) {
        // Auto-open on desktop (handled by parent)
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isOpen]);

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      {isOpen && (
        <motion.aside
          key="sidebar"
          initial={isMobile ? { x: -280 } : undefined}
          animate={isMobile ? { x: 0 } : undefined}
          exit={isMobile ? { x: -280 } : undefined}
          transition={isMobile ? { type: 'spring', damping: 25, stiffness: 200 } : undefined}
          className={`
            ${isMobile ? 'fixed' : 'static'} inset-y-0 left-0 z-40
            w-64 bg-[#0a0b0d] border-r border-white/5
            flex flex-col flex-shrink-0
            ${isMobile ? 'shadow-2xl' : ''}
            h-full
          `}
        >
            {/* Header with Logo */}
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full border-2 border-[#12d65e] flex items-center justify-center bg-[#12d65e]/10">
                    <span className="text-lg">🐸</span>
                  </div>
                  <h2 className="text-lg font-black text-white tracking-tight">WayPal</h2>
                </div>
                {isMobile && (
                  <button
                    onClick={onToggle}
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-white/60" />
                  </button>
                )}
              </div>

              {/* New Chat Button */}
              <button
                onClick={onNewChat}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#12d65e] hover:bg-[#15e064] text-black rounded-lg transition-colors shadow-lg shadow-[#12d65e]/20 font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>{isZh ? '发起新对话' : 'New Chat'}</span>
              </button>
            </div>

            {/* Thread History */}
            <div className="flex-1 overflow-y-auto px-2 py-4 no-scrollbar">
              <h3 className="px-2 text-xs font-black text-white/30 uppercase tracking-[0.2em] mb-3">
                {isZh ? '对话历史' : 'Chat History'}
              </h3>
              {isAuthenticated ? (
                <ThreadList
                  onSelectThread={onSelectThread}
                  currentThreadId={currentThreadId}
                  onDeleteThread={async (threadId) => {
                    // 如果删除的是当前 Thread，清空并重置
                    if (threadId === currentThreadId) {
                      onNewChat();
                    }
                    // React Query 会在 useThreadListQuery 中处理删除和乐观更新
                  }}
                />
              ) : (
                <div className="p-4 text-center text-white/40">
                  <p className="text-sm mb-2">请先登录以查看对话历史</p>
                  <LoginButton />
                </div>
              )}
            </div>

            {/* Footer - Login/Profile */}
            <div className="p-4 border-t border-white/5">
              {isAuthenticated ? (
                <LoginButton />
              ) : (
                <div className="space-y-2">
                  <LoginButton />
                  <button className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors text-white/60">
                    <Settings className="w-5 h-5" />
                    <span className="text-sm font-medium">{isZh ? '设置' : 'Settings'}</span>
                  </button>
                </div>
              )}
            </div>
          </motion.aside>
      )}

      {/* Mobile Hamburger Button */}
      {isMobile && !isOpen && (
        <button
          onClick={onToggle}
          className="fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-lg border border-gray-200 lg:hidden"
        >
          <Menu className="w-6 h-6 text-gray-700" />
        </button>
      )}
    </>
  );
}

