import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// 获取数据库连接字符串
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
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
