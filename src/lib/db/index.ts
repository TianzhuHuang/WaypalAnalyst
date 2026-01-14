import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// 获取数据库连接字符串
const connectionString = process.env.DATABASE_URL;

// #region agent log
fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/lib/db/index.ts:6',message:'Checking DATABASE_URL',data:{hasDatabaseUrl:!!connectionString,urlLength:connectionString?.length||0,urlPrefix:connectionString?.substring(0,20)||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
// #endregion

if (!connectionString) {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/1c36209a-603e-4d99-af36-1961247a84af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/lib/db/index.ts:13',message:'DATABASE_URL missing',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  throw new Error('DATABASE_URL environment variable is not set');
}

// 创建 PostgreSQL 客户端（使用连接池）
const client = postgres(connectionString, {
  max: 10, // 最大连接数
  idle_timeout: 20, // 空闲连接超时（秒）
  connect_timeout: 10, // 连接超时（秒）
});

// 创建 Drizzle 实例
export const db = drizzle(client, { schema });

// 导出 schema 供迁移使用
export { schema };
