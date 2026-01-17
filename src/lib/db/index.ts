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

    // 对于 Unix Socket，手动解析连接字符串为配置对象
    const baseOptions: any = {
      max: 10, // 最大连接数
      idle_timeout: 20, // 空闲连接超时（秒）
      connect_timeout: isUnixSocket ? 30 : 10, // Unix socket 连接可能需要更长时间
      max_lifetime: 60 * 30, // 30 分钟
    };

    if (isUnixSocket) {
      // 解析 Unix Socket 连接字符串
      // 格式: postgresql://user:password@/database?host=/cloudsql/...
      try {
        // 使用正则表达式解析基本部分（去掉 host 参数）
        const baseUrl = connectionString.split('?')[0]; // postgresql://user:password@/database
        const urlMatch = baseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@\/(.+)/);
        
        if (urlMatch) {
          const [, user, password, database] = urlMatch;
          
          // 提取 host 参数（Unix Socket 路径）
          const hostMatch = connectionString.match(/host=([^&]+)/);
          const socketPath = hostMatch ? hostMatch[1] : null;
          
          if (socketPath) {
            // 构造配置对象（postgres.js 支持配置对象格式）
            const configOptions = {
              ...baseOptions,
              host: socketPath,
              user: decodeURIComponent(user),
              password: decodeURIComponent(password),
              database: database,
              ssl: false, // Unix Socket 不需要 SSL
            };
            
            console.log('[DB] Using Unix Socket connection:', {
              socketPath,
              user: decodeURIComponent(user),
              database,
            });
            
            client = postgres(configOptions);
          } else {
            throw new Error('Unix Socket path not found in connection string');
          }
        } else {
          throw new Error('Failed to parse Unix Socket connection string format');
        }
      } catch (parseError: any) {
        console.error('[DB] Error parsing Unix Socket connection string:', parseError.message);
        throw new Error(`Failed to parse Unix Socket connection string: ${parseError.message}`);
      }
    } else {
      // 对于普通连接，直接使用连接字符串
      client = postgres(connectionString, baseOptions);
    }

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
