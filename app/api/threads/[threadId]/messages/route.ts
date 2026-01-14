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

    const body = await request.json();
    const { role, content } = body;

    if (!role || !content) {
      return NextResponse.json(
        { error: 'role and content are required' },
        { status: 400 }
      );
    }

    if (!['user', 'assistant', 'system'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be user, assistant, or system' },
        { status: 400 }
      );
    }

    const [newMessage] = await db
      .insert(messages)
      .values({
        threadId: threadId,
        role: role as 'user' | 'assistant' | 'system',
        content,
      })
      .returning();

    // 更新 Thread 的 updatedAt
    await db
      .update(threads)
      .set({ updatedAt: new Date() })
      .where(eq(threads.id, threadId));

    return NextResponse.json(newMessage);
  } catch (error: any) {
    console.error('Error saving message:', error);
    return NextResponse.json(
      { error: 'Failed to save message', details: error.message },
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
