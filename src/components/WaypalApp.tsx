'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import FrogLogoIcon from './FrogLogoIcon';
import ProfessionalCalendar from './ProfessionalCalendar';
import OccupancyPicker from './OccupancyPicker';
import DarkComparisonTable from './DarkComparisonTable';
import VideoTourList from './VideoTourList';
import VideoModal from './VideoModal';
import ProfileSidebar from './ProfileSidebar';
import Sidebar from './Sidebar';
import DeepAnalysisButton from './Analyst/DeepAnalysisButton';
import ExpertAnalysisCard from './Analyst/ExpertAnalysisCard';
import { compareHotel, sendMessageToAgent, parseEvaluationReply, getBookingStrategy } from '@/api/agentApi';
import { useThreadQuery } from '@/hooks/useThreadQuery';
import { useComparisonContext } from '@/hooks/useComparisonContext';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

const getLocalDateString = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'room-tour' | 'comparison';
  timestamp: number;
  comparisonData?: any;
  roomTourVideos?: any[];
}

const GeminiLoading = () => (
  <div className="flex flex-col gap-2 py-6 ml-1 animate-fade-up">
    <div className="flex items-center gap-2 mb-1">
      <FrogLogoIcon className="w-5 h-5" />
      <span className="text-[10px] font-black text-[#12d65e] uppercase tracking-[0.2em]">WayPal Thinking...</span>
    </div>
    <div className="space-y-2 max-w-[200px]">
      <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
      <div className="h-3 w-2/3 bg-white/5 rounded animate-pulse" />
    </div>
  </div>
);

export default function WaypalApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isOccupancyOpen, setIsOccupancyOpen] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [hotelName, setHotelName] = useState('');
  const [startDate, setStartDate] = useState(getLocalDateString(new Date()));
  const [endDate, setEndDate] = useState(getLocalDateString(new Date(Date.now() + 86400000)));
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [currentHotelId, setCurrentHotelId] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Thread 管理
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // 使用 React Query 管理 Thread 数据
  const threadQuery = useThreadQuery(currentThreadId);
  
  // 获取比价上下文
  const { context: comparisonContext, isExpired: isContextExpired } = useComparisonContext(currentThreadId);

  // 处理 Thread 切换 - 从历史记录加载，不重新查价
  const handleSelectThread = async (threadId: string) => {
    if (threadId === currentThreadId) return;
    
    // 立即清空旧消息，显示加载状态
    setMessages([]);
    setCurrentThreadId(threadId);
    setIsStarted(true);
    setIsLoading(true);
    
    try {
      // 预取 Thread 数据（如果还没有缓存）
      await queryClient.prefetchQuery({
        queryKey: ['thread', threadId],
        queryFn: async () => {
          const response = await fetch(`/api/threads/${threadId}`);
          if (!response.ok) throw new Error('Failed to load thread');
          return response.json();
        },
      });
      
      await queryClient.prefetchQuery({
        queryKey: ['thread-messages', threadId],
        queryFn: async () => {
          const response = await fetch(`/api/threads/${threadId}/messages`);
          if (!response.ok) throw new Error('Failed to load messages');
          return response.json();
        },
      });
      
      // 等待数据加载完成
      const [thread, messages] = await Promise.all([
        queryClient.ensureQueryData<{ id: string; hotelName?: string; checkIn?: string; checkOut?: string; hotelId?: string | null; metadata?: Record<string, any>; updatedAt: string }>({ queryKey: ['thread', threadId] }),
        queryClient.ensureQueryData<Array<{ id: string; role: string; content: string; createdAt: string; metadata?: Record<string, any> }>>({ queryKey: ['thread-messages', threadId] }),
      ]);
      
      if (thread && messages && Array.isArray(messages)) {
        // 恢复酒店信息
        if (thread.hotelName) {
          setHotelName(thread.hotelName);
        }
        if (thread.checkIn) {
          setStartDate(thread.checkIn);
        }
        if (thread.checkOut) {
          setEndDate(thread.checkOut);
        }
        if (thread.hotelId) {
          setCurrentHotelId(parseInt(thread.hotelId) || null);
        }
        
        // 转换数据库消息格式为前端消息格式
        const convertedMessages: Message[] = messages.map((msg: any) => {
          const baseMessage: Message = {
            id: msg.id,
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: new Date(msg.createdAt).getTime(),
          };
          
          // 如果有 metadata，尝试解析 comparisonData
          if (msg.metadata?.comparisonData) {
            return {
              ...baseMessage,
              type: 'comparison',
              comparisonData: msg.metadata.comparisonData,
            };
          }
          
          return baseMessage;
        });
        
        // 如果 Thread metadata 中有比价数据，但没有对应的消息，创建一个显示消息
        if (thread.metadata?.comparisonData && !convertedMessages.some(m => m.type === 'comparison')) {
          convertedMessages.push({
            id: 'comparison-snapshot',
            role: 'assistant',
            type: 'comparison',
            content: '已为您整理实时极惠方案',
            comparisonData: thread.metadata.comparisonData,
            timestamp: new Date(thread.updatedAt).getTime(),
          });
        }
        
        setMessages(convertedMessages);
      } else {
        setMessages([]);
      }
    } catch (error: any) {
      console.error('Failed to load thread:', error);
      const errorMessage: Message = {
        id: 'error',
        role: 'assistant',
        content: '加载对话失败，请稍后重试',
        timestamp: Date.now()
      };
      setMessages([errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理新对话
  const handleNewChat = () => {
    setCurrentThreadId(null);
    setIsStarted(false);
    setMessages([]);
    setHotelName('');
    setInputValue('');
    setDynamicSuggestions([]);
    // 重置日期和人数
    setStartDate(getLocalDateString(new Date()));
    setEndDate(getLocalDateString(new Date(Date.now() + 86400000)));
    setRooms(1);
    setAdults(2);
    setChildren(0);
    // React Query 会自动刷新列表
  };

  const quickActions = useMemo(() => [
    { label: "全网找优惠", icon: <i className="fa-solid fa-magnifying-glass-dollar"></i>, action: "全网找优惠" },
    { label: "预定方案推荐", icon: <i className="fa-solid fa-calendar-check"></i>, action: "预定方案推荐" },
    { label: "房型推荐", icon: <i className="fa-solid fa-bed"></i>, action: null }, // 保留按钮但不实现
    { label: "价格趋势", icon: <i className="fa-solid fa-chart-line"></i>, action: null } // 保留按钮但不实现
  ], []);

  const getFormattedDatesDisplay = (compact = false) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const fmt = (d: Date) => `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (compact) {
      return `${fmt(start)} - ${fmt(end)}`;
    }
    return `${fmt(start)} - ${fmt(end)} (${nights}晚)`;
  };

  const getGuestsDisplay = () => {
    return `${rooms}间, ${adults + children}人`;
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async (forcedQuery?: string) => {
    const text = forcedQuery || inputValue;

    if (!isStarted) {
      if (!hotelName.trim()) return;
      setIsStarted(true);
      
      // 创建 Thread（如果用户已登录）
      let threadId = currentThreadId;
      if (isAuthenticated && !threadId) {
        try {
          console.log('[WaypalApp] Creating thread for:', hotelName);
          const newThread = await threadQuery.createThread({
            hotelName,
            hotelId: currentHotelId?.toString(),
            checkIn: startDate,
            checkOut: endDate,
            metadata: {},
          });
          threadId = newThread?.id || null;
          
          console.log('[WaypalApp] Thread created:', threadId);
          
          // 设置当前 Thread ID（React Query 会自动刷新列表）
          if (threadId) {
            setCurrentThreadId(threadId);
          } else {
            console.error('[WaypalApp] Thread creation returned null ID');
          }
        } catch (error) {
          console.error('[WaypalApp] Failed to create thread:', error);
          // 即使创建失败，也继续显示欢迎消息（但不会保存到数据库）
        }
      } else if (!isAuthenticated) {
        console.warn('[WaypalApp] User not authenticated, skipping thread creation');
      }
      
      const welcome: Message = { 
        id: 'welcome', 
        role: 'assistant', 
        content: `尊贵的宾客，午安。我是您的 WayPal 奢华酒店订房助手\n\n已锁定 **${hotelName}** 信息流：\n📅 **行程**: ${getFormattedDatesDisplay()}\n👥 **人数**: ${getGuestsDisplay()}\n\n请告知您的特定咨询需求，或点击下方快捷功能`, 
        timestamp: Date.now() 
      };
      setMessages([welcome]);
      
      // 保存欢迎消息到数据库
      if (threadId && isAuthenticated) {
        try {
          await threadQuery.saveMessage({
            threadId,
            role: 'assistant',
            content: welcome.content,
          });
          console.log('[WaypalApp] Welcome message saved successfully');
        } catch (saveError: any) {
          console.error('[WaypalApp] Failed to save welcome message:', {
            error: saveError.message,
            threadId,
            isAuthenticated,
          });
          // 不阻止用户继续使用，但记录错误
        }
      }
      
      if (forcedQuery) {
        setTimeout(() => executeSpecialAction(forcedQuery), 100);
      }
      return;
    }

    if (!text.trim()) return;
    
    const userMessage: Message = { 
      id: `u-${Date.now()}`, 
      role: 'user', 
      content: text, 
      timestamp: Date.now() 
    };
    setMessages(prev => [...prev, userMessage]);
    
    // 保存用户消息到数据库
    if (currentThreadId && isAuthenticated) {
      try {
        await threadQuery.saveMessage({
          threadId: currentThreadId,
          role: 'user',
          content: text,
        });
        console.log('[WaypalApp] User message saved successfully');
      } catch (saveError: any) {
        console.error('[WaypalApp] Failed to save user message:', {
          error: saveError.message,
          threadId: currentThreadId,
          isAuthenticated,
          messageLength: text.length,
        });
        // 不阻止用户继续使用，但记录错误
      }
    } else {
      console.warn('[WaypalApp] Skipping message save:', {
        hasThreadId: !!currentThreadId,
        isAuthenticated,
      });
    }
    
    setInputValue('');
    setIsLoading(true);
    setDynamicSuggestions([]);

    try {
      if (text.includes("优惠") || text.includes("找")) {
         await executeSpecialAction("全网找优惠");
         return;
      }
      if (text.includes("房型") || text.includes("推荐")) {
         await executeSpecialAction("房型推荐");
         return;
      }
      
      // Use the existing API
      const userId = user?.id || "waypal_user_" + Date.now();
      const res = await sendMessageToAgent(text, userId, comparisonContext);
      
      if (res.reply_type === 'evaluation' && res.reply) {
        const evaluationData = parseEvaluationReply(res.reply);
        const assistantMessage: Message = {
          id: `a-${Date.now()}`, 
          role: 'assistant', 
          type: 'comparison',
          content: '已为您整理实时极惠方案',
          comparisonData: evaluationData, 
          timestamp: Date.now() 
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // 保存消息和更新 Thread metadata（保存比价快照）
        if (currentThreadId && isAuthenticated) {
          try {
            await threadQuery.saveMessage({
              threadId: currentThreadId,
              role: 'assistant',
              content: assistantMessage.content,
            });
            // 更新 Thread metadata 保存比价结果快照
            await threadQuery.updateThread({
              threadId: currentThreadId,
              context: { metadata: { comparisonData: evaluationData } },
            });
            console.log('[WaypalApp] Comparison message and metadata saved successfully');
          } catch (saveError: any) {
            console.error('[WaypalApp] Failed to save comparison message:', {
              error: saveError.message,
              threadId: currentThreadId,
            });
          }
        }
        
        setDynamicSuggestions(["分析具体礼遇", "查看房型实拍", "立即预订最佳方案"]);
      } else {
        // reply_type === 'general' 时，reply 是纯文本，不需要 JSON.parse
        let replyText = res.reply || '非常抱歉，尊贵的宾客，我暂时无法同步实时数据。请稍后再试';
        
        // 尝试解析 JSON（如果 reply 是 JSON 字符串），但失败时直接使用原文本
        if (res.reply && res.reply.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(res.reply);
            replyText = parsed.text || parsed.message || res.reply;
          } catch (e) {
            // 不是 JSON，直接使用原文本
            replyText = res.reply;
          }
        }
        
        const assistantMessage: Message = {
          id: `a-${Date.now()}`, 
          role: 'assistant', 
          content: replyText, 
          timestamp: Date.now() 
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // 保存消息到数据库
        if (currentThreadId && isAuthenticated) {
          try {
            await threadQuery.saveMessage({
              threadId: currentThreadId,
              role: 'assistant',
              content: replyText,
            });
            console.log('[WaypalApp] Assistant message saved successfully');
          } catch (saveError: any) {
            console.error('[WaypalApp] Failed to save assistant message:', {
              error: saveError.message,
              threadId: currentThreadId,
            });
          }
        }
      }
    } catch (e: any) {
      console.error('Error sending message:', e);
      const errorMessage: Message = {
        id: `err-${Date.now()}`, 
        role: 'assistant', 
        content: "非常抱歉，实时系统响应繁忙，请稍后再试", 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // 保存错误消息到数据库（如果已登录）
      if (currentThreadId && isAuthenticated) {
        try {
          await threadQuery.saveMessage({
            threadId: currentThreadId,
            role: 'assistant',
            content: errorMessage.content,
          });
        } catch (saveError) {
          console.error('Failed to save error message:', saveError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 深度解析处理函数
  const handleDeepAnalysis = async () => {
    if (!comparisonContext || !currentThreadId) return;

    setIsLoading(true);
    try {
      // 构建深度分析 prompt
      const analysisPrompt = `基于当前比价结果，请生成一份 200 字左右的专家分析报告，包括：
1. 哪个方案性价比最高
2. 为何推荐该方案（价格、礼遇、取消政策等）
3. 现在是否建议立即预订

请用简洁、专业的语言回答。`;

      // 发送分析请求（带上下文）
      const userId = user?.id || "waypal_user_" + Date.now();
      const response = await sendMessageToAgent(
        analysisPrompt,
        userId,
        comparisonContext
      );

      if (response.reply) {
        const analysisText = response.reply;
        
        // 创建专家分析消息
        const analysisMessage: Message = {
          id: `analysis-${Date.now()}`,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        };
        
        // 使用 React 组件作为内容
        setMessages(prev => [...prev, {
          ...analysisMessage,
          content: analysisText, // 保存文本用于数据库
        }]);

        // 保存到数据库
        if (currentThreadId && isAuthenticated) {
          try {
            await threadQuery.saveMessage({
              threadId: currentThreadId,
              role: 'assistant',
              content: analysisText,
            });
          } catch (saveError) {
            console.error('Failed to save analysis message:', saveError);
          }
        }
      }
    } catch (error) {
      console.error('Failed to generate deep analysis:', error);
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '抱歉，生成专家分析时出现错误，请稍后重试',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeSpecialAction = async (action: string) => {
    setIsLoading(true);
    try {
      if (action === "全网找优惠") {
        const userId = "waypal_user_" + Date.now();
        const res = await compareHotel({
          destination: "",
          hotel_name: hotelName,
          check_in: startDate,
          check_out: endDate,
          room_count: rooms,
          room_type: null,
          adults: adults,
          children: children,
          additional_notes: "无其他要求"
        }, userId);

        if (res.reply_type === 'evaluation' && res.reply) {
          try {
            const evaluationData = parseEvaluationReply(res.reply);
            // 尝试从返回数据中获取hotelId（如果存在）
            if (evaluationData && (evaluationData as any).hotel_id) {
              setCurrentHotelId((evaluationData as any).hotel_id);
            }
            
            const assistantMessage: Message = {
              id: `a-${Date.now()}`, 
              role: 'assistant', 
              type: 'comparison', 
              content: '已为您整理实时极惠方案',
              comparisonData: evaluationData, 
              timestamp: Date.now() 
            };
            setMessages(prev => [...prev, assistantMessage]);
            
            // 保存消息和更新 Thread metadata（保存比价快照）
            if (currentThreadId && isAuthenticated) {
              try {
                await threadQuery.saveMessage({
                  threadId: currentThreadId,
                  role: 'assistant',
                  content: assistantMessage.content,
                });
                await threadQuery.updateThread({
                  threadId: currentThreadId,
                  context: { metadata: { comparisonData: evaluationData } },
                });
                console.log('[WaypalApp] Special action message and metadata saved successfully');
              } catch (saveError: any) {
                console.error('[WaypalApp] Failed to save special action message:', {
                  error: saveError.message,
                  threadId: currentThreadId,
                });
              }
            }
            
            setDynamicSuggestions(["分析具体礼遇", "查看房型实拍", "立即预订最佳方案", "预定方案推荐"]);
          } catch (parseError) {
            console.error('Failed to parse evaluation data:', parseError);
            setMessages(prev => [...prev, { 
              id: `a-${Date.now()}`, 
              role: 'assistant', 
              content: "已为您整理实时极惠方案，请查看下方比价表格", 
              comparisonData: { table_rows: [] },
              timestamp: Date.now() 
            }]);
          }
        } else {
          setMessages(prev => [...prev, { 
            id: `a-${Date.now()}`, 
            role: 'assistant', 
            content: "正在为您搜索最优价格方案，请稍候...", 
            timestamp: Date.now() 
          }]);
        }
      } else if (action === "预定方案推荐") {
        // 需要hotelId，如果当前没有，提示用户先使用"全网找优惠"
        // 注意：根据PDF文档，预订方案推荐接口需要hotelId参数
        // 如果compare接口返回中没有hotelId，可能需要用户手动提供或通过其他方式获取
        if (!currentHotelId) {
          setMessages(prev => [...prev, { 
            id: `a-${Date.now()}`, 
            role: 'assistant', 
            content: "为了获取最准确的预订方案推荐，请先使用「全网找优惠」功能完成酒店搜索。如果仍然无法获取推荐，可能需要提供酒店ID信息。", 
            timestamp: Date.now() 
          }]);
          setIsLoading(false);
          return;
        }
        
        try {
          const strategyRes = await getBookingStrategy({
            hotelId: currentHotelId,
            checkIn: startDate,
            checkOut: endDate
          });
          
          setMessages(prev => [...prev, { 
            id: `a-${Date.now()}`, 
            role: 'assistant', 
            content: strategyRes.reply || '已为您整理预订方案推荐', 
            timestamp: Date.now() 
          }]);
          setDynamicSuggestions(["查看详细方案", "立即预订", "对比其他方案"]);
        } catch (error: any) {
          console.error('Booking strategy error:', error);
          setMessages(prev => [...prev, { 
            id: `err-${Date.now()}`, 
            role: 'assistant', 
            content: "非常抱歉，获取预订方案推荐时出现错误。请确保已使用「全网找优惠」功能完成酒店搜索。", 
            timestamp: Date.now() 
          }]);
        }
      } else if (action === "房型推荐") {
        // 保留按钮但不实现功能
        setMessages(prev => [...prev, { 
          id: `a-${Date.now()}`, 
          role: 'assistant', 
          content: "房型推荐功能即将上线，敬请期待", 
          timestamp: Date.now() 
        }]);
      } else if (action === "价格趋势") {
        // 保留按钮但不实现功能
        setMessages(prev => [...prev, { 
          id: `a-${Date.now()}`, 
          role: 'assistant', 
          content: "价格趋势功能即将上线，敬请期待", 
          timestamp: Date.now() 
        }]);
      }
    } catch (error: any) {
      console.error('Error executing special action:', error);
      const errorMessage: Message = {
        id: `err-${Date.now()}`, 
        role: 'assistant', 
        content: "非常抱歉，实时系统响应繁忙，请稍后再试", 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // 保存错误消息到数据库（如果已登录）
      if (currentThreadId && isAuthenticated) {
        try {
          await threadQuery.saveMessage({
            threadId: currentThreadId,
            role: 'assistant',
            content: errorMessage.content,
          });
        } catch (saveError) {
          console.error('Failed to save error message:', saveError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const bgUrl = "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=1600";

  return (
    <div className="relative h-[100dvh] w-full flex overflow-hidden text-white bg-[#050607]">
      <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-105" style={{ 
        backgroundImage: `url(${bgUrl})`, 
        filter: isStarted ? 'blur(45px) brightness(0.12)' : 'blur(5px) brightness(0.4)' 
      }} />
      <div className="absolute inset-0 bg-black/40" />

      {isCalendarOpen && <ProfessionalCalendar startDate={startDate} endDate={endDate} onSelect={(s, e) => { setStartDate(s); setEndDate(e); }} onClose={() => setIsCalendarOpen(false)} />}
      {isOccupancyOpen && <OccupancyPicker rooms={rooms} adults={adults} children={children} onUpdate={(r, a, c) => { setRooms(r); setAdults(a); setChildren(c); }} onClose={() => setIsOccupancyOpen(false)} />}
      {playingVideoId && <VideoModal videoId={playingVideoId} onClose={() => setPlayingVideoId(null)} />}
      
      <ProfileSidebar isOpen={showProfile} onClose={() => setShowProfile(false)} />
      
      {/* Sidebar for Thread History */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onNewChat={handleNewChat}
        onSelectThread={handleSelectThread}
        currentThreadId={currentThreadId}
        locale="zh"
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all ${isSidebarOpen ? 'md:ml-0' : ''}`}>
        <header className="relative z-50 w-full flex items-center justify-between px-5 py-4 md:px-6 md:py-5 shrink-0">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white transition-all"
        >
          <i className="fa-solid fa-bars text-xl"></i>
        </button>
        <div className="flex items-center gap-1.5">
           <span className="text-[14px] md:text-[16px] font-black tracking-tighter uppercase opacity-90">WayPal<span className="text-[#00df81]">.ai</span></span>
        </div>
        {/* 登录按钮已移至侧边栏底部 */}
        </header>

        <main className="relative z-10 w-full max-w-2xl mx-auto flex-1 flex flex-col px-5 md:px-6 overflow-hidden">
        {!isStarted ? (
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-up py-4">
            <div className="text-center mb-8 md:mb-12 space-y-4 md:space-y-6">
                <div className="flex justify-center mb-8 md:mb-10">
                    <div className="w-24 h-24 md:w-36 md:h-36 flex items-center justify-center">
                      <FrogLogoIcon className="w-full h-full" />
                    </div>
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter drop-shadow-2xl">您想前往哪家奢华酒店？</h1>
                <p className="text-white/40 text-[14px] md:text-[16px] font-medium tracking-wide">早安，WayPal 是您的奢华酒店预定助手</p>
            </div>
            
            <div className="w-full max-w-lg space-y-8 md:space-y-10">
              {/* 隐藏四个按钮，改为网站介绍 */}
              {/* <div className="grid grid-cols-4 gap-3 md:gap-5">
                  {quickActions.map((a, i) => (
                    <button 
                      key={i} 
                      onClick={() => a.action ? handleSend(a.action) : undefined}
                      disabled={!a.action}
                      className={`flex flex-col items-center gap-3 bg-white/[0.03] backdrop-blur-3xl border border-white/5 p-4 md:p-6 rounded-[24px] md:rounded-[32px] transition-all group ${
                        a.action 
                          ? 'hover:bg-white/[0.08] active:scale-95 cursor-pointer' 
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="text-[#00df81] text-lg md:text-2xl group-hover:scale-110 transition-transform">{a.icon}</div>
                      <span className="text-[10px] md:text-[11px] font-black text-white/40 tracking-[0.05em] uppercase text-center">{a.label}</span>
                    </button>
                  ))}
              </div> */}

              <div className="w-full bg-white/[0.04] border border-white/10 backdrop-blur-[80px] rounded-[48px] p-8 md:p-12 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.6)] relative transition-transform hover:scale-[1.01] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                
                <div className="relative z-10 space-y-10 md:space-y-12">
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="flex-1 flex items-center gap-4 md:gap-6">
                      <div className="w-6 h-6 flex items-center justify-center text-white/20 shrink-0"><i className="fa-solid fa-magnifying-glass text-xl"></i></div>
                      <div className="flex-1">
                        <span className="text-[11px] text-[#00df81] font-black uppercase tracking-[0.2em] mb-2 block ml-1">目的地酒店</span>
                        <input 
                          className="w-full bg-transparent text-xl md:text-3xl font-black text-white border-none outline-none placeholder-white/5 tracking-tight" 
                          placeholder={isAuthenticated ? "例如：香港瑰丽酒店" : "请先登录"} 
                          value={hotelName} 
                          onChange={e => setHotelName(e.target.value)} 
                          onKeyDown={e => e.key === 'Enter' && hotelName.trim() && isAuthenticated && handleSend("全网找优惠")}
                          disabled={!isAuthenticated}
                        />
                      </div>
                    </div>
                    <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); isAuthenticated && handleSend("全网找优惠"); }} 
                        disabled={!hotelName.trim() || !isAuthenticated}
                        className={`px-6 md:px-8 py-3 md:py-4 rounded-full flex items-center justify-center text-black shadow-[0_20px_40px_-10px_rgba(18,214,94,0.4)] active:scale-95 transition-all shrink-0 font-black text-sm md:text-base tracking-tight ${
                          hotelName.trim() && isAuthenticated
                            ? 'bg-[#12d65e] hover:bg-[#15e064] cursor-pointer' 
                            : 'bg-white/10 text-white/30 cursor-not-allowed'
                        }`}
                    >
                        {!isAuthenticated ? '请先登录' : '全网查价格'}
                    </button>
                  </div>
                  
                  <div className="w-full h-px bg-white/10" />

                  <div className="flex items-center gap-8 md:gap-16">
                    <div className="flex-1 cursor-pointer group min-w-0" onClick={() => setIsCalendarOpen(true)}>
                        <span className="text-[11px] text-[#00df81] font-black uppercase tracking-[0.2em] mb-2 block ml-1 group-hover:text-white transition-colors">计划时段</span>
                        <div className="text-[14px] md:text-[20px] lg:text-[22px] font-black text-white group-hover:text-[#12d65e] transition-colors leading-relaxed truncate">
                          {getFormattedDatesDisplay()}
                        </div>
                    </div>
                    <div className="w-px h-10 bg-white/10 shrink-0" />
                    <div className="flex-1 min-w-0 cursor-pointer group" onClick={() => setIsOccupancyOpen(true)}>
                        <span className="text-[11px] text-[#00df81] font-black uppercase tracking-[0.2em] mb-2 block ml-1 group-hover:text-white transition-colors">入住人数</span>
                        <div className="text-[14px] md:text-[20px] lg:text-[22px] font-black text-white group-hover:text-[#12d65e] transition-colors leading-relaxed truncate">
                          {getGuestsDisplay()}
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div ref={scrollRef} className="flex-1 space-y-8 md:space-y-12 py-4 md:py-6 no-scrollbar overflow-y-auto relative">
            {/* Interactive Sticky Header */}
            <div className="sticky top-0 z-30 mb-2">
               <div className="w-full bg-white/[0.03] backdrop-blur-3xl rounded-[16px] md:rounded-[20px] p-3 md:p-4 flex items-center justify-between border border-white/5 shadow-2xl overflow-hidden group/header">
                  <div 
                    className="flex items-center gap-2 md:gap-3 truncate cursor-pointer hover:opacity-80 active:scale-[0.98] transition-all"
                    onClick={() => setIsStarted(false)}
                    title="点击修改酒店名称"
                  >
                    <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-[#12d65e]/20 flex items-center justify-center shrink-0 border border-[#12d65e]/30 group-hover/header:border-[#12d65e]/60 transition-colors"><i className="fa-solid fa-location-dot text-[#12d65e] text-[8px] md:text-[9px]"></i></div>
                    <span className="text-[12px] md:text-[14px] font-black truncate tracking-tight group-hover/header:text-[#12d65e] transition-colors">{hotelName}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 md:gap-4 shrink-0">
                    <div 
                      className="text-[10px] md:text-[12px] text-[#12d65e] font-black tracking-wide uppercase cursor-pointer hover:opacity-70 active:scale-95 transition-all border-r border-white/10 pr-3 md:pr-4"
                      onClick={() => setIsCalendarOpen(true)}
                      title="点击修改日期"
                    >
                      {getFormattedDatesDisplay(true)}
                    </div>
                    <div 
                      className="text-[10px] md:text-[12px] text-white/60 font-black tracking-wide uppercase cursor-pointer hover:text-[#12d65e] active:scale-95 transition-all"
                      onClick={() => setIsOccupancyOpen(true)}
                      title="点击修改人数"
                    >
                      {getGuestsDisplay()}
                    </div>
                  </div>
               </div>
            </div>

            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} w-full animate-fade-up`}>
                {msg.role === 'assistant' ? (
                  <div className="w-full space-y-4 md:space-y-5">
                    <div className="flex items-center gap-2 mb-1 ml-1 opacity-80">
                      <FrogLogoIcon className="w-5 h-5" />
                      <span className="text-[11px] font-black text-[#12d65e] uppercase tracking-[0.2em]">WayPal Assistant</span>
                    </div>
                    <div className="text-[14px] md:text-[16px] text-white/90 leading-[1.7] md:leading-[1.8] tracking-tight message-content pl-1 max-w-full">
                      {msg.id.startsWith('analysis-') ? (
                        <ExpertAnalysisCard analysis={msg.content} locale="zh" />
                      ) : (
                        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                      )}
                      {msg.type === 'comparison' && msg.comparisonData && (
                        <>
                          <DarkComparisonTable 
                            data={msg.comparisonData}
                            onBook={(row) => {
                              if (row.websiteUrl) {
                                window.open(row.websiteUrl, '_blank');
                              }
                            }}
                          />
                          {comparisonContext && (
                            <DeepAnalysisButton
                              onAnalyze={handleDeepAnalysis}
                              isLoading={isLoading}
                              locale="zh"
                            />
                          )}
                        </>
                      )}
                      {msg.type === 'room-tour' && <VideoTourList videos={msg.roomTourVideos || []} onPlay={(id) => setPlayingVideoId(id)} />}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[85%] bg-[#12d65e] text-black px-4 py-2.5 md:px-6 md:py-3.5 rounded-[20px] md:rounded-[28px] text-[14px] md:text-[15px] font-black shadow-xl shadow-[#12d65e]/10 break-words">
                    {msg.content}
                  </div>
                )}
              </div>
            ))}
            {isLoading && <GeminiLoading />}
            <div className="h-44 md:h-56 shrink-0" />
          </div>
        )}

        {isStarted && (
          <div className="fixed bottom-0 left-0 right-0 z-40 w-full max-w-2xl mx-auto px-5 pb-8 md:px-6 md:pb-12 pt-6 bg-gradient-to-t from-[#050607] via-[#050607]/95 to-transparent backdrop-blur-[2px] safe-area-inset-bottom">
            <div className="flex flex-col gap-4 md:gap-5">
              <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
                  {(dynamicSuggestions.length > 0 ? dynamicSuggestions.map(s => ({ label: s, icon: <i className="fa-solid fa-sparkles"></i>, action: s })) : quickActions.filter(a => a.action)).map((a, i) => (
                      <button 
                          key={i} 
                          onClick={() => a.action && handleSend(a.action)}
                          className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/[0.04] border border-white/10 text-[10px] md:text-[11px] font-black text-white/60 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all whitespace-nowrap active:scale-95 shadow-lg shadow-black/20"
                      >
                          <span className="text-[#12d65e] text-[10px] opacity-80">{a.icon}</span>
                          {a.label}
                      </button>
                  ))}
              </div>

              <div className={`relative flex items-center bg-white/[0.04] backdrop-blur-[60px] rounded-[36px] p-2 md:p-2.5 pl-5 md:pl-7 gap-3 md:gap-4 border transition-all shadow-[0_20px_80px_-15px_rgba(0,0,0,0.6)] ${isInputFocused ? 'border-white/20 ring-1 ring-white/10' : 'border-white/10'}`}>
                  <button className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-white/20 hover:text-white/60 transition-all active:scale-90 bg-white/5 rounded-full">
                    <i className="fa-solid fa-plus text-sm md:text-base"></i>
                  </button>
                  <input 
                      value={inputValue} 
                      onChange={e => setInputValue(e.target.value)} 
                      onKeyDown={e => e.key === 'Enter' && handleSend()} 
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      placeholder="咨询详情或预定方案..." 
                      className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/20 py-3 md:py-4 text-[14px] md:text-[16px] font-medium tracking-tight" 
                  />
                  <button 
                      onClick={() => handleSend()} 
                      disabled={!inputValue.trim()}
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 shrink-0 shadow-2xl ${inputValue.trim() ? 'bg-[#12d65e] text-black shadow-[#12d65e]/30 scale-100' : 'bg-white/5 text-white/10 scale-95 cursor-not-allowed'}`}
                  >
                      <i className="fa-solid fa-arrow-up text-lg md:text-xl"></i>
                  </button>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
