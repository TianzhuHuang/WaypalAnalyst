import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// 强制动态渲染
export const dynamic = 'force-dynamic';

/**
 * Mock Session API - 创建 NextAuth session（仅用于开发环境）
 * 这个端点会设置一个临时的 session cookie
 */
export async function POST(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/mock-session/route.ts:13',message:'Mock session API called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
  // #endregion

  // 仅在开发环境允许
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Mock session is only available in development' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const email = body.email || 'test-user@gmail.com';

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/mock-session/route.ts:25',message:'Looking up user for session',data:{email:email.substring(0,15)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
    // #endregion

    // 查找用户
    const user = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { error: 'User not found. Please run mock login first.' },
        { status: 404 }
      );
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/mock-session/route.ts:38',message:'User found, redirecting to NextAuth',data:{userId:user[0].id,email:email.substring(0,15)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
    // #endregion

    // 重定向到 NextAuth 的 signin 页面，但使用 credentials provider
    // 由于 NextAuth v5 的复杂性，我们使用一个变通方法：
    // 重定向到一个特殊的 callback URL，在那里设置 session
    const callbackUrl = `/api/auth/callback/credentials?email=${encodeURIComponent(email)}&callbackUrl=/`;
    
    return NextResponse.json({
      success: true,
      redirectUrl: callbackUrl,
      user: {
        id: user[0].id,
        email: user[0].email,
        name: user[0].fullName,
      },
    });
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/mock-session/route.ts:54',message:'Mock session error',data:{errorMessage:error?.message||'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
    // #endregion

    console.error('Mock session error:', error);
    return NextResponse.json(
      { error: 'Failed to create mock session', details: error.message },
      { status: 500 }
    );
  }
}
