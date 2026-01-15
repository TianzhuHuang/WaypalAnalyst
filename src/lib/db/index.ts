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
    // 检测是否是 Unix socket 连接（Cloud SQL）
    const isUnixSocket = connectionString.includes('/cloudsql/') || connectionString.includes('host=/cloudsql/');
    
    console.log('[DB] Initializing database connection:', {
      hasConnectionString: !!connectionString,
      isUnixSocket,
      connectionStringPreview: connectionString.substring(0, 50) + '...',
    });

    client = postgres(connectionString, {
      max: 10, // 最大连接数
      idle_timeout: 20, // 空闲连接超时（秒）
      connect_timeout: isUnixSocket ? 30 : 10, // Unix socket 连接可能需要更长时间
      // 对于 Cloud SQL，增加重试次数
      max_lifetime: 60 * 30, // 30 分钟
    });

    // 测试连接
    client`SELECT 1`.then(() => {
      console.log('[DB] Database connection test successful');
    }).catch((error: any) => {
      console.error('[DB] Database connection test failed:', {
        error: error.message,
        code: error.code,
        errno: error.errno,
      });
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
