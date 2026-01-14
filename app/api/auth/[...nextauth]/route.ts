import NextAuth from 'next-auth';
import { NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';

// 强制动态渲染，避免构建时收集数据
export const dynamic = 'force-dynamic';

// Ensure AUTH_SECRET and AUTH_URL are set for NextAuth v5 (required at module level)
if (process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = process.env.NEXTAUTH_SECRET;
}
if (process.env.NEXTAUTH_URL && !process.env.AUTH_URL) {
  process.env.AUTH_URL = process.env.NEXTAUTH_URL;
}

const { handlers } = NextAuth(authOptions);

// #region agent log
fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:15',message:'NextAuth handlers created',data:{hasHandlers:!!handlers},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
// #endregion

export const GET = async (request: NextRequest) => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:20',message:'GET handler called',data:{url:request.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  try {
    const response = await handlers.GET(request);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:24',message:'GET handler success',data:{status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return response;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:28',message:'GET handler error',data:{errorMessage:error?.message||'unknown',errorName:error?.name||'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};

export const POST = async (request: NextRequest) => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:35',message:'POST handler called',data:{url:request.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  try {
    const response = await handlers.POST(request);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:39',message:'POST handler success',data:{status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return response;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/[...nextauth]/route.ts:43',message:'POST handler error',data:{errorMessage:error?.message||'unknown',errorName:error?.name||'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    throw error;
  }
};
