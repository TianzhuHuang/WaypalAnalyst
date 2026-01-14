import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Ensure AUTH_SECRET, AUTH_URL, and AUTH_TRUST_HOST are set for NextAuth v5 compatibility
// NextAuth v5 requires AUTH_SECRET and AUTH_URL environment variables
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

export const authOptions: NextAuthConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  // Trust host for NextAuth v5 (required for localhost)
  trustHost: true,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' && user.email) {
        try {
          // 检查用户是否存在
          const existingUser = await db
            .select()
            .from(profiles)
            .where(eq(profiles.email, user.email))
            .limit(1);

          // 如果不存在，创建新用户
          if (existingUser.length === 0) {
            await db.insert(profiles).values({
              email: user.email,
              fullName: user.name || null,
              avatarUrl: user.image || null,
            });
          } else {
            // 如果存在，更新头像和名称（如果变化）
            await db
              .update(profiles)
              .set({
                fullName: user.name || existingUser[0].fullName,
                avatarUrl: user.image || existingUser[0].avatarUrl,
                updatedAt: new Date(),
              })
              .where(eq(profiles.email, user.email));
          }
        } catch (error) {
          console.error('Error creating/updating user:', error);
          // 即使出错也允许登录，避免阻塞用户
        }
      }
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
