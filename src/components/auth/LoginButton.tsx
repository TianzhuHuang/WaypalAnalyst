'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { LogIn, LogOut, User } from 'lucide-react';

export default function LoginButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5">
        <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        <span className="text-sm text-white/40">加载中...</span>
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {session.user.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || 'User'}
              className="w-8 h-8 rounded-full border border-white/10"
            />
          ) : (
            <div className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
              <User className="w-4 h-4 text-white/60" />
            </div>
          )}
          <span className="text-sm text-white/90 hidden md:block">{session.user.name || session.user.email}</span>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-sm text-white/80"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline">退出</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn('google')}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#12d65e] hover:bg-[#15e064] text-black font-medium transition-colors text-sm"
    >
      <LogIn className="w-4 h-4" />
      <span>Google 登录</span>
    </button>
  );
}
