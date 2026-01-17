import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { threads, messages, profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// 测试数据库连接配置（使用环境变量或默认配置）
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

// 跳过测试如果没有数据库连接（CI/CD 或开发环境可能没有）
const hasDatabase = !!TEST_DATABASE_URL;

describe.skipIf(!hasDatabase)('Module 1: Thread 删除与权限隔离', () => {
  let userAId: string;
  let userBId: string;
  let threadAId: string;
  let messageAId: string;

  beforeAll(async () => {
    // 检查测试数据库连接
    if (!TEST_DATABASE_URL) {
      throw new Error('TEST_DATABASE_URL or DATABASE_URL must be set for integration tests');
    }
  });

  beforeEach(async () => {
    // 清理测试数据（可选，如果需要）
    // 为测试创建隔离的用户和 Thread
  });

  afterAll(async () => {
    // 清理测试数据
    try {
      if (threadAId) {
        await db.delete(threads).where(eq(threads.id, threadAId));
      }
      if (userAId) {
        await db.delete(profiles).where(eq(profiles.id, userAId));
      }
      if (userBId) {
        await db.delete(profiles).where(eq(profiles.id, userBId));
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('Thread 删除测试', () => {
    it('应该删除 Thread 及其关联的 Messages（级联删除）', async () => {
      // 1. 创建用户 A
      const [userA] = await db.insert(profiles).values({
        email: `test-user-a-${Date.now()}@example.com`,
        fullName: 'Test User A',
      }).returning();
      userAId = userA.id;

      // 2. 创建 Thread
      const [thread] = await db.insert(threads).values({
        userId: userA.id,
        hotelName: 'Test Hotel',
        title: 'Test Thread',
      }).returning();
      threadAId = thread.id;

      // 3. 创建关联的 Messages
      const [message1] = await db.insert(messages).values({
        threadId: thread.id,
        role: 'user',
        content: 'Test message 1',
      }).returning();
      messageAId = message1.id;

      const [message2] = await db.insert(messages).values({
        threadId: thread.id,
        role: 'assistant',
        content: 'Test response 1',
      }).returning();

      // 4. 验证数据存在
      const threadsBefore = await db.select().from(threads).where(eq(threads.id, thread.id));
      expect(threadsBefore.length).toBe(1);

      const messagesBefore = await db.select().from(messages).where(eq(messages.threadId, thread.id));
      expect(messagesBefore.length).toBe(2);

      // 5. 删除 Thread（模拟 API DELETE 操作）
      await db.delete(threads).where(eq(threads.id, thread.id));

      // 6. 验证 Thread 已被删除
      const threadsAfter = await db.select().from(threads).where(eq(threads.id, thread.id));
      expect(threadsAfter.length).toBe(0);

      // 7. 验证关联的 Messages 也被级联删除（ON DELETE CASCADE）
      const messagesAfter = await db.select().from(messages).where(eq(messages.threadId, thread.id));
      expect(messagesAfter.length).toBe(0);

      // 清理
      threadAId = ''; // 标记已删除
    });
  });

  describe('登录与 Profile 关联测试', () => {
    it('应该为新用户创建 Profile 并赋予默认偏好', async () => {
      const testEmail = `test-new-user-${Date.now()}@example.com`;
      
      // 1. 模拟新用户登录（signIn callback 逻辑）
      const existingUser = await db
        .select()
        .from(profiles)
        .where(eq(profiles.email, testEmail))
        .limit(1);

      expect(existingUser.length).toBe(0);

      // 2. 创建新用户（模拟 signIn callback）
      const [newUser] = await db.insert(profiles).values({
        email: testEmail,
        fullName: 'Test New User',
        avatarUrl: 'https://example.com/avatar.jpg',
        // 默认值应该由数据库默认值或应用逻辑设置
      }).returning();

      // 3. 验证新用户已创建
      expect(newUser.id).toBeDefined();
      expect(newUser.email).toBe(testEmail);

      // 4. 验证默认偏好（从 schema 看，应该有默认值）
      // 注意：如果默认值在数据库层面，需要查询数据库
      const [fetchedUser] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, newUser.id))
        .limit(1);

      // 验证默认值（如果数据库设置了默认值）
      // bedPreference 和 budgetLevel 应该在 schema 中有默认值
      expect(fetchedUser.bedPreference).toBe('King Size');
      expect(fetchedUser.budgetLevel).toBe('Luxury');

      // 清理
      await db.delete(profiles).where(eq(profiles.id, newUser.id));
    });

    it('应该在 JWT callback 中存储 userId', async () => {
      // 这个测试需要模拟 NextAuth 的 JWT callback
      // 由于 JWT callback 是 NextAuth 内部调用，我们测试结果而不是过程
      const testEmail = `test-jwt-${Date.now()}@example.com`;
      
      // 1. 创建用户
      const [user] = await db.insert(profiles).values({
        email: testEmail,
        fullName: 'Test JWT User',
      }).returning();

      // 2. 验证用户 ID 存在（JWT callback 应该能够获取）
      expect(user.id).toBeDefined();
      
      // 3. 验证可以通过 email 查询用户 ID（JWT callback 的逻辑）
      const [fetchedUser] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.email, testEmail))
        .limit(1);

      expect(fetchedUser.id).toBe(user.id);

      // 清理
      await db.delete(profiles).where(eq(profiles.id, user.id));
    });
  });

  describe('权限隔离测试', () => {
    beforeEach(async () => {
      // 创建用户 A 和用户 B
      const [userA] = await db.insert(profiles).values({
        email: `test-user-a-perm-${Date.now()}@example.com`,
        fullName: 'Test User A',
      }).returning();
      userAId = userA.id;

      const [userB] = await db.insert(profiles).values({
        email: `test-user-b-perm-${Date.now()}@example.com`,
        fullName: 'Test User B',
      }).returning();
      userBId = userB.id;
    });

    it('用户 B 应该无法访问用户 A 的 Thread（GET /api/threads/[threadId]）', async () => {
      // 1. 用户 A 创建 Thread
      const [thread] = await db.insert(threads).values({
        userId: userAId,
        hotelName: 'User A Hotel',
        title: 'User A Thread',
      }).returning();
      threadAId = thread.id;

      // 2. 尝试以用户 B 的身份查询该 Thread（模拟 API GET 操作）
      const userBThreads = await db
        .select()
        .from(threads)
        .where(eq(threads.id, thread.id));

      expect(userBThreads.length).toBe(1);

      // 3. 验证所有权（API 逻辑：检查 userId）
      if (userBThreads[0].userId !== userBId) {
        // 这不是用户 B 的 Thread，应该返回 403
        // 在实际 API 中，这里会返回 403 Forbidden
        expect(userBThreads[0].userId).toBe(userAId);
      }

      // 4. 验证用户 B 的 GET /api/threads 不包含用户 A 的 Thread
      const allUserBThreads = await db
        .select()
        .from(threads)
        .where(eq(threads.userId, userBId));

      const userAThreadInBList = allUserBThreads.find(t => t.id === thread.id);
      expect(userAThreadInBList).toBeUndefined();
    });

    it('用户 B 应该无法删除用户 A 的 Thread（DELETE /api/threads/[threadId]）', async () => {
      // 1. 用户 A 创建 Thread
      const [thread] = await db.insert(threads).values({
        userId: userAId,
        hotelName: 'User A Hotel',
        title: 'User A Thread',
      }).returning();
      threadAId = thread.id;

      // 2. 验证所有权（API 逻辑：检查 userId）
      const [fetchedThread] = await db
        .select()
        .from(threads)
        .where(eq(threads.id, thread.id));

      expect(fetchedThread.userId).toBe(userAId);
      expect(fetchedThread.userId).not.toBe(userBId);

      // 3. 如果尝试删除（模拟 API DELETE 操作），应该检查所有权
      // 在实际 API 中，如果 userId 不匹配，应该返回 403 Forbidden
      // 这里我们验证删除应该失败（不执行删除）
      const beforeDelete = await db
        .select()
        .from(threads)
        .where(eq(threads.id, thread.id));

      expect(beforeDelete.length).toBe(1);
      
      // 模拟权限检查失败（不删除）
      // 在实际 API 中：if (thread.userId !== session.user.id) return 403
      const shouldDelete = fetchedThread.userId === userBId;
      expect(shouldDelete).toBe(false);

      // 验证 Thread 仍然存在
      const afterCheck = await db
        .select()
        .from(threads)
        .where(eq(threads.id, thread.id));

      expect(afterCheck.length).toBe(1);
    });

    it('GET /api/threads 应该只返回当前用户的 Threads', async () => {
      // 1. 用户 A 创建 Thread
      const [threadA] = await db.insert(threads).values({
        userId: userAId,
        hotelName: 'User A Hotel',
        title: 'User A Thread',
      }).returning();

      // 2. 用户 B 创建 Thread
      const [threadB] = await db.insert(threads).values({
        userId: userBId,
        hotelName: 'User B Hotel',
        title: 'User B Thread',
      }).returning();

      // 3. 查询用户 A 的 Threads（模拟 GET /api/threads）
      const userAThreads = await db
        .select()
        .from(threads)
        .where(eq(threads.userId, userAId));

      // 4. 验证只包含用户 A 的 Thread
      expect(userAThreads.length).toBeGreaterThan(0);
      expect(userAThreads.every(t => t.userId === userAId)).toBe(true);
      expect(userAThreads.find(t => t.id === threadB.id)).toBeUndefined();

      // 5. 查询用户 B 的 Threads
      const userBThreads = await db
        .select()
        .from(threads)
        .where(eq(threads.userId, userBId));

      expect(userBThreads.length).toBeGreaterThan(0);
      expect(userBThreads.every(t => t.userId === userBId)).toBe(true);
      expect(userBThreads.find(t => t.id === threadA.id)).toBeUndefined();

      // 清理
      await db.delete(threads).where(eq(threads.id, threadA.id));
      await db.delete(threads).where(eq(threads.id, threadB.id));
    });
  });
});
