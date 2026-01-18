/**
 * Agent API Client
 * Handles communication with the Waypal Agent Backend
 */

import { ComparisonContext, buildContextSummary } from '@/utils/contextBuilder';

const AGENT_API_BASE_URL = process.env.NEXT_PUBLIC_AGENT_BACKEND_URL || 'https://waypal-agent-backend-266509309806.asia-east1.run.app';

/**
 * Helper function to retry fetch on 429/503 errors
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 1,
  retryDelay = 3000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If status is 429 (Too Many Requests) or 503 (Service Unavailable), retry
      if ((response.status === 429 || response.status === 503) && attempt < retries) {
        console.log(`[AgentAPI] Retryable error ${response.status}, retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${retries + 1})`);
        
        // Show user-friendly toast message (only on first retry)
        if (attempt === 0 && typeof window !== 'undefined') {
          // Dynamic import to avoid SSR issues
          import('react-hot-toast').then(({ default: toast }) => {
            toast('管家正在努力调配资源，请稍候...', {
              icon: '⏳',
              duration: retryDelay,
            });
          }).catch(() => {
            // Toast not available, skip
          });
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      
      return response;
    } catch (error: any) {
      lastError = error;
      // For network errors, don't retry (timeout and network issues are handled elsewhere)
      if (error.name === 'AbortError' || error.message === 'Failed to fetch') {
        throw error;
      }
      
      // For other errors, retry if attempts remaining
      if (attempt < retries) {
        console.log(`[AgentAPI] Request error, retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${retries + 1})`, error);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      
      throw error;
    }
  }
  
  // Should not reach here, but just in case
  throw lastError || new Error('Request failed after retries');
}

export interface AgentMessageRequest {
  user_id: string;
  message_text: string;
  force_dispatch: boolean;
}

export interface AgentMessageResponse {
  status: 'buffered' | 'processed';
  reply_type?: 'evaluation' | 'general' | 'clarification' | null;
  reply?: string | null; // JSON string that needs to be parsed (only when status=processed)
  aggregated_count?: number;
}

export interface EvaluationData {
  hotel_name: string;
  hotel_name_cn?: string;
  room_name?: string;
  room_name_cn?: string;
  checkin_date?: string;
  checkout_date?: string;
  nights?: number;
  guests?: number;
  table_rows: EvaluationTableRow[];
  reply_json?: {
    table_rows?: EvaluationTableRow[]; // Prioritized data source
    hotel_id?: number; // Hotel ID from reply_json
  };
  deep_analysis?: {
    price?: string;
    perks?: string;
  };
}

export interface Promotion {
  name: string;
  description?: string;
  available_until?: string;
}

export interface Perks {
  [key: string]: string | boolean | undefined; // e.g., "视房态升房": "视入住当天房态而定"
  breakfastInclude?: boolean;
  breakfastDetail?: string;
}

export interface Benefits {
  promotions?: Promotion[];
  perks?: Record<string, string>; // Structured perks object, e.g., { "视房态升房": "视入住当天房态而定" }
  perks_summary?: string;
}

export interface EvaluationTableRow {
  platform: string;
  platformLogo?: string;
  isBest?: boolean;
  rateInfo?: {
    totalPrice?: number;
    totalPriceDisplay?: string;
    nightlyPrice?: number;
    nightlyPriceDisplay?: string;
    currencyCode?: string;
  };
  benefits?: Benefits; // New: Promotions and perks summary
  perks?: Perks | {
    breakfastInclude?: boolean;
    breakfastDetail?: string;
    pointsAccumulatable?: {
      is_accumulatable?: boolean;
      points?: number;
      pointsInfo?: string;
      pointsMultiple?: number;
    };
    vipBenefits?: string[];
    perksValue?: string;
  };
  policy?: {
    cancellationPolicy?: string;
    cancellationDetails?: string;
    paymentPolicy?: string;
    guaranteeType?: string;
    canUserPrepay?: boolean;
  };
  websiteUrl?: string;
}

export interface CompareHotelRequest {
  user_id: string;
  params: {
    destination: string;
    hotel_name: string;
    check_in: string; // YYYY-MM-DD
    check_out: string; // YYYY-MM-DD
    room_count: number;
    room_type: string | null;
    adults: number;
    children: number;
    additional_notes: string;
  };
  timestamp: string; // ISO-8601
  channel: 'web';
}

export interface CompareHotelResponse {
  status: 'buffered' | 'processed';
  reply_type?: 'evaluation' | 'general' | 'clarification' | null;
  reply?: string | null;
  reply_json?: EvaluationData | null; // 添加 reply_json 字段（已经是解析好的对象）
  aggregated_count?: number;
}

export interface BookingStrategyRequest {
  hotelId: number;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
}

export interface BookingStrategyResponse {
  type: 'booking_strategy_cheapest';
  reply: string; // 富文本推荐文案
}

/**
 * Send a message to the Agent API
 * @param message - User's input message
 * @param userId - User ID (from auth store or session storage)
 * @param context - Optional comparison context to enhance the message
 * @returns Agent API response
 */
export async function sendMessageToAgent(
  message: string,
  userId: string,
  context?: ComparisonContext | null
): Promise<AgentMessageResponse> {
  try {
    // 构建增强的消息文本
    let enhancedMessage = message;
    
    if (context) {
      const contextSummary = buildContextSummary(context);
      // 直接将上下文信息嵌入到 message_text 中
      // 后端会处理 prompt，我们只需要提供上下文和用户问题
      enhancedMessage = `${contextSummary}\n\n用户问题：${message}`;
      
      console.log('[AgentAPI] Context-enhanced message:', {
        hasContext: true,
        contextSummaryLength: contextSummary.length,
        originalMessageLength: message.length,
        enhancedMessageLength: enhancedMessage.length,
        hotelName: context.hotel_name,
        hasBestChoice: !!context.best_choice,
        tableRowsCount: context.table_rows_summary.length,
      });
      
      // 调试：打印上下文摘要的前 500 个字符
      console.log('[AgentAPI] Context summary preview:', contextSummary.substring(0, 500));
    } else {
      console.log('[AgentAPI] No context provided, using original message');
    }

    const requestBody = {
      user_id: userId,
      message_text: enhancedMessage,
      force_dispatch: true,
    } as AgentMessageRequest;
    
    console.log('[AgentAPI] Sending request:', {
      url: `${AGENT_API_BASE_URL}/agent/message`,
      body: requestBody
    });
    
    // Add AbortController for better timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 300 second timeout (5 minutes)
    
    try {
      const response = await fetchWithRetry(
        `${AGENT_API_BASE_URL}/agent/message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        },
        1, // Retry once on 429/503
        3000 // 3 second delay
      );

      clearTimeout(timeoutId);
      console.log('[AgentAPI] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AgentAPI] Error response:', errorText);
        throw new Error(`Agent API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: AgentMessageResponse = await response.json();
      console.log('[AgentAPI] Response data:', data);
      return data;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Handle AbortError (timeout)
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout: The server took too long to respond. Please try again.');
      }
      
      // Handle network errors
      if (fetchError.message === 'Failed to fetch' || fetchError.name === 'TypeError') {
        // Check if it's a CORS issue
        const isCorsError = fetchError.message.includes('CORS') || 
                           fetchError.message.includes('cors') ||
                           fetchError.message === 'Failed to fetch';
        
        if (isCorsError) {
          throw new Error('Network error: Unable to connect to the server. This may be a CORS issue or the server is unreachable.');
        }
        
        throw new Error('Network error: Unable to connect to the server. Please check your internet connection and try again.');
      }
      
      // Re-throw other errors
      throw fetchError;
    }
  } catch (error: any) {
    console.error('[AgentAPI] Failed to send message:', error);
    console.error('[AgentAPI] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    
    // Provide user-friendly error messages
    if (error.message.includes('timeout')) {
      throw error; // Already user-friendly
    } else if (error.message.includes('Network error')) {
      throw error; // Already user-friendly
    } else {
      throw new Error(error.message || 'Failed to communicate with agent. Please try again later.');
    }
  }
}

/**
 * Compare hotel using structured parameters (bypasses LLM semantic analysis)
 * @param params - Structured hotel search parameters
 * @param userId - User ID
 * @returns Compare API response
 */
export async function compareHotel(
  params: CompareHotelRequest['params'],
  userId: string
): Promise<CompareHotelResponse> {
  try {
    const requestBody: CompareHotelRequest = {
      user_id: userId,
      params,
      timestamp: new Date().toISOString(),
      channel: 'web',
    };
    
    console.log('[AgentAPI] Sending compare request:', {
      url: `${AGENT_API_BASE_URL}/agent/compare`,
      body: requestBody
    });
    
    // Add AbortController for better timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 300 second timeout (5 minutes)
    
    try {
      const response = await fetchWithRetry(
        `${AGENT_API_BASE_URL}/agent/compare`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        },
        1, // Retry once on 429/503
        3000 // 3 second delay
      );

      clearTimeout(timeoutId);
      console.log('[AgentAPI] Compare response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AgentAPI] Error response:', errorText);
        throw new Error(`Compare API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: CompareHotelResponse = await response.json();
      console.log('[AgentAPI] Compare response data:', data);
      return data;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Handle AbortError (timeout)
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout: The server took too long to respond. Please try again.');
      }
      
      // Handle network errors
      if (fetchError.message === 'Failed to fetch' || fetchError.name === 'TypeError') {
        const isCorsError = fetchError.message.includes('CORS') || 
                           fetchError.message.includes('cors') ||
                           fetchError.message === 'Failed to fetch';
        
        if (isCorsError) {
          throw new Error('Network error: Unable to connect to the server. This may be a CORS issue or the server is unreachable.');
        }
        
        throw new Error('Network error: Unable to connect to the server. Please check your internet connection and try again.');
      }
      
      // Re-throw other errors
      throw fetchError;
    }
  } catch (error: any) {
    console.error('[AgentAPI] Failed to compare hotel:', error);
    console.error('[AgentAPI] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    
    // Provide user-friendly error messages
    if (error.message.includes('timeout')) {
      throw error;
    } else if (error.message.includes('Network error')) {
      throw error;
    } else {
      throw new Error(error.message || 'Failed to communicate with agent. Please try again later.');
    }
  }
}

/**
 * Parse evaluation reply from Agent API response
 * @param reply - JSON string from response.reply
 * @returns Parsed evaluation data
 */
export function parseEvaluationReply(reply: string): EvaluationData {
  try {
    console.log('[AgentAPI] Parsing reply, length:', reply.length);
    console.log('[AgentAPI] Reply preview:', reply.substring(0, 200));
    const parsed = JSON.parse(reply);
    console.log('[AgentAPI] Parsed successfully:', {
      hotel_name: parsed.hotel_name,
      hotel_id: parsed.hotel_id,
      reply_json_hotel_id: parsed.reply_json?.hotel_id,
      table_rows_count: parsed.table_rows?.length,
      reply_json: parsed.reply_json,
    });
    
    // Debug: Log detailed structure of table_rows
    if (parsed.table_rows && Array.isArray(parsed.table_rows)) {
      parsed.table_rows.forEach((row: any, idx: number) => {
        if (row.platform?.toLowerCase() === 'luxtrip' || row.platform?.toLowerCase().includes('luxtrip')) {
          console.log(`[AgentAPI] LuxTrip row ${idx}:`, {
            platform: row.platform,
            benefits: row.benefits,
            perks: row.perks,
            fullRow: row,
          });
        }
      });
    }
    
    // Debug: Log reply_json structure if exists
    if (parsed.reply_json) {
      console.log('[AgentAPI] Reply JSON structure:', parsed.reply_json);
      if (parsed.reply_json.table_rows && Array.isArray(parsed.reply_json.table_rows)) {
        parsed.reply_json.table_rows.forEach((row: any, idx: number) => {
          if (row.platform?.toLowerCase() === 'luxtrip' || row.platform?.toLowerCase().includes('luxtrip')) {
            console.log(`[AgentAPI] Reply JSON LuxTrip row ${idx}:`, {
              platform: row.platform,
              benefits: row.benefits,
              perks: row.perks,
              fullRow: row,
            });
          }
        });
      }
    }
    
    return parsed as EvaluationData;
  } catch (error: any) {
    console.error('[AgentAPI] Failed to parse evaluation reply:', error);
    console.error('[AgentAPI] Reply content:', reply);
    throw new Error(`Invalid evaluation data format: ${error.message}`);
  }
}

/**
 * Get booking strategy recommendation (cheapest options)
 * @param params - Hotel ID, check-in and check-out dates
 * @returns Booking strategy response with recommendations
 */
export async function getBookingStrategy(
  params: BookingStrategyRequest
): Promise<BookingStrategyResponse> {
  try {
    const queryParams = new URLSearchParams({
      hotelId: params.hotelId.toString(),
      checkIn: params.checkIn,
      checkOut: params.checkOut,
    });
    
    const url = `${AGENT_API_BASE_URL}/agent/booking_strategy/cheapest?${queryParams.toString()}`;
    
    console.log('[AgentAPI] Sending booking strategy request:', {
      url,
      params
    });
    
    // Add AbortController for better timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 300 second timeout (5 minutes)
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('[AgentAPI] Booking strategy response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AgentAPI] Error response:', errorText);
        throw new Error(`Booking strategy API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: BookingStrategyResponse = await response.json();
      console.log('[AgentAPI] Booking strategy response data:', data);
      return data;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Handle AbortError (timeout)
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout: The server took too long to respond. Please try again.');
      }
      
      // Handle network errors
      if (fetchError.message === 'Failed to fetch' || fetchError.name === 'TypeError') {
        const isCorsError = fetchError.message.includes('CORS') || 
                           fetchError.message.includes('cors') ||
                           fetchError.message === 'Failed to fetch';
        
        if (isCorsError) {
          throw new Error('Network error: Unable to connect to the server. This may be a CORS issue or the server is unreachable.');
        }
        
        throw new Error('Network error: Unable to connect to the server. Please check your internet connection and try again.');
      }
      
      // Re-throw other errors
      throw fetchError;
    }
  } catch (error: any) {
    console.error('[AgentAPI] Failed to get booking strategy:', error);
    console.error('[AgentAPI] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    
    // Provide user-friendly error messages
    if (error.message.includes('timeout')) {
      throw error;
    } else if (error.message.includes('Network error')) {
      throw error;
    } else {
      throw new Error(error.message || 'Failed to communicate with agent. Please try again later.');
    }
  }
}
