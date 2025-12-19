'use client';

import { useState, useEffect } from 'react';
import { Plus, MessageSquare, Settings, X, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatHistoryItem {
  id: string;
  title: string;
  timestamp: Date;
  isExpertMode: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  history: ChatHistoryItem[];
  onSelectHistory: (id: string) => void;
  locale?: string;
}

export default function Sidebar({
  isOpen,
  onToggle,
  onNewChat,
  history,
  onSelectHistory,
  locale = 'en',
}: SidebarProps) {
  const isZh = locale === 'zh';
  const [isMobile, setIsMobile] = useState(false);

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
            w-64 bg-white border-r border-gray-200
            flex flex-col flex-shrink-0
            ${isMobile ? 'shadow-2xl' : ''}
          `}
        >
            {/* Header with Logo */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full border-2 border-green-500 flex items-center justify-center bg-green-50">
                    <span className="text-lg">🐸</span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Waypal Hotel Expert</h2>
                </div>
                {isMobile && (
                  <button
                    onClick={onToggle}
                    className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                )}
              </div>

              {/* New Chat Button */}
              <button
                onClick={onNewChat}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">{isZh ? '发起新对话' : 'New Chat'}</span>
              </button>
            </div>

            {/* Recent History */}
            <div className="flex-1 overflow-y-auto px-2 py-4">
              <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {isZh ? '最近对话' : 'Recent History'}
              </h3>
              <div className="space-y-1">
                {history.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-gray-400">
                    {isZh ? '暂无对话历史' : 'No chat history'}
                  </div>
                ) : (
                  history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onSelectHistory(item.id)}
                      className="w-full flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left group"
                    >
                      <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </span>
                          {item.isExpertMode && (
                            <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                              {isZh ? '专家' : 'Expert'}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {item.timestamp.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Footer - Settings/Profile */}
            <div className="p-4 border-t border-gray-200">
              <button className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700">
                <Settings className="w-5 h-5" />
                <span className="text-sm font-medium">{isZh ? '设置' : 'Settings'}</span>
              </button>
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

