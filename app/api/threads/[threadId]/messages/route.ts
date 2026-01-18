import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { messages, threads } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// 强制动态渲染，避免构建时收集数据
export const dynamic = 'force-dynamic';

// 保存消息
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    console.log('[API] POST /api/threads/[threadId]/messages - Starting');
    
    // 检查数据库连接
    const hasDbUrl = !!process.env.DATABASE_URL;
    console.log('[API] Database URL status:', hasDbUrl ? 'SET' : 'NOT SET');
    
    const session = await auth();
    console.log('[API] Session status:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasUserId: !!session?.user?.id,
      userId: session?.user?.id ? '***' : 'NONE',
    });
    
    if (!session?.user?.id) {
      console.error('[API] Unauthorized: No session or user ID');
      return NextResponse.json(
        { 
          error: 'Unauthorized', 
          details: 'No valid session found. Please ensure you are logged in.',
          debug: {
            hasSession: !!session,
            hasUser: !!session?.user,
            hasUserId: !!session?.user?.id,
          }
        }, 
        { status: 401 }
      );
    }

    const { threadId } = await params;
    console.log('[API] Thread ID:', threadId);

    // 检查本地环境降级处理
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const hasDatabaseUrl = !!process.env.DATABASE_URL;
    
    // 先读取 request body（只能读取一次）
    const body = await request.json();
    const { role, content } = body;
    
    // 本地环境如果没有数据库配置，静默返回成功（不保存）
    if (isDevelopment && !hasDatabaseUrl) {
      console.warn('[API] POST /api/threads/[threadId]/messages: No DATABASE_URL in development, skipping save');
      return NextResponse.json({
        id: `mock-${Date.now()}`,
        threadId,
        role: role || 'user',
        content: content || '',
        createdAt: new Date().toISOString(),
      });
    }

    // 验证 Thread 属于当前用户
    let thread;
    try {
      thread = await db
        .select()
        .from(threads)
        .where(eq(threads.id, threadId))
        .limit(1);
      console.log('[API] Thread query result:', { found: thread.length > 0 });
    } catch (dbError: any) {
      console.error('[API] Database error when querying thread:', {
        error: dbError.message,
        stack: dbError.stack,
        hasDbUrl,
      });
      
      // 本地环境：数据库连接失败时，静默返回成功
      if (isDevelopment) {
        console.warn('[API] POST /api/threads/[threadId]/messages: Database error in development, skipping save');
        return NextResponse.json({
          id: `mock-${Date.now()}`,
          threadId,
          role: role || 'user',
          content: content || '',
          createdAt: new Date().toISOString(),
        });
      }
      
      throw new Error(`Database connection failed: ${dbError.message}`);
    }

    if (thread.length === 0) {
      console.error('[API] Thread not found:', threadId);
      return NextResponse.json(
        { error: 'Thread not found', threadId },
        { status: 404 }
      );
    }

    if (thread[0].userId !== (session.user.id as string)) {
      console.error('[API] Forbidden: Thread belongs to different user', {
        threadUserId: thread[0].userId,
        sessionUserId: session.user.id,
      });
      return NextResponse.json(
        { error: 'Forbidden', details: 'Thread does not belong to current user' },
        { status: 403 }
      );
    }

    // body 已在上面读取
    console.log('[API] Message data:', {
      role,
      contentLength: content?.length || 0,
      hasRole: !!role,
      hasContent: !!content,
    });

    if (!role || !content) {
      console.error('[API] Missing required fields:', { role: !!role, content: !!content });
      return NextResponse.json(
        { error: 'role and content are required', received: { role: !!role, content: !!content } },
        { status: 400 }
      );
    }

    if (!['user', 'assistant', 'system'].includes(role)) {
      console.error('[API] Invalid role:', role);
      return NextResponse.json(
        { error: 'Invalid role. Must be user, assistant, or system', received: role },
        { status: 400 }
      );
    }

    let newMessage;
    try {
      [newMessage] = await db
        .insert(messages)
        .values({
          threadId: threadId,
          role: role as 'user' | 'assistant' | 'system',
          content,
        })
        .returning();
      console.log('[API] Message saved successfully:', newMessage.id);
    } catch (dbError: any) {
      console.error('[API] Database error when saving message:', {
        error: dbError.message,
        stack: dbError.stack,
        hasDbUrl,
        threadId,
        role,
        contentLength: content?.length,
      });
      
      // 本地环境：数据库保存失败时，返回 mock 消息
      if (isDevelopment) {
        console.warn('[API] POST /api/threads/[threadId]/messages: Database save failed in development, returning mock message');
        return NextResponse.json({
          id: `mock-${Date.now()}`,
          threadId,
          role: role as 'user' | 'assistant' | 'system',
          content,
          createdAt: new Date().toISOString(),
        });
      }
      
      throw new Error(`Failed to save message to database: ${dbError.message}`);
    }

    // 更新 Thread 的 updatedAt
    try {
      await db
        .update(threads)
        .set({ updatedAt: new Date() })
        .where(eq(threads.id, threadId));
      console.log('[API] Thread updatedAt updated successfully');
    } catch (dbError: any) {
      console.error('[API] Database error when updating thread:', {
        error: dbError.message,
        threadId,
      });
      // 不抛出错误，因为消息已经保存成功
    }

    return NextResponse.json(newMessage);
  } catch (error: any) {
    console.error('[API] Error saving message:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      hasDbUrl: !!process.env.DATABASE_URL,
    });
    
    // 本地环境：即使 catch 到错误，也返回 mock 消息
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment) {
      console.warn('[API] POST /api/threads/[threadId]/messages: Error in development, returning mock message');
      // 注意：这里无法再次读取 body，因为已经在上面读取过了
      // 返回一个通用的 mock 消息
      return NextResponse.json({
        id: `mock-${Date.now()}`,
        threadId: (await params).threadId,
        role: 'user',
        content: 'Message saved (mock - database unavailable)',
        createdAt: new Date().toISOString(),
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to save message', 
        details: error.message,
        type: error.name,
      },
      { status: 500 }
    );
  }
}

// 获取 Thread 的所有消息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = await params;
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const hasDatabaseUrl = !!process.env.DATABASE_URL;
    
    // 本地环境如果没有数据库配置，返回空数组
    if (isDevelopment && !hasDatabaseUrl) {
      console.warn('[API] GET /api/threads/[threadId]/messages: No DATABASE_URL in development, returning empty array');
      return NextResponse.json([]);
    }

    try {
      // 验证 Thread 属于当前用户
      const thread = await db
        .select()
        .from(threads)
        .where(eq(threads.id, threadId))
        .limit(1);

      if (thread.length === 0) {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
      }

      if (thread[0].userId !== (session.user.id as string)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const threadMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.threadId, threadId))
        .orderBy(messages.createdAt);

      return NextResponse.json(threadMessages);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      
      // 本地环境：数据库查询失败时，返回空数组
      if (isDevelopment) {
        console.warn('[API] GET /api/threads/[threadId]/messages: Database error in development, returning empty array');
        return NextResponse.json([]);
      }
      
      throw error;
    }
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    
    // 本地环境：即使 catch 到错误，也返回空数组
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment) {
      return NextResponse.json([]);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: error.message },
      { status: 500 }
    );
  }
}
