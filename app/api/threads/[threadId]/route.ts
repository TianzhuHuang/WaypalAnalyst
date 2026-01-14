import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { threads } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// 强制动态渲染，避免构建时收集数据
export const dynamic = 'force-dynamic';

// 获取单个 Thread 详情
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

    const thread = await db
      .select()
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (thread.length === 0) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // 验证所有权
    if (thread[0].userId !== (session.user.id as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(thread[0]);
  } catch (error: any) {
    console.error('Error fetching thread:', error);
    return NextResponse.json(
      { error: 'Failed to fetch thread', details: error.message },
      { status: 500 }
    );
  }
}

// 更新 Thread metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = await params;

    // 验证所有权
    const thread = await db
      .select()
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (thread.length === 0) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    if (thread[0].userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { metadata, title, checkIn, checkOut } = body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (metadata !== undefined) updateData.metadata = metadata;
    if (title !== undefined) updateData.title = title;
    if (checkIn !== undefined) updateData.checkIn = checkIn ? (typeof checkIn === 'string' ? checkIn : new Date(checkIn).toISOString().split('T')[0]) : null;
    if (checkOut !== undefined) updateData.checkOut = checkOut ? (typeof checkOut === 'string' ? checkOut : new Date(checkOut).toISOString().split('T')[0]) : null;

    const [updated] = await db
      .update(threads)
      .set(updateData)
      .where(eq(threads.id, threadId))
      .returning();

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating thread:', error);
    return NextResponse.json(
      { error: 'Failed to update thread', details: error.message },
      { status: 500 }
    );
  }
}

// 删除 Thread
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = await params;

    // 验证所有权
    const thread = await db
      .select()
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (thread.length === 0) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    if (thread[0].userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.delete(threads).where(eq(threads.id, threadId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting thread:', error);
    return NextResponse.json(
      { error: 'Failed to delete thread', details: error.message },
      { status: 500 }
    );
  }
}
