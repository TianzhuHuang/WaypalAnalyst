'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function TestLoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMockLogin = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/test-login/page.tsx:15',message:'Mock login button clicked',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
    // #endregion

    try {
      const response = await fetch('/api/auth/mock-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test-user@gmail.com',
          name: 'Test User',
          image: null,
        }),
      });

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/test-login/page.tsx:32',message:'Mock login API response',data:{status:response.status,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
      // #endregion

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mock login');
      }

      setResult(data);

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/test-login/page.tsx:42',message:'Mock login success',data:{userId:data.user?.id,email:data.user?.email?.substring(0,15)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
      // #endregion

      // 刷新页面以更新 session
      router.refresh();
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/test-login/page.tsx:50',message:'Mock login error',data:{errorMessage:err?.message||'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
      // #endregion

      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckDatabase = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/test-login/page.tsx:58',message:'Check database button clicked',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
    // #endregion

    try {
      // 使用测试端点，不需要认证
      const response = await fetch('/api/test-profile?email=test-user@gmail.com');
      const data = await response.json();

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/test-login/page.tsx:66',message:'Test profile API response',data:{status:response.status,found:data.found},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
      // #endregion

      if (response.ok) {
        setResult({ type: 'profile', data });
      } else {
        setError(data.error || data.message || 'Failed to fetch profile');
      }
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/test-login/page.tsx:75',message:'Check database error',data:{errorMessage:err?.message||'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'MOCK'})}).catch(()=>{});
      // #endregion

      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Mock Login Test Page</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Session Status</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Status:</span>{' '}
              <span className={status === 'authenticated' ? 'text-green-400' : 'text-yellow-400'}>
                {status}
              </span>
            </p>
            {session?.user && (
              <>
                <p>
                  <span className="font-medium">Email:</span> {session.user.email}
                </p>
                <p>
                  <span className="font-medium">Name:</span> {session.user.name || 'N/A'}
                </p>
                <p>
                  <span className="font-medium">User ID:</span> {session.user.id || 'N/A'}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="space-y-4">
            <button
              onClick={handleMockLogin}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {isLoading ? 'Processing...' : 'Mock Login (test-user@gmail.com)'}
            </button>

            <button
              onClick={handleCheckDatabase}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {isLoading ? 'Loading...' : 'Check Database Profile'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-400 mb-2">Error</h3>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-900/50 border border-green-700 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-400 mb-2">Result</h3>
            <pre className="text-sm overflow-auto bg-gray-900 p-4 rounded">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Click "Mock Login" to simulate a login for test-user@gmail.com</li>
            <li>The system will check if the user exists in the database</li>
            <li>If not exists, it will create a new profile record</li>
            <li>If exists, it will update the existing profile</li>
            <li>Click "Check Database Profile" to verify the profile was created/updated</li>
            <li>Check the logs in .cursor/debug.log to see the full flow</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
