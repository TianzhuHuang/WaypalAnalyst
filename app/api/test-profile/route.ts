import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// 强制动态渲染
export const dynamic = 'force-dynamic';

/**
 * 测试端点：检查数据库中的 profile 记录（无需认证）
 * 用于 Mock 登录测试
 */
export async function GET(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/test-profile/route.ts:12',message:'Test profile API called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
  // #endregion

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') || 'test-user@gmail.com';

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/test-profile/route.ts:19',message:'Querying database for profile',data:{email:email.substring(0,15)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
    // #endregion

    // 查询数据库中的用户
    const user = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1);

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/test-profile/route.ts:28',message:'Database query result',data:{found:user.length>0,userId:user[0]?.id||'none',email:user[0]?.email?.substring(0,15)||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
    // #endregion

    if (user.length === 0) {
      return NextResponse.json(
        { 
          found: false,
          message: `No profile found for ${email}`,
          suggestion: 'Click "Mock Login" first to create the profile'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      found: true,
      profile: user[0],
      message: 'Profile found in database'
    });
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/test-profile/route.ts:47',message:'Test profile API error',data:{errorMessage:error?.message||'unknown',errorName:error?.name||'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
    // #endregion

    console.error('Test profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: error.message },
      { status: 500 }
    );
  }
}
