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

    const body = await request.json();
    const { role, content } = body;
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
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: error.message },
      { status: 500 }
    );
  }
}
