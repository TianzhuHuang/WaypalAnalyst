import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Ensure AUTH_SECRET, AUTH_URL, and AUTH_TRUST_HOST are set for NextAuth v5 compatibility
// NextAuth v5 requires AUTH_SECRET and AUTH_URL environment variables
// #region agent log
fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/lib/auth.ts:10',message:'Checking env vars before mapping',data:{hasNextAuthSecret:!!process.env.NEXTAUTH_SECRET,hasAuthSecret:!!process.env.AUTH_SECRET,hasNextAuthUrl:!!process.env.NEXTAUTH_URL,hasAuthUrl:!!process.env.AUTH_URL,hasTrustHost:!!process.env.AUTH_TRUST_HOST,hasGoogleClientId:!!process.env.GOOGLE_CLIENT_ID,hasGoogleClientSecret:!!process.env.GOOGLE_CLIENT_SECRET},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion
if (process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = process.env.NEXTAUTH_SECRET;
}
if (process.env.NEXTAUTH_URL && !process.env.AUTH_URL) {
  process.env.AUTH_URL = process.env.NEXTAUTH_URL;
}
// AUTH_TRUST_HOST is required for NextAuth v5 to trust the host (must be string "true")
if (!process.env.AUTH_TRUST_HOST) {
  process.env.AUTH_TRUST_HOST = 'true';
}
// #region agent log
fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/lib/auth.ts:19',message:'Env vars after mapping',data:{authUrl:process.env.AUTH_URL,hasAuthSecret:!!process.env.AUTH_SECRET,trustHost:process.env.AUTH_TRUST_HOST,googleClientIdPrefix:process.env.GOOGLE_CLIENT_ID?.substring(0,20)||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion

export const authOptions: NextAuthConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // 开发环境：添加 Credentials provider 用于 Mock 登录
    ...(process.env.NODE_ENV !== 'production' ? [
      Credentials({
        name: 'Mock Login',
        credentials: {
          email: { label: 'Email', type: 'text' },
        },
        async authorize(credentials) {
          if (!credentials?.email) return null;
          
          // #region agent log
          const emailStr = typeof credentials.email === 'string' ? credentials.email : '';
          fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/lib/auth.ts:45',message:'Credentials authorize called',data:{email:emailStr.substring(0,15)||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
          // #endregion
          
          try {
            const email = typeof credentials.email === 'string' ? credentials.email : '';
            const user = await db
              .select()
              .from(profiles)
              .where(eq(profiles.email, email))
              .limit(1);
            
            if (user.length === 0) {
              // #region agent log
              fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/lib/auth.ts:55',message:'User not found in credentials',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
              // #endregion
              return null;
            }
            
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/lib/auth.ts:60',message:'Credentials authorize success',data:{userId:user[0].id,email:user[0].email?.substring(0,15)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
            // #endregion
            
            return {
              id: user[0].id,
              email: user[0].email || email,
              name: user[0].fullName || null,
              image: user[0].avatarUrl || null,
            };
          } catch (error) {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/lib/auth.ts:72',message:'Credentials authorize error',data:{errorMessage:error instanceof Error?error.message:'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
            // #endregion
            console.error('Credentials authorize error:', error);
            return null;
          }
        },
      }),
    ] : []),
  ],
  // Trust host for NextAuth v5 (required for localhost)
  trustHost: true,
  callbacks: {
    async signIn({ user, account, profile }) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/lib/auth.ts:32',message:'signIn callback entry',data:{provider:account?.provider,hasEmail:!!user.email,email:user.email?.substring(0,10)||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      if (account?.provider === 'google' && user.email) {
        try {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/lib/auth.ts:35',message:'Before DB query',data:{email:user.email?.substring(0,10)||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          // 检查用户是否存在
          const existingUser = await db
            .select()
            .from(profiles)
            .where(eq(profiles.email, user.email))
            .limit(1);
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/lib/auth.ts:42',message:'After DB query',data:{userExists:existingUser.length>0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion

          // 如果不存在，创建新用户
          if (existingUser.length === 0) {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/lib/auth.ts:45',message:'Creating new user',data:{email:user.email?.substring(0,10)||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            await db.insert(profiles).values({
              email: user.email,
              fullName: user.name || null,
              avatarUrl: user.image || null,
            });
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/lib/auth.ts:51',message:'User created successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
          } else {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/lib/auth.ts:54',message:'Updating existing user',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            // 如果存在，更新头像和名称（如果变化）
            await db
              .update(profiles)
              .set({
                fullName: user.name || existingUser[0].fullName,
                avatarUrl: user.image || existingUser[0].avatarUrl,
                updatedAt: new Date(),
              })
              .where(eq(profiles.email, user.email));
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/lib/auth.ts:63',message:'User updated successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
          }
        } catch (error) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/lib/auth.ts:66',message:'DB error in signIn',data:{errorMessage:error instanceof Error?error.message:'unknown',errorName:error instanceof Error?error.name:'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          console.error('Error creating/updating user:', error);
          // 即使出错也允许登录，避免阻塞用户
        }
      }
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/lib/auth.ts:72',message:'signIn callback returning true',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      return true;
    },
    async session({ session, token }) {
      // 将用户 ID 添加到 session
      if (session.user?.email) {
        try {
          const user = await db
            .select()
            .from(profiles)
            .where(eq(profiles.email, session.user.email))
            .limit(1);

          if (user.length > 0) {
            session.user.id = user[0].id;
          }
        } catch (error) {
          console.error('Error fetching user ID:', error);
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
};

// Export auth function for use in API routes
let authInstance: ReturnType<typeof NextAuth> | null = null;

export const auth = async () => {
  if (!authInstance) {
    authInstance = NextAuth(authOptions);
  }
  return await authInstance.auth();
};
