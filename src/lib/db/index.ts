import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// 获取数据库连接字符串
const connectionString = process.env.DATABASE_URL;

// 延迟初始化数据库连接，避免在构建时连接
let client: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  if (!client) {
    client = postgres(connectionString, {
      max: 10, // 最大连接数
      idle_timeout: 20, // 空闲连接超时（秒）
      connect_timeout: 10, // 连接超时（秒）
    });
  }

  if (!dbInstance) {
    dbInstance = drizzle(client, { schema });
  }

  return dbInstance;
}

// 使用 getter 模式，延迟初始化
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const db = getDb();
    const value = db[prop as keyof ReturnType<typeof drizzle>];
    if (typeof value === 'function') {
      return value.bind(db);
    }
    return value;
  },
});

// 导出 schema 供迁移使用
export { schema };
