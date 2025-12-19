'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Sparkles, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AnalystComparisonCard from './EvaluationTable';
import { SearchContext } from './SearchContextBar';
import SummaryPill from './SummaryPill';
import AnalystDatePicker from './AnalystDatePicker';
import StepLoader from './StepLoader';
import { sendMessageToAgent, compareHotel, parseEvaluationReply, EvaluationData } from '@/api/agentApi';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string | React.ReactNode;
  timestamp: Date;
}

interface AnalystProps {
  locale?: string;
  threadId?: string | null;
  onThreadUpdate?: (threadId: string, title: string, isExpertMode: boolean) => void;
}

export default function Analyst({ locale = 'en', threadId, onThreadUpdate }: AnalystProps) {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isZh = locale === 'zh';
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showNewMessageToast, setShowNewMessageToast] = useState(false);
  const [showHistoryToast, setShowHistoryToast] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSummaryPillEdit, setShowSummaryPillEdit] = useState(false);
  const [isCheckHotelMode, setIsCheckHotelMode] = useState(true); // Default: checked
  const [isModeLocked, setIsModeLocked] = useState(false); // Lock mode after first message
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(threadId || null);

  // Reset state when threadId changes (new chat)
  useEffect(() => {
    if (!threadId) {
      // New chat - reset everything
      setMessages([]);
      setInputValue('');
      setIsModeLocked(false);
      setCurrentThreadId(null);
      setSearchContext({
        hotelName: '',
        checkIn: (() => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          return tomorrow;
        })(),
        checkOut: (() => {
          const dayAfter = new Date();
          dayAfter.setDate(dayAfter.getDate() + 4);
          dayAfter.setHours(0, 0, 0, 0);
          return dayAfter;
        })(),
        rooms: 1,
        adults: 2,
        children: 0,
        roomType: 'Basic Room',
        preferences: 'None',
        isConfirmed: false,
      });
      setIsCheckHotelMode(true); // Reset to default
    } else {
      // Load existing thread
      setCurrentThreadId(threadId);
      setIsModeLocked(true); // Lock mode for existing threads
      // TODO: Load thread data from storage/API
    }
  }, [threadId]);

  // Search Context State
  const [searchContext, setSearchContext] = useState<SearchContext>(() => {
    const defaultCheckIn = new Date();
    defaultCheckIn.setDate(defaultCheckIn.getDate() + 1);
    defaultCheckIn.setHours(0, 0, 0, 0);
    const defaultCheckOut = new Date();
    defaultCheckOut.setDate(defaultCheckOut.getDate() + 4);
    defaultCheckOut.setHours(0, 0, 0, 0);
    
    return {
      hotelName: '',
      checkIn: defaultCheckIn,
      checkOut: defaultCheckOut,
      rooms: 1,
      adults: 2,
      children: 0,
      roomType: 'Basic Room',
      preferences: 'None',
      isConfirmed: false,
    };
  });
  
  // Get or generate persistent user ID for agent API (stored in localStorage)
  const getUserId = (): string => {
    if (typeof window === 'undefined') return 'anonymous';
    
    // Generate and store a persistent UUID in localStorage
    const storageKey = 'waypal_user_id';
    let userId = localStorage.getItem(storageKey);
    if (!userId) {
      // Generate a UUID-like string
      userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem(storageKey, userId);
    }
    return userId;
  };

  // Search History Management (max 5 items, stored in localStorage)
  const getSearchHistory = (): SearchContext[] => {
    if (typeof window === 'undefined') return [];
    try {
      const historyStr = localStorage.getItem('waypal_search_history');
      if (!historyStr) return [];
      const history = JSON.parse(historyStr);
      // Convert date strings back to Date objects and ensure all required fields exist
      return history.map((item: any) => ({
        ...item,
        checkIn: item.checkIn ? new Date(item.checkIn) : null,
        checkOut: item.checkOut ? new Date(item.checkOut) : null,
        rooms: item.rooms ?? 1,
        adults: item.adults ?? 2,
        children: item.children ?? 0,
        roomType: item.roomType ?? 'Basic Room',
        preferences: item.preferences ?? 'None',
        isConfirmed: item.isConfirmed ?? false,
      }));
    } catch (error) {
      console.error('[AIAnalyst] Failed to load search history:', error);
      return [];
    }
  };

  const saveSearchHistory = (context: SearchContext) => {
    if (typeof window === 'undefined') return;
    try {
      let history = getSearchHistory();
      
      // Remove duplicates (same hotel name)
      history = history.filter((item) => item.hotelName !== context.hotelName);
      
      // Add new item at the beginning
      history.unshift(context);
      
      // Keep only last 5 items
      history = history.slice(0, 5);
      
      // Save to localStorage
      localStorage.setItem('waypal_search_history', JSON.stringify(history));
    } catch (error) {
      console.error('[AIAnalyst] Failed to save search history:', error);
    }
  };

  // Load search history on mount (client-side only to avoid hydration mismatch)
  const [searchHistory, setSearchHistory] = useState<SearchContext[]>([]);

  // Load search history after component mounts (client-side only)
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  // Handle loading a history item - with animation
  const handleLoadHistory = async (historyContext: SearchContext) => {
    setInputValue(historyContext.hotelName);
    
    // Show toast notification
    setShowHistoryToast(true);
    setTimeout(() => setShowHistoryToast(false), 3000);
    
    setIsAnimating(true);
    
    setSearchContext(historyContext);
    
    setTimeout(() => {
      const confirmedContext: SearchContext = {
        ...historyContext,
        isConfirmed: true,
      };
      setSearchContext(confirmedContext);
      setIsAnimating(false);
      
      handleContextUpdate(confirmedContext);
    }, 300);
  };
  
  // Build natural language message from search context
  const buildContextMessage = (context: SearchContext): string => {
    const parts: string[] = [];
    
    if (context.hotelName) {
      parts.push(isZh ? `查找 ${context.hotelName}` : `Find rates for ${context.hotelName}`);
    }
    
    if (context.checkIn && context.checkOut) {
      const checkInStr = context.checkIn.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const checkOutStr = context.checkOut.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      parts.push(isZh ? `从 ${checkInStr} 到 ${checkOutStr}` : `from ${checkInStr} to ${checkOutStr}`);
    }
    
    if (context.rooms > 0) {
      parts.push(
        isZh
          ? `${context.rooms} 间客房`
          : `${context.rooms} ${context.rooms === 1 ? 'room' : 'rooms'}`
      );
    }
    
    const totalGuests = context.adults + context.children;
    if (totalGuests > 0) {
      parts.push(
        isZh
          ? `${totalGuests} 位客人${context.adults > 0 ? `（${context.adults} 位成人` : ''}${context.children > 0 ? `，${context.children} 位儿童` : ''}${context.adults > 0 || context.children > 0 ? '）' : ''}`
          : `for ${totalGuests} guest${totalGuests > 1 ? 's' : ''}${context.adults > 0 ? ` (${context.adults} adult${context.adults > 1 ? 's' : ''}` : ''}${context.children > 0 ? `, ${context.children} child${context.children > 1 ? 'ren' : ''}` : ''}${context.adults > 0 || context.children > 0 ? ')' : ''}`
      );
    }
    
    if (context.roomType && context.roomType !== 'Basic Room') {
      parts.push(isZh ? `房型：${context.roomType}` : `Room type: ${context.roomType}`);
    }
    
    if (context.preferences && context.preferences !== 'None') {
      parts.push(isZh ? `偏好：${context.preferences}` : `Preferences: ${context.preferences}`);
    }
    
    return parts.join(', ');
  };

  // Handle search context update
  const handleContextUpdate = async (updatedContext: SearchContext) => {
    const prevContext = searchContext;
    setSearchContext(updatedContext);
    
    if (updatedContext.isConfirmed && updatedContext.hotelName) {
      saveSearchHistory(updatedContext);
      setSearchHistory(getSearchHistory());
    }
    
    const contextMessage = buildContextMessage(updatedContext);
    
    const contextChanged = prevContext.isConfirmed && (
      prevContext.checkIn?.getTime() !== updatedContext.checkIn?.getTime() ||
      prevContext.checkOut?.getTime() !== updatedContext.checkOut?.getTime() ||
      prevContext.rooms !== updatedContext.rooms ||
      prevContext.adults !== updatedContext.adults ||
      prevContext.children !== updatedContext.children ||
      prevContext.roomType !== updatedContext.roomType
    );
    
    if (contextChanged) {
      const updateMessageText = buildContextMessage(updatedContext);
      const updateMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: updateMessageText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, updateMessage]);
    } else {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: contextMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
    }
    
    setIsLoading(true);
    try {
      const userId = getUserId();
      console.log('[AIAnalyst] Sending context update to agent:', {
        message: contextMessage,
        context: updatedContext,
        userId,
      });
      
      let timeoutId: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(isZh ? '请求超时，请稍后重试' : 'Request timeout, please try again later'));
        }, 300000); // 300 seconds (5 minutes)
      });
      
      let response: any;
      try {
        response = await Promise.race([
          sendMessageToAgent(contextMessage, userId),
          timeoutPromise,
        ]) as any;
        
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      } catch (raceError) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        throw raceError;
      }
      
      console.log('[AIAnalyst] Received response:', response);
      
      if (response.status === 'buffered' || !response.reply) {
        const bufferedMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: isZh ? '消息已收到，正在处理中...' : 'Message received, processing...',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, bufferedMessage]);
      } else if (response.reply_type === 'evaluation') {
        await handleEvaluationResponse(response);
      } else {
        let replyText = '';
        try {
          if (response.reply) {
            try {
              const parsed = JSON.parse(response.reply);
              replyText = parsed.text || parsed.message || response.reply;
            } catch {
              replyText = response.reply;
            }
          } else {
            replyText = isZh ? '未收到回复' : 'No reply received';
          }
        } catch {
          replyText = response.reply || (isZh ? '未收到回复' : 'No reply received');
        }
        
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: replyText,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      console.error('[AIAnalyst] Failed to process context update:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: isZh
          ? `抱歉，处理您的请求时出现错误：${error.message || '未知错误'}`
          : `Sorry, an error occurred while processing your request: ${error.message || 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle evaluation response
  const handleEvaluationResponse = async (response: any) => {
    try {
      const evaluationData = parseEvaluationReply(response.reply);
      
      // Debug: Log the evaluation data structure
      console.log('[AIAnalyst] Evaluation data:', evaluationData);
      console.log('[AIAnalyst] Table rows:', evaluationData.table_rows);
      console.log('[AIAnalyst] Reply JSON:', evaluationData.reply_json);
      if (evaluationData.table_rows && evaluationData.table_rows.length > 0) {
        evaluationData.table_rows.forEach((row, idx) => {
          console.log(`[AIAnalyst] Row ${idx} (${row.platform}):`, {
            platform: row.platform,
            benefits: row.benefits,
            perks: row.perks,
          });
        });
      }
      
      if (!evaluationData.table_rows || evaluationData.table_rows.length === 0) {
        const noDataMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: isZh
            ? '抱歉，未找到相关报价信息。请尝试调整搜索条件或稍后再试。'
            : 'Sorry, no rates found. Please try adjusting your search criteria or try again later.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, noDataMessage]);
        return;
      }
      
      if (evaluationData.checkin_date && evaluationData.checkout_date) {
        try {
          const newCheckIn = new Date(evaluationData.checkin_date);
          newCheckIn.setHours(0, 0, 0, 0);
          const newCheckOut = new Date(evaluationData.checkout_date);
          newCheckOut.setHours(0, 0, 0, 0);
          
          if (!isNaN(newCheckIn.getTime()) && !isNaN(newCheckOut.getTime()) && newCheckOut > newCheckIn) {
            setSearchContext((prev) => ({
              ...prev,
              checkIn: newCheckIn,
              checkOut: newCheckOut,
            }));
          }
        } catch (dateError) {
          console.error('[AIAnalyst] Failed to parse dates from API response:', dateError);
        }
      }
      
      const displayCheckIn = searchContext.checkIn || new Date();
      const displayCheckOut = searchContext.checkOut || new Date();
      
      const tableRows = convertEvaluationDataToRows(evaluationData, locale);
      const hotelName = isZh
        ? (evaluationData.hotel_name_cn || evaluationData.hotel_name || 'Hotel')
        : (evaluationData.hotel_name || 'Hotel');
      
      // Extract location from searchContext
      const location = searchContext.hotelName || '';
      
      const tableMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: (
          <AnalystComparisonCard
            hotelName={hotelName}
            location={location}
            dateRange={`${formatDate(displayCheckIn, isZh)} - ${formatDate(displayCheckOut, isZh)}`}
            rows={tableRows}
            locale={locale}
            showDatePicker={false}
          />
        ),
        timestamp: new Date(),
      };
      
      const assistantMessages: Message[] = [tableMessage];
      
      if (evaluationData.deep_analysis) {
        if (evaluationData.deep_analysis.price || evaluationData.deep_analysis.perks) {
          const analysisText = [
            evaluationData.deep_analysis.price,
            evaluationData.deep_analysis.perks,
          ]
            .filter(Boolean)
            .join('\n\n');
          
          const analysisMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: (
              <div className="px-4 py-3">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start gap-2 mb-3">
                    <Info className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      {isZh ? 'WAYPAL 深度分析' : 'WAYPAL DEEP ANALYSIS'}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {analysisText.split('\n\n').map(
                      (paragraph, index) =>
                        paragraph.trim() && (
                          <div
                            key={index}
                            className="bg-white rounded-lg px-4 py-3 border border-gray-200 shadow-sm"
                          >
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                              {paragraph.trim()}
                            </p>
                          </div>
                        )
                    )}
                  </div>
                </div>
              </div>
            ),
            timestamp: new Date(),
          };
          assistantMessages.push(analysisMessage);
        }
      }
      
      setMessages((prev) => [...prev, ...assistantMessages]);
    } catch (error: any) {
      console.error('[AIAnalyst] Failed to handle evaluation response:', error);
      throw error;
    }
  };

  const sampleQueries = [
    'The Ritz-Carlton, New York',
    'Four Seasons Paris',
    'Mandarin Oriental Tokyo',
    'Grand Hyatt San Francisco',
  ];

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const checkScrollPosition = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setIsNearBottom(distanceFromBottom < 200);
    };

    container.addEventListener('scroll', checkScrollPosition);
    checkScrollPosition();

    return () => container.removeEventListener('scroll', checkScrollPosition);
  }, []);

  useEffect(() => {
    if (isNearBottom && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else if (!isNearBottom && messages.length > 0) {
      setShowNewMessageToast(true);
      setTimeout(() => setShowNewMessageToast(false), 3000);
    }
  }, [messages, isLoading, isNearBottom]);

  const handleScrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsNearBottom(true);
    setShowNewMessageToast(false);
  };

  const setDefaultDates = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 4);
    dayAfter.setHours(0, 0, 0, 0);
    
    if (!searchContext.checkIn || !searchContext.checkOut) {
      setSearchContext((prev) => ({
        ...prev,
        checkIn: tomorrow,
        checkOut: dayAfter,
      }));
    }
  };

  // Format SearchContext to compareHotel API format
  const formatSearchContextForCompare = (context: SearchContext): any => {
    const formatDate = (date: Date | null): string => {
      if (!date) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      destination: context.hotelName || '',
      hotel_name: context.hotelName || '',
      check_in: formatDate(context.checkIn),
      check_out: formatDate(context.checkOut),
      room_count: context.rooms || 1,
      room_type: context.roomType && context.roomType !== 'Basic Room' ? context.roomType : null,
      adults: context.adults || 2,
      children: context.children || 0,
      additional_notes: context.preferences && context.preferences !== 'None' ? context.preferences : '无特别偏好',
    };
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const messageText = inputValue.trim();
    const currentInput = inputValue;
    setInputValue('');

    // Mode 1: Check Hotel Mode (Structured Search)
    if (isCheckHotelMode) {
      // If context is not confirmed, treat input as hotel name
      if (!searchContext.isConfirmed) {
      setDefaultDates();
      
      const updatedContext: SearchContext = {
        ...searchContext,
        hotelName: messageText,
        checkIn: searchContext.checkIn || (() => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          return tomorrow;
        })(),
        checkOut: searchContext.checkOut || (() => {
          const dayAfter = new Date();
          dayAfter.setDate(dayAfter.getDate() + 4);
          dayAfter.setHours(0, 0, 0, 0);
          return dayAfter;
        })(),
      };
      
      const confirmedContext: SearchContext = {
        ...updatedContext,
        isConfirmed: true,
      };
      setSearchContext(confirmedContext);
      setIsModeLocked(true); // Lock mode after first message
      
      // Generate thread ID if not exists
      if (!currentThreadId) {
        const newThreadId = `thread_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        setCurrentThreadId(newThreadId);
        if (onThreadUpdate) {
          onThreadUpdate(newThreadId, messageText, true);
        }
      }
      
      setTimeout(() => {
        handleContextUpdate(confirmedContext);
      }, 100);
      
      return;
      }

      // Context is confirmed, use structured compare API
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: buildContextMessage(searchContext),
        timestamp: new Date(),
      };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    
    // Lock mode after first message
    if (!isModeLocked) {
      setIsModeLocked(true);
      // Generate thread ID if not exists
      if (!currentThreadId) {
        const newThreadId = `thread_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        setCurrentThreadId(newThreadId);
        if (onThreadUpdate) {
          onThreadUpdate(newThreadId, searchContext.hotelName || 'Hotel Search', true);
        }
      }
    }

    try {
        const userId = getUserId();
        const compareParams = formatSearchContextForCompare(searchContext);
        
        console.log('[AIAnalyst] Sending compare request:', { params: compareParams, userId });
        
        let timeoutId: NodeJS.Timeout | null = null;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(isZh ? '请求超时，请稍后重试' : 'Request timeout, please try again later'));
          }, 300000); // 300 seconds (5 minutes)
        });
        
        let response: any;
        try {
          response = await Promise.race([
            compareHotel(compareParams, userId),
            timeoutPromise,
          ]) as any;
        
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      } catch (raceError) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        throw raceError;
      }
      
      console.log('[AIAnalyst] Received response:', { 
        status: response.status, 
        reply_type: response.reply_type,
        has_reply: !!response.reply,
        reply_length: response.reply?.length 
      });
      
      if (response.status === 'buffered' || !response.reply) {
        const bufferedMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: isZh 
            ? '消息已收到，正在处理中...'
            : 'Message received, processing...',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, bufferedMessage]);
        setIsLoading(false);
        return;
      }
      
      if (response.reply_type === 'evaluation') {
        await handleEvaluationResponse(response);
      } else {
        let replyText = '';
        try {
          if (response.reply) {
            try {
              const parsed = JSON.parse(response.reply);
              replyText = parsed.text || parsed.message || response.reply;
            } catch {
              replyText = response.reply;
            }
          } else {
            replyText = isZh ? '未收到回复' : 'No reply received';
          }
        } catch {
          replyText = response.reply || (isZh ? '未收到回复' : 'No reply received');
        }
        
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: replyText,
          timestamp: new Date(),
        };
        
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      console.error('[AIAnalyst] Failed to get agent response:', error);
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: isZh 
          ? `抱歉，处理您的请求时出现错误：${error.message || '未知错误'}`
          : `Sorry, an error occurred while processing your request: ${error.message || 'Unknown error'}`,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
    return; // End of Check Hotel Mode
    }

    // Mode 2: General Chat Mode (LLM Semantic Analysis)
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    
    // Lock mode after first message
    if (!isModeLocked) {
      setIsModeLocked(true);
      // Generate thread ID if not exists
      if (!currentThreadId) {
        const newThreadId = `thread_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        setCurrentThreadId(newThreadId);
        if (onThreadUpdate) {
          onThreadUpdate(newThreadId, messageText.substring(0, 50), false);
        }
      }
    }

    try {
      const userId = getUserId();
      console.log('[AIAnalyst] Sending message to agent:', { messageText, userId });
      
      let timeoutId: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(isZh ? '请求超时，请稍后重试' : 'Request timeout, please try again later'));
        }, 300000); // 300 seconds (5 minutes)
      });
      
      let response: any;
      try {
        response = await Promise.race([
          sendMessageToAgent(messageText, userId),
          timeoutPromise,
        ]) as any;
        
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      } catch (raceError) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        throw raceError;
      }
      
      console.log('[AIAnalyst] Received response:', { 
        status: response.status, 
        reply_type: response.reply_type,
        has_reply: !!response.reply,
        reply_length: response.reply?.length 
      });
      
      if (response.status === 'buffered' || !response.reply) {
        const bufferedMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: isZh 
            ? '消息已收到，正在处理中...'
            : 'Message received, processing...',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, bufferedMessage]);
        setIsLoading(false);
        return;
      }
      
      if (response.reply_type === 'evaluation') {
        await handleEvaluationResponse(response);
      } else {
        let replyText = '';
        try {
          if (response.reply) {
            try {
              const parsed = JSON.parse(response.reply);
              replyText = parsed.text || parsed.message || response.reply;
            } catch {
              replyText = response.reply;
            }
          } else {
            replyText = isZh ? '未收到回复' : 'No reply received';
          }
        } catch {
          replyText = response.reply || (isZh ? '未收到回复' : 'No reply received');
        }
        
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: replyText,
          timestamp: new Date(),
        };
        
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      console.error('[AIAnalyst] Failed to get agent response:', error);
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: isZh 
          ? `抱歉，处理您的请求时出现错误：${error.message || '未知错误'}`
          : `Sorry, an error occurred while processing your request: ${error.message || 'Unknown error'}`,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    // Set default dates when in Check Hotel Mode and input has content
    if (isCheckHotelMode && !searchContext.isConfirmed && messages.length === 0) {
      if (inputValue.trim() && (!searchContext.checkIn || !searchContext.checkOut)) {
        setDefaultDates();
      }
    }
  }, [inputValue, searchContext.isConfirmed, messages.length, isCheckHotelMode]);

  // General Chat Mode - Show when checkbox is unchecked and no messages
  // This should use the same stable layout structure
  if (!isCheckHotelMode && !searchContext.isConfirmed && messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col h-full">
        {/* STABLE Header - Fixed Position */}
        <div className="flex flex-col items-center justify-center flex-1 px-4 py-12">
          <div className="w-full max-w-3xl">
            {/* STABLE Title */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full border-2 border-green-500 flex items-center justify-center bg-green-50 mx-auto mb-4">
                <span className="text-3xl">🐸</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-2">
                {locale === 'zh' ? '您的AI酒店专家，为您找到最佳价格' : 'Your AI Hotel Expert for the Best Rates.'}
              </h2>
              <p className="text-sm md:text-base text-gray-500">
                {locale === 'zh' ? '专家分析 | 价格追踪 | 24/7 旅行支持' : 'Expert Analysis | Price Tracking | 24/7 Travel Support'}
              </p>
            </div>

            {/* STABLE Input Container - Fixed Width & Position */}
            <div className="w-full bg-white rounded-3xl shadow-sm border-2 border-green-100 relative mb-4" style={{ overflow: 'visible' }}>
              {/* A. Text Input Area */}
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={locale === 'zh' ? '告诉我您梦想的酒店，我会为您找到最优惠的价格...' : 'Tell me your dream hotel, and I\'ll find the best deal for you...'}
                className="w-full resize-none bg-transparent focus:outline-none px-6 py-4 pr-14 min-h-[80px] text-base md:text-lg transition-all"
                rows={3}
              />

              {/* B. No Criteria Form in General Chat Mode - Empty space for consistency */}
              <div className="px-4 pb-2 border-t border-gray-100" style={{ height: 0 }} />

              {/* C. Bottom Toolbar - Fixed Position */}
              <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100">
                {/* C1. Bottom-Left Toggle */}
                <label className="flex items-center cursor-pointer gap-2 text-sm text-gray-600 select-none">
                  <input
                    type="checkbox"
                    checked={isCheckHotelMode}
                    onChange={(e) => setIsCheckHotelMode(e.target.checked)}
                    className="rounded text-green-500 focus:ring-green-500 h-4 w-4"
                  />
                  <span>
                    {locale === 'zh' ? '专家模式（自动比价）' : 'Expert Mode (Auto-compare Best Prices)'}
                  </span>
                </label>

                {/* C2. Bottom-Right Send Button */}
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-green-500 hover:bg-green-600 transition-colors text-white rounded-full p-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Initial Onboarding State - Stable Layout
  if (!searchContext.isConfirmed && messages.length === 0 && !isLoading) {
    // Calculate nights for display
    const calculateNights = (checkIn: Date | null, checkOut: Date | null): number => {
      if (!checkIn || !checkOut) return 0;
      const ci = new Date(checkIn);
      ci.setHours(0, 0, 0, 0);
      const co = new Date(checkOut);
      co.setHours(0, 0, 0, 0);
      if (co <= ci) return 0;
      return Math.ceil((co.getTime() - ci.getTime()) / (24 * 60 * 60 * 1000));
    };

    const formatDateShort = (date: Date | null): string => {
      if (!date) return '';
      return date.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });
    };

    const nights = calculateNights(searchContext.checkIn, searchContext.checkOut);
    const totalGuests = searchContext.adults + searchContext.children;

    return (
      <div className="flex flex-col h-full">
        {/* STABLE Header - Fixed Position */}
        <div className="flex flex-col items-center justify-center flex-1 px-4 py-12">
          <div className="w-full max-w-3xl">
            {/* STABLE Title */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full border-2 border-green-500 flex items-center justify-center bg-green-50 mx-auto mb-4">
                <span className="text-3xl">🐸</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-2">
                {locale === 'zh' ? '您的AI酒店专家，为您找到最佳价格' : 'Your AI Hotel Expert for the Best Rates.'}
              </h2>
              <p className="text-sm md:text-base text-gray-500">
                {locale === 'zh' ? '专家分析 | 价格追踪 | 24/7 旅行支持' : 'Expert Analysis | Price Tracking | 24/7 Travel Support'}
              </p>
            </div>

            {/* STABLE Input Container - Fixed Width & Position */}
            <div className="w-full bg-white rounded-2xl shadow-sm border-2 border-gray-200 relative mb-4" style={{ overflow: 'visible' }}>
              {/* A. Text Input Area */}
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (isCheckHotelMode && e.target.value.trim()) {
                    setSearchContext((prev) => ({
                      ...prev,
                      hotelName: e.target.value.trim(),
                    }));
                    if (!searchContext.checkIn || !searchContext.checkOut) {
                      setDefaultDates();
                    }
                  }
                }}
                onFocus={() => {
                  if (isCheckHotelMode && inputValue.trim()) {
                    if (!searchContext.checkIn || !searchContext.checkOut) {
                      setDefaultDates();
                    }
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  isCheckHotelMode
                    ? (locale === 'zh' ? '告诉我您梦想的酒店，我会为您找到最优惠的价格...' : 'Tell me your dream hotel, and I\'ll find the best deal for you...')
                    : (locale === 'zh' ? '告诉我您梦想的酒店，我会为您找到最优惠的价格...' : 'Tell me your dream hotel, and I\'ll find the best deal for you...')
                }
                className="w-full resize-none bg-transparent focus:outline-none px-6 py-4 pr-14 min-h-[80px] text-base md:text-lg transition-all"
                rows={3}
              />

              {/* B. Collapsible Criteria Form - ANIMATED SECTION */}
              <AnimatePresence initial={false}>
                {isCheckHotelMode && (
                  <motion.div
                    key="criteria-form"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="px-4 pb-2 border-t border-gray-100"
                    style={{ overflow: 'visible' }}
                  >
                    <div className="pt-3">
                      {/* Compact Default Info Display */}
                      <div 
                        onClick={() => setShowSummaryPillEdit(!showSummaryPillEdit)}
                        className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 flex flex-wrap gap-4 cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        {searchContext.checkIn && searchContext.checkOut && (
                          <span className="flex items-center gap-1">
                            📅 {formatDateShort(searchContext.checkIn)} - {formatDateShort(searchContext.checkOut)}
                            {nights > 0 && <span className="text-gray-500">({nights} {isZh ? '晚' : nights === 1 ? 'Night' : 'Nights'})</span>}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          👥 {searchContext.rooms} {isZh ? '间' : searchContext.rooms === 1 ? 'Room' : 'Rooms'}, {totalGuests} {isZh ? '人' : totalGuests === 1 ? 'Guest' : 'Guests'}
                        </span>
                      </div>

                      {/* Expandable Edit Form */}
                      <AnimatePresence>
                        {showSummaryPillEdit && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-3"
                            style={{ overflow: 'visible', maxHeight: 'calc(100vh - 300px)' }}
                          >
                            <div className="space-y-3 pt-3 border-t border-gray-200 pb-6 max-h-[calc(100vh-350px)] overflow-y-auto">
                              {/* Date Range */}
                              <div className="relative">
                                <label className="block text-xs font-medium text-gray-700 mb-2">
                                  {locale === 'zh' ? '入住日期 / 退房日期' : 'Check-in / Check-out'}
                                </label>
                                <AnalystDatePicker
                                  checkIn={searchContext.checkIn}
                                  checkOut={searchContext.checkOut}
                                  onDatesChange={(checkIn, checkOut) => {
                                    const newCheckIn = checkIn ? new Date(checkIn.getTime()) : null;
                                    const newCheckOut = checkOut ? new Date(checkOut.getTime()) : null;
                                    
                                    if (newCheckIn) {
                                      newCheckIn.setHours(0, 0, 0, 0);
                                    }
                                    if (newCheckOut) {
                                      newCheckOut.setHours(0, 0, 0, 0);
                                    }
                                    
                                    setSearchContext((prev) => ({
                                      ...prev,
                                      checkIn: newCheckIn,
                                      checkOut: newCheckOut,
                                    }));
                                  }}
                                  locale={locale}
                                />
                              </div>

                              {/* Rooms & Guests */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">
                                  {locale === 'zh' ? '客房及宾客' : 'Rooms & Guests'}
                                </label>
                                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                  <div className="flex items-center justify-between py-1">
                                    <span className="text-xs font-medium text-gray-700">
                                      {locale === 'zh' ? '客房数量' : 'Number of Rooms'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSearchContext((prev) => ({
                                            ...prev,
                                            rooms: Math.max(1, prev.rooms - 1),
                                          }));
                                        }}
                                        disabled={searchContext.rooms <= 1}
                                        className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                                      >
                                        −
                                      </button>
                                      <span className="w-6 text-center text-xs font-medium text-gray-900">
                                        {searchContext.rooms}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSearchContext((prev) => ({
                                            ...prev,
                                            rooms: Math.min(10, prev.rooms + 1),
                                          }));
                                        }}
                                        disabled={searchContext.rooms >= 10}
                                        className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                  <div className="pt-2 border-t border-gray-200">
                                    <p className="text-xs text-gray-500 mb-1">{locale === 'zh' ? '每间客房' : 'Per Room'}</p>
                                    <div className="flex items-center justify-between py-1">
                                      <span className="text-xs font-medium text-gray-700">
                                        {locale === 'zh' ? '成人' : 'Adults'}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSearchContext((prev) => ({
                                              ...prev,
                                              adults: Math.max(1, prev.adults - 1),
                                            }));
                                          }}
                                          disabled={searchContext.adults <= 1}
                                          className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                                        >
                                          −
                                        </button>
                                        <span className="w-6 text-center text-xs font-medium text-gray-900">
                                          {searchContext.adults}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSearchContext((prev) => ({
                                              ...prev,
                                              adults: prev.adults + 1,
                                            }));
                                          }}
                                          className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors text-xs"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                      <span className="text-xs font-medium text-gray-700">
                                        {locale === 'zh' ? '儿童' : 'Children'}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSearchContext((prev) => ({
                                              ...prev,
                                              children: Math.max(0, prev.children - 1),
                                            }));
                                          }}
                                          disabled={searchContext.children <= 0}
                                          className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                                        >
                                          −
                                        </button>
                                        <span className="w-6 text-center text-xs font-medium text-gray-900">
                                          {searchContext.children}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSearchContext((prev) => ({
                                              ...prev,
                                              children: prev.children + 1,
                                            }));
                                          }}
                                          className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors text-xs"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Close Edit Button */}
                              <div className="flex justify-end pt-2 border-t border-gray-200">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowSummaryPillEdit(false);
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                  {locale === 'zh' ? '完成' : 'Done'}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* C. Bottom Toolbar - Fixed Position */}
              <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100">
                {/* C1. Bottom-Left Toggle */}
                <label className="flex items-center cursor-pointer gap-2 text-sm text-gray-600 select-none">
                  <input
                    type="checkbox"
                    checked={isCheckHotelMode}
                    onChange={(e) => setIsCheckHotelMode(e.target.checked)}
                    className="rounded text-green-500 focus:ring-green-500 h-4 w-4"
                  />
                  <span>
                    {locale === 'zh' ? '专家模式（自动比价）' : 'Expert Mode (Auto-compare Best Prices)'}
                  </span>
                </label>

                {/* C2. Bottom-Right Send Button */}
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-green-500 hover:bg-green-600 transition-colors text-white rounded-full p-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* STABLE Suggestions - Fixed Position */}
            <div className="space-y-2">
              <p className="text-sm text-gray-500 text-center mb-3">
                {locale === 'zh' ? '专家推荐：' : 'Expert Recommendations:'}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {sampleQueries.map((query, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInputValue(query);
                      // Always just fill the input and focus it, never auto-send
                      setTimeout(() => {
                        inputRef.current?.focus();
                      }, 100);
                    }}
                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-full hover:border-green-500 hover:text-green-500 transition-colors"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chat State - Context is confirmed or General Chat Mode
  return (
    <div className="flex flex-col h-full">

      <div className="flex-1 overflow-y-auto px-4 py-6 min-h-0 pb-32" style={{ scrollPaddingTop: '100px' }}>
        <div className="w-full max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'user' ? (
                <div className="max-w-[80%] bg-green-500 text-white px-4 py-3 rounded-3xl rounded-tr-none shadow-md">
                  <div className="text-sm whitespace-pre-wrap">{message.content as string}</div>
                </div>
              ) : (
                <div className="max-w-full w-full">
                  {typeof message.content === 'string' ? (
                    <div className="bg-white border border-gray-200 rounded-3xl rounded-tl-none px-4 py-3 shadow-sm flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm">🐸</span>
                      </div>
                      <div className="flex-1 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none shadow-sm overflow-hidden">
                      {message.content}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {isLoading && <StepLoader locale={locale} />}

          <div ref={messagesEndRef} />
          
          {showNewMessageToast && (
            <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
              <button
                onClick={handleScrollToBottom}
                className="px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                <ArrowUp className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {isZh ? '新消息' : 'New Message'}
                </span>
              </button>
            </div>
          )}
          
          {showHistoryToast && (
            <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-4">
              <div className="px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg flex items-center gap-2">
                <span className="text-lg">🐸</span>
                <span className="text-sm font-medium">
                  {isZh ? '专家正在为您检索最新价格...' : 'Expert is retrieving latest rates for you...'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0 z-10 shadow-lg relative">
        <div className="w-full max-w-4xl mx-auto space-y-2">
          {/* Summary Pill - Show when in Expert Mode and context is confirmed */}
          {isCheckHotelMode && searchContext.isConfirmed && (
            <SummaryPill
              context={searchContext}
              onUpdate={handleContextUpdate}
              locale={locale}
              isExpanded={showSummaryPillEdit}
              onToggleExpand={() => setShowSummaryPillEdit(!showSummaryPillEdit)}
            />
          )}
          
          <div className="relative flex items-end gap-2">
            {/* Check Hotel Toggle - Only show when mode is not locked */}
            {!isModeLocked && (
              <label className="flex items-center gap-2 cursor-pointer flex-shrink-0 mb-3">
                <input
                  type="checkbox"
                  checked={isCheckHotelMode}
                  onChange={(e) => setIsCheckHotelMode(e.target.checked)}
                  className="w-4 h-4 text-green-500 border-gray-300 rounded focus:ring-green-500 bg-white"
                />
                <span className="text-sm text-gray-700 whitespace-nowrap">
                  {locale === 'zh' ? '专家模式（自动比价）' : 'Expert Mode (Auto-compare Best Prices)'}
                </span>
              </label>
            )}
            
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isCheckHotelMode
                    ? (locale === 'zh' ? '继续询问...' : 'Continue asking...')
                    : (locale === 'zh' ? '输入您的问题...' : 'Type your question...')
                }
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-base md:text-sm transition-all"
                rows={2}
              />
              
              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className="absolute bottom-3 right-3 w-8 h-8 bg-green-500 text-white rounded-lg flex items-center justify-center hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Format date helper
function formatDate(date: Date | null, isZh: boolean): string {
  if (!date) return '';
  return date.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Convert API evaluation data to component row format
function convertEvaluationDataToRows(
  evaluationData: EvaluationData,
  locale: string
): any[] {
  const isZh = locale === 'zh';
  
  // Prioritize reply_json.table_rows if available
  const tableRows = evaluationData.reply_json?.table_rows || evaluationData.table_rows || [];
  
  if (tableRows.length === 0) {
    return [];
  }
  
  return tableRows.map((row, index) => {
    // Debug: Log each row's data structure
    console.log(`[convertEvaluationDataToRows] Processing row ${index} (${row.platform}):`, {
      platform: row.platform,
      benefits: row.benefits,
      perks: row.perks,
    });
    
    let breakfast: 'included' | 'not_included' | 'daily_double' = 'not_included';
    if (row.perks?.breakfastInclude !== undefined) {
      if (row.perks.breakfastInclude) {
        const breakfastDetail = (row.perks.breakfastDetail || '').toLowerCase();
        breakfast = breakfastDetail.includes('daily') || breakfastDetail.includes('每日') || breakfastDetail.includes('double')
          ? 'daily_double'
          : 'included';
      }
    } else {
      const breakfastDetail = (row.perks?.breakfastDetail || '').toLowerCase();
      if (breakfastDetail.includes('daily') || breakfastDetail.includes('每日') || breakfastDetail.includes('double')) {
        breakfast = 'daily_double';
      } else if (breakfastDetail.includes('included') || breakfastDetail.includes('含早') || breakfastDetail.includes('breakfast')) {
        breakfast = 'included';
      }
    }
    
    const cancellationPolicy = row.policy?.cancellationPolicy || '';
    const cancellationType = getCancellationType(cancellationPolicy);
    const cancellationDetails = row.policy?.cancellationDetails || '';
    
    const paymentPolicyStr = row.policy?.paymentPolicy || '';
    let paymentPolicy: 'online_payment' | 'guaranteed_payment_on_arrival' | 'pay_at_hotel' = 'pay_at_hotel';
    let paymentPolicyText = isZh ? '到店付' : 'Pay at Hotel';
    
    if (paymentPolicyStr === 'online_payment' || row.policy?.canUserPrepay) {
      paymentPolicy = 'online_payment';
      paymentPolicyText = isZh ? '在线预付' : 'Prepay Online';
    } else if (paymentPolicyStr === 'guaranteed_payment_on_arrival' || row.policy?.guaranteeType === 'GUARANTEE') {
      paymentPolicy = 'guaranteed_payment_on_arrival';
      paymentPolicyText = isZh ? '担保到付' : 'Guarantee';
    }
    
    // Extract promotions from benefits
    const promotions = row.benefits?.promotions || [];
    console.log(`[convertEvaluationDataToRows] Row ${index} promotions:`, promotions);
    
    // Extract perks - prioritize structured perks from benefits, fallback to legacy format
    let structuredPerks: Array<{ label: string; detail: string }> = [];
    if (row.benefits?.perks && typeof row.benefits.perks === 'object') {
      structuredPerks = Object.entries(row.benefits.perks as Record<string, string>)
        .filter(([key, value]) => typeof value === 'string' && value.trim())
        .map(([key, value]) => ({
          label: key,
          detail: value as string,
        }));
    }
    console.log(`[convertEvaluationDataToRows] Row ${index} structuredPerks:`, structuredPerks);
    
    // Also check if perks data is directly in row.perks (for LuxTrip)
    if (structuredPerks.length === 0 && row.perks && typeof row.perks === 'object') {
      // Check if it's a structured perks object (not the legacy format)
      const perksKeys = Object.keys(row.perks);
      const hasStructuredPerks = perksKeys.some(key => 
        key !== 'breakfastInclude' && 
        key !== 'breakfastDetail' && 
        key !== 'pointsAccumulatable' && 
        key !== 'vipBenefits' && 
        key !== 'perksValue' &&
        typeof (row.perks as any)[key] === 'string'
      );
      
      if (hasStructuredPerks) {
        structuredPerks = Object.entries(row.perks as Record<string, any>)
          .filter(([key, value]) => 
            key !== 'breakfastInclude' && 
            key !== 'breakfastDetail' && 
            key !== 'pointsAccumulatable' && 
            key !== 'vipBenefits' && 
            key !== 'perksValue' &&
            typeof value === 'string' && 
            value.trim()
          )
          .map(([key, value]) => ({
            label: key,
            detail: value as string,
          }));
        console.log(`[convertEvaluationDataToRows] Row ${index} extracted structuredPerks from row.perks:`, structuredPerks);
      }
    }
    
    // Check if perks is in legacy format (with pointsAccumulatable object)
    const legacyPerks = row.perks && typeof row.perks === 'object' && 'pointsAccumulatable' in row.perks 
      ? (row.perks as any).pointsAccumulatable 
      : null;
    const isLegacyFormat = legacyPerks && typeof legacyPerks === 'object' && 'is_accumulatable' in legacyPerks;
    
    const perks: any = {
      breakfast,
      pointsAccumulatable: isLegacyFormat ? !!legacyPerks.is_accumulatable : false,
      promotions, // Add promotions
      structuredPerks, // Add structured perks
    };
    
    if (row.perks && typeof row.perks === 'object' && 'vipBenefits' in row.perks && Array.isArray((row.perks as any).vipBenefits) && (row.perks as any).vipBenefits.length > 0) {
      perks.vipBenefits = (row.perks as any).vipBenefits;
    }
    
    if (!perks.vipBenefits && isLegacyFormat && legacyPerks.pointsInfo) {
      perks.vipBenefits = [legacyPerks.pointsInfo];
    }
    
    if (row.perks && typeof row.perks === 'object' && 'perksValue' in row.perks) {
      perks.perksValue = (row.perks as any).perksValue;
    }
    
    // Fallback to perks_summary if no structured perks
    if (structuredPerks.length === 0 && row.benefits?.perks_summary) {
      perks.perksSummary = row.benefits.perks_summary;
    }
    
    const policy: any = {
      cancellationPolicy: cancellationPolicy || (isZh ? '未知' : 'Unknown'),
      cancellationPolicyType: cancellationType,
      cancellationDetails: cancellationDetails,
      paymentPolicy,
      paymentPolicyText,
    };
    
    const totalPrice = row.rateInfo?.totalPriceDisplay || 'N/A';
    const nightlyPrice = row.rateInfo?.nightlyPriceDisplay || 'N/A';
    
    return {
      platform: row.platform || 'Unknown',
      platformLogo: row.platformLogo,
      isBest: row.isBest === true || row.platform?.toLowerCase() === 'luxtrip',
      totalPrice,
      nightlyPrice,
      perks,
      policy,
      websiteUrl: row.websiteUrl,
      promotions, // Add promotions to row
      structuredPerks, // Add structured perks to row
    };
  });
}

function getCancellationType(policy: string): 'free' | 'conditional' | 'non_refundable' {
  const lowerPolicy = policy.toLowerCase();
  if (lowerPolicy.includes('free') || lowerPolicy.includes('免费')) {
    return 'free';
  } else if (lowerPolicy.includes('non-refundable') || lowerPolicy.includes('不可退') || lowerPolicy.includes('no refund')) {
    return 'non_refundable';
  } else {
    return 'conditional';
  }
}
