import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// 强制动态渲染
export const dynamic = 'force-dynamic';

/**
 * Mock 登录 API - 用于本地测试，不触发真实的 Google OAuth
 * 模拟 test-user@gmail.com 用户登录
 */
export async function POST(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/mock-login/route.ts:14',message:'Mock login API called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
  // #endregion

  try {
    const body = await request.json();
    const email = body.email || 'test-user@gmail.com';
    const name = body.name || 'Test User';
    const image = body.image || null;

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/mock-login/route.ts:20',message:'Checking if user exists',data:{email:email.substring(0,15)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
    // #endregion

    // 检查用户是否存在
    const existingUser = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1);

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/mock-login/route.ts:30',message:'User query result',data:{userExists:existingUser.length>0,userId:existingUser[0]?.id||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
    // #endregion

    let userId: string;

    if (existingUser.length === 0) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/mock-login/route.ts:42',message:'Creating new user profile',data:{email:email.substring(0,15)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
      // #endregion

      // 创建新用户
      const [newUser] = await db
        .insert(profiles)
        .values({
          email,
          fullName: name,
          avatarUrl: image,
        })
        .returning();

      userId = newUser.id;

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/mock-login/route.ts:50',message:'User created successfully',data:{userId:userId,email:email.substring(0,15)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
      // #endregion
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/mock-login/route.ts:62',message:'User already exists',data:{userId:existingUser[0].id,email:email.substring(0,15)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
      // #endregion

      // 更新现有用户
      await db
        .update(profiles)
        .set({
          fullName: name || existingUser[0].fullName,
          avatarUrl: image || existingUser[0].avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(profiles.email, email));

      userId = existingUser[0].id;
    }

    // 返回用户信息（实际应用中，这里应该创建 NextAuth session）
    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        name,
        image,
      },
      message: existingUser.length === 0 ? 'User created successfully' : 'User logged in successfully',
    });
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/mock-login/route.ts:91',message:'Mock login error',data:{errorMessage:error?.message||'unknown',errorName:error?.name||'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
    // #endregion

    console.error('Mock login error:', error);
    return NextResponse.json(
      { error: 'Failed to mock login', details: error.message },
      { status: 500 }
    );
  }
}
