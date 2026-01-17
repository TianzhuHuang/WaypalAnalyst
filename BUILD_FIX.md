# 构建错误修复

## 问题

Cloud Build 失败，TypeScript 类型错误：

```
Type error: Type '{}' is not assignable to type 'AdapterUser & { id: string; email: string; name?: string | null | undefined; image?: string | null | undefined; }'.
Type '{}' is missing the following properties from type 'AdapterUser': id, email, emailVerified
```

位置：`src/lib/auth.ts:210`

## 原因

在 `session` callback 中，代码试图将空对象 `{}` 赋值给 `session.user`：

```typescript
if (!session.user) {
  session.user = {}; // ❌ 类型错误
}
```

但 TypeScript 要求 `session.user` 必须符合 `AdapterUser` 类型，需要至少包含 `id`, `email`, `emailVerified` 属性。

## 修复

移除了不必要的检查，因为：

1. 在 NextAuth.js 中，`session.user` 应该总是存在（从 token 构建）
2. 后续代码已经使用可选链（`session.user?.email`）来安全访问
3. 如果真的不存在，直接返回 session 即可

修复后的代码：

```typescript
// 如果 session 或 session.user 不存在，直接返回
if (!session?.user) {
  console.error('[Auth] Session callback: No session or user found');
  return session;
}

// 优先从 token.userId 获取（在 JWT callback 中已设置）
if (token?.userId) {
  session.user.id = token.userId as string;
  // ...
}
```

## 验证

- ✅ 本地构建成功：`npm run build`
- ✅ 无 TypeScript 错误
- ✅ 无 linter 错误

## 提交

已提交修复：
```bash
git commit -m "fix: 修复 TypeScript 类型错误 - session.user 不能为空对象"
```

Cloud Build 应该能够成功构建。
