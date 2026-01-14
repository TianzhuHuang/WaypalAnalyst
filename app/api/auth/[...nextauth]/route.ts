import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// Ensure AUTH_SECRET and AUTH_URL are set for NextAuth v5 (required at module level)
if (process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = process.env.NEXTAUTH_SECRET;
}
if (process.env.NEXTAUTH_URL && !process.env.AUTH_URL) {
  process.env.AUTH_URL = process.env.NEXTAUTH_URL;
}

const { handlers } = NextAuth(authOptions);

export const { GET, POST } = handlers;
