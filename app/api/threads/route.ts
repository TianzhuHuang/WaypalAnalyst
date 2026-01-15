import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { threads, type NewThread } from '@/lib/db/schema';
import { eq, desc, gte, and } from 'drizzle-orm';

// 强制动态渲染，避免构建时收集数据
export const dynamic = 'force-dynamic';

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

    console.log('[API] Thread created successfully:', newThread.id);
    return NextResponse.json(newThread);
  } catch (error: any) {
    console.error('[API] Error creating thread:', error);
    console.error('[API] Error details:', {
      message: error.message,
      stack: error.stack,
      databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
    });
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

    // 获取最近7天的 Thread（按 updatedAt 筛选）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    const userThreads = await db
      .select()
      .from(threads)
      .where(
        and(
          eq(threads.userId, session.user.id),
          gte(threads.updatedAt, sevenDaysAgo)
        )
      )
      .orderBy(desc(threads.updatedAt))
      .limit(50); // 最多 50 条

    return NextResponse.json(userThreads);
  } catch (error: any) {
    console.error('Error fetching threads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch threads', details: error.message },
      { status: 500 }
    );
  }
}
