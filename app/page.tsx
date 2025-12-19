'use client';

import { useState, useEffect } from 'react';
import Analyst from '@/components/Analyst/Analyst';
import Sidebar from '@/components/Sidebar';

interface ChatHistoryItem {
  id: string;
  title: string;
  timestamp: Date;
  isExpertMode: boolean;
}

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default open on desktop
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);

  // Handle responsive sidebar state
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 768;
      // Auto-open sidebar on desktop if it's closed
      if (isDesktop && !sidebarOpen) {
        setSidebarOpen(true);
      }
    };

    // Set initial state based on screen size
    if (typeof window !== 'undefined') {
      const isDesktop = window.innerWidth >= 768;
      setSidebarOpen(isDesktop);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  const handleNewChat = () => {
    setCurrentThreadId(null);
    // Don't close sidebar on desktop, only on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleSelectHistory = (id: string) => {
    setCurrentThreadId(id);
    // Only close sidebar on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-b from-green-50/30 to-white">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onNewChat={handleNewChat}
        history={chatHistory}
        onSelectHistory={handleSelectHistory}
        locale="en"
      />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 h-screen">
        <Analyst 
          locale="en" 
          threadId={currentThreadId}
          onThreadUpdate={(threadId, title, isExpertMode) => {
            if (threadId) {
              setCurrentThreadId(threadId);
              // Update history
              const newItem: ChatHistoryItem = {
                id: threadId,
                title,
                timestamp: new Date(),
                isExpertMode,
              };
              setChatHistory((prev) => {
                const filtered = prev.filter((item) => item.id !== threadId);
                return [newItem, ...filtered].slice(0, 10);
              });
            }
          }}
        />
      </main>
    </div>
  );
}
