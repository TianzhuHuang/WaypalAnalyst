/**
 * Agent API Client
 * Handles communication with the Waypal Agent Backend
 */

const AGENT_API_BASE_URL = process.env.NEXT_PUBLIC_AGENT_BACKEND_URL || 'https://waypal-agent-backend-266509309806.asia-east1.run.app';

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
  aggregated_count?: number;
}

/**
 * Send a message to the Agent API
 * @param message - User's input message
 * @param userId - User ID (from auth store or session storage)
 * @returns Agent API response
 */
export async function sendMessageToAgent(
  message: string,
  userId: string
): Promise<AgentMessageResponse> {
  try {
    const requestBody = {
      user_id: userId,
      message_text: message,
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
      const response = await fetch(`${AGENT_API_BASE_URL}/agent/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

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
      const response = await fetch(`${AGENT_API_BASE_URL}/agent/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

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
