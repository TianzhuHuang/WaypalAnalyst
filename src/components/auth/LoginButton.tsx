'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { LogIn, LogOut, User } from 'lucide-react';
import { useState } from 'react';

// 检查是否为开发环境
const isDevelopment = process.env.NODE_ENV === 'development' || 
                      (typeof window !== 'undefined' && window.location.hostname === 'localhost');

export default function LoginButton() {
  const { data: session, status } = useSession();
  const [isMockLoggingIn, setIsMockLoggingIn] = useState(false);

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

  const handleLogin = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/components/auth/LoginButton.tsx:52',message:'Login button clicked',data:{isDevelopment,currentUrl:window.location.href},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
    // #endregion

    // 开发环境：使用 Mock 登录
    if (isDevelopment) {
      setIsMockLoggingIn(true);
      try {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/components/auth/LoginButton.tsx:59',message:'Starting mock login flow',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
        // #endregion

        // 步骤 1: Mock 登录（创建/更新用户）
        const mockLoginResponse = await fetch('/api/auth/mock-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test-user@gmail.com',
            name: 'Test User',
          }),
        });

        if (!mockLoginResponse.ok) {
          throw new Error('Mock login failed');
        }

        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/components/auth/LoginButton.tsx:73',message:'Mock login successful, creating session',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
        // #endregion

        // 步骤 2: 使用 Credentials provider 创建 NextAuth session
        await signIn('credentials', {
          email: 'test-user@gmail.com',
          redirect: true,
          callbackUrl: '/',
        });
      } catch (error: any) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/components/auth/LoginButton.tsx:83',message:'Mock login error',data:{errorMessage:error?.message||'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
        // #endregion

        console.error('Mock login error:', error);
        alert('Mock 登录失败: ' + (error.message || '未知错误'));
      } finally {
        setIsMockLoggingIn(false);
      }
    } else {
      // 生产环境：使用真实的 Google OAuth
      signIn('google');
    }
  };

  return (
    <button
      onClick={handleLogin}
      disabled={isMockLoggingIn}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#12d65e] hover:bg-[#15e064] disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-medium transition-colors text-sm"
    >
      <LogIn className="w-4 h-4" />
      <span>
        {isMockLoggingIn 
          ? '登录中...' 
          : isDevelopment 
            ? 'Mock 登录' 
            : 'Google 登录'}
      </span>
    </button>
  );
}
