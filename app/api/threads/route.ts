import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { threads, profiles, type NewThread } from '@/lib/db/schema';
import { eq, desc, gte, and } from 'drizzle-orm';

// 强制动态渲染，避免构建时收集数据
export const dynamic = 'force-dynamic';

// 创建新 Thread
export async function POST(request: NextRequest) {
  try {
    console.log('[API] POST /api/threads - Starting');
    
    // 检查数据库连接
    const hasDbUrl = !!process.env.DATABASE_URL;
    console.log('[API] Database URL status:', hasDbUrl ? 'SET' : 'NOT SET');
    
    // 检查认证环境变量
    console.log('[API] Auth environment variables:', {
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasAuthUrl: !!process.env.AUTH_URL,
      authUrl: process.env.AUTH_URL || 'NOT SET',
      hasTrustHost: !!process.env.AUTH_TRUST_HOST,
      trustHost: process.env.AUTH_TRUST_HOST || 'NOT SET',
    });
    
    const session = await auth();
    console.log('[API] Session status:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasUserId: !!session?.user?.id,
      userId: session?.user?.id || 'NONE',
      userIdType: typeof session?.user?.id,
      userEmail: session?.user?.email ? session.user.email.substring(0, 10) + '***' : 'NONE',
      sessionKeys: session ? Object.keys(session) : [],
      userKeys: session?.user ? Object.keys(session.user) : [],
    });
    
    // 更宽松的检查：如果有 session 和 user，即使没有 id 也允许（使用 email 作为临时标识）
    if (!session?.user) {
      console.error('[API] Unauthorized: No session or user', {
        hasSession: !!session,
        hasUser: !!session?.user,
        requestHeaders: {
          cookie: request.headers.get('cookie') ? 'PRESENT' : 'MISSING',
          authorization: request.headers.get('authorization') ? 'PRESENT' : 'MISSING',
        },
      });
      return NextResponse.json(
        { 
          error: 'Unauthorized', 
          details: 'No valid session found. Please ensure you are logged in.',
          debug: {
            hasSession: !!session,
            hasUser: !!session?.user,
            hasAuthSecret: !!process.env.AUTH_SECRET,
            hasAuthUrl: !!process.env.AUTH_URL,
            authUrl: process.env.AUTH_URL || 'NOT SET',
          }
        }, 
        { status: 401 }
      );
    }

    // 如果没有 user.id，尝试从数据库获取（临时解决方案）
    let userId = session.user.id;
    if (!userId && session.user.email) {
      try {
        console.log('[API] User ID missing, attempting to fetch from database...');
        const user = await db
          .select()
          .from(profiles)
          .where(eq(profiles.email, session.user.email))
          .limit(1);
        
        if (user.length > 0) {
          userId = user[0].id;
          console.log('[API] User ID fetched from database:', userId);
        } else {
          console.warn('[API] User not found in database, cannot create thread');
          return NextResponse.json(
            { 
              error: 'User not found', 
              details: 'User profile not found in database. Please try logging in again.',
            }, 
            { status: 404 }
          );
        }
      } catch (error: any) {
        console.error('[API] Error fetching user from database:', {
          error: error.message,
          code: error.code,
        });
        return NextResponse.json(
          { 
            error: 'Database connection failed', 
            details: 'Unable to connect to database. Please try again later.',
            debug: {
              error: error.message,
              code: error.code,
            }
          }, 
          { status: 500 }
        );
      }
    }

    if (!userId) {
      console.error('[API] Unauthorized: No user ID available', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasUserId: !!session?.user?.id,
        hasUserEmail: !!session?.user?.email,
      });
      return NextResponse.json(
        { 
          error: 'Unauthorized', 
          details: 'User ID not available. Please try logging in again.',
          debug: {
            hasSession: !!session,
            hasUser: !!session?.user,
            hasUserId: !!session?.user?.id,
            hasUserEmail: !!session?.user?.email,
          }
        }, 
        { status: 401 }
      );
    }

    const body = await request.json();
    const { hotelName, hotelId, checkIn, checkOut, metadata } = body;
    console.log('[API] Request body:', {
      hotelName,
      hasHotelId: !!hotelId,
      checkIn,
      checkOut,
      hasMetadata: !!metadata,
    });

    if (!hotelName) {
      console.error('[API] Missing hotelName');
      return NextResponse.json({ error: 'hotelName is required' }, { status: 400 });
    }

    // 生成标题：酒店名 - 日期
    const dateStr = checkIn 
      ? new Date(checkIn).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
      : '';
    const title = `${hotelName}${dateStr ? ` - ${dateStr}` : ''}`;

    const threadData: NewThread = {
      userId: userId as string,
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/threads/route.ts:184',message:'GET /api/threads entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const session = await auth();
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/threads/route.ts:187',message:'GET /api/threads: Session obtained',data:{hasSession:!!session,hasUserId:!!session?.user?.id,userId:session?.user?.id||'none',userEmail:session?.user?.email?.substring(0,10)||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    if (!session?.user) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/threads/route.ts:191',message:'GET /api/threads: No session',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 如果 session.user.id 不存在或看起来像 Google OAuth ID，尝试从数据库查询真实用户 ID
    let userId = session.user.id;
    if (!userId && session.user.email) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/threads/route.ts:198',message:'GET /api/threads: userId missing, querying DB',data:{email:session.user.email?.substring(0,10)||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      try {
        const user = await db
          .select()
          .from(profiles)
          .where(eq(profiles.email, session.user.email))
          .limit(1);
        
        if (user.length > 0) {
          userId = user[0].id;
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/threads/route.ts:207',message:'GET /api/threads: Real userId fetched from DB',data:{userId:user[0].id,userIdType:typeof user[0].id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
        }
      } catch (error: any) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/threads/route.ts:212',message:'GET /api/threads: DB query error',data:{errorMessage:error.message,errorCode:error.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        console.error('[API] Error fetching user from DB in GET /api/threads:', error);
      }
    }

    if (!userId) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/threads/route.ts:218',message:'GET /api/threads: No userId available',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/threads/route.ts:224',message:'GET /api/threads: Querying threads',data:{userId:userId,userIdType:typeof userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // 获取最近7天的 Thread（按 updatedAt 筛选）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    const userThreads = await db
      .select()
      .from(threads)
      .where(
        and(
          eq(threads.userId, userId),
          gte(threads.updatedAt, sevenDaysAgo)
        )
      )
      .orderBy(desc(threads.updatedAt))
      .limit(50); // 最多 50 条

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/threads/route.ts:239',message:'GET /api/threads: Threads fetched',data:{threadCount:userThreads.length,userId:userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    return NextResponse.json(userThreads);
  } catch (error: any) {
    console.error('Error fetching threads:', error);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/threads/route.ts:245',message:'GET /api/threads: Error',data:{errorMessage:error.message,errorStack:error.stack?.substring(0,200)||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return NextResponse.json(
      { error: 'Failed to fetch threads', details: error.message },
      { status: 500 }
    );
  }
}
