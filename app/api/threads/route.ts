import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { threads, type NewThread } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// 创建新 Thread
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { hotelName, hotelId, checkIn, checkOut, metadata } = body;

    if (!hotelName) {
      return NextResponse.json({ error: 'hotelName is required' }, { status: 400 });
    }

    // 生成标题：酒店名 - 日期
    const dateStr = checkIn 
      ? new Date(checkIn).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
      : '';
    const title = `${hotelName}${dateStr ? ` - ${dateStr}` : ''}`;

    const threadData: NewThread = {
      userId: session.user.id as string,
      hotelName,
      hotelId: hotelId || null,
      checkIn: checkIn ? (typeof checkIn === 'string' ? checkIn : new Date(checkIn).toISOString().split('T')[0]) : null,
      checkOut: checkOut ? (typeof checkOut === 'string' ? checkOut : new Date(checkOut).toISOString().split('T')[0]) : null,
      metadata: metadata || {},
      title,
    };

    const [newThread] = await db
      .insert(threads)
      .values(threadData)
      .returning();

    return NextResponse.json(newThread);
  } catch (error: any) {
    console.error('Error creating thread:', error);
    return NextResponse.json(
      { error: 'Failed to create thread', details: error.message },
      { status: 500 }
    );
  }
}

// 获取用户的 Thread 列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userThreads = await db
      .select()
      .from(threads)
      .where(eq(threads.userId, session.user.id))
      .orderBy(desc(threads.updatedAt))
      .limit(50); // 最近 50 条

    return NextResponse.json(userThreads);
  } catch (error: any) {
    console.error('Error fetching threads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch threads', details: error.message },
      { status: 500 }
    );
  }
}
