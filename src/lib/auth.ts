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
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
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
    async jwt({ token, user, account }) {
      // 在 JWT token 中存储用户 ID
      // 优先使用 signIn callback 中设置的 user.id（如果数据库连接成功）
      if (user?.id) {
        token.userId = user.id;
        console.log('[Auth] JWT callback: User ID from signIn callback:', user.id);
        return token;
      }
      
      // 如果 signIn callback 中没有设置（可能数据库连接失败），尝试从数据库查询
      if (user?.email) {
        try {
          const dbUser = await db
            .select()
            .from(profiles)
            .where(eq(profiles.email, user.email))
            .limit(1);
          
          if (dbUser.length > 0) {
            token.userId = dbUser[0].id;
            console.log('[Auth] JWT callback: User ID fetched from DB:', dbUser[0].id);
          } else {
            console.warn('[Auth] JWT callback: User not found in database:', user.email);
          }
        } catch (error: any) {
          console.error('[Auth] JWT callback: Error fetching user ID:', {
            error: error.message,
            code: error.code,
            email: user.email,
          });
          // 即使数据库查询失败，也继续（session callback 会尝试再次查询）
        }
      }
      
      return token;
    },
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
            const [newUser] = await db.insert(profiles).values({
              email: user.email,
              fullName: user.name || null,
              avatarUrl: user.image || null,
            }).returning();
            // 将用户 ID 存储到 user 对象中，供 JWT callback 使用
            if (newUser?.id) {
              user.id = newUser.id;
              console.log('[Auth] SignIn callback: New user created with ID:', newUser.id);
            }
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
            // 将用户 ID 存储到 user 对象中
            if (existingUser[0]?.id) {
              user.id = existingUser[0].id;
              console.log('[Auth] SignIn callback: Existing user ID:', existingUser[0].id);
            }
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
      console.log('[Auth] Session callback: Starting', {
        hasToken: !!token,
        hasTokenUserId: !!token?.userId,
        hasTokenSub: !!token?.sub,
        tokenSub: token?.sub,
        hasSession: !!session,
        hasSessionUser: !!session?.user,
        hasSessionUserEmail: !!session?.user?.email,
        sessionUserEmail: session?.user?.email?.substring(0, 10) || 'NONE',
      });

      // 确保 session.user 对象存在
      if (!session.user) {
        session.user = {};
      }

      // 优先从 token.userId 获取（在 JWT callback 中已设置）
      if (token?.userId) {
        session.user.id = token.userId as string;
        console.log('[Auth] Session callback: User ID from token.userId:', token.userId);
        return session;
      }

      // 如果 token.userId 没有，尝试从数据库获取
      if (session.user?.email) {
        try {
          const user = await db
            .select()
            .from(profiles)
            .where(eq(profiles.email, session.user.email))
            .limit(1);

          if (user.length > 0) {
            session.user.id = user[0].id;
            console.log('[Auth] Session callback: User ID fetched from DB:', user[0].id);
            return session;
          } else {
            console.warn('[Auth] Session callback: User not found in database:', session.user.email);
          }
        } catch (error: any) {
          // 数据库连接失败时的 fallback
          console.error('[Auth] Error fetching user ID from database:', {
            error: error.message,
            code: error.code,
            email: session.user.email,
          });
        }
      }

      // 最后的 fallback：使用 token.sub（NextAuth 默认的用户标识符）
      if (token?.sub) {
        console.warn('[Auth] Session callback: Using token.sub as last resort fallback:', token.sub);
        session.user.id = token.sub as string;
        console.log('[Auth] Session callback: Set session.user.id to token.sub:', session.user.id);
        return session;
      }

      // 如果所有方法都失败
      console.error('[Auth] Session callback: No user ID available!', {
        hasTokenUserId: !!token?.userId,
        hasTokenSub: !!token?.sub,
        hasSessionUserEmail: !!session?.user?.email,
      });

      return session;
    },
  },
  // 移除自定义 signIn 页面，使用默认页面
  // pages: {
  //   signIn: '/auth/signin',
  // },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
};

// Export auth function for use in API routes
let authInstance: ReturnType<typeof NextAuth> | null = null;

export const auth = async () => {
  // Log auth configuration on first call (only in production to avoid spam)
  if (!authInstance && process.env.NODE_ENV === 'production') {
    console.log('[Auth] Initializing NextAuth with config:', {
      hasAuthSecret: !!process.env.AUTH_SECRET,
      authSecretLength: process.env.AUTH_SECRET?.length || 0,
      hasAuthUrl: !!process.env.AUTH_URL,
      authUrl: process.env.AUTH_URL || 'NOT SET',
      hasTrustHost: !!process.env.AUTH_TRUST_HOST,
      trustHost: process.env.AUTH_TRUST_HOST || 'NOT SET',
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      nodeEnv: process.env.NODE_ENV,
    });
  }
  
  if (!authInstance) {
    authInstance = NextAuth(authOptions);
  }
  
  const authResult = await authInstance.auth();
  
  // Log session status in production (only when session is missing to avoid spam)
  if (process.env.NODE_ENV === 'production' && !authResult?.user?.id) {
    console.warn('[Auth] No valid session found:', {
      hasSession: !!authResult,
      hasUser: !!authResult?.user,
      hasUserId: !!authResult?.user?.id,
      userEmail: authResult?.user?.email || 'NONE',
    });
  }
  
  return authResult;
};
