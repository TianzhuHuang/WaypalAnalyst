import { pgTable, uuid, text, date, jsonb, timestamp, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'cancelled', 'completed']);

// Profiles 表：用户资料和偏好
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  bedPreference: text('bed_preference').default('King Size'), // 偏好：大床、双床等
  budgetLevel: text('budget_level').default('Luxury'), // 偏好：奢侈、精品、性价比
  dietaryRestrictions: text('dietary_restrictions'), // 饮食禁忌
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Threads 表：对话会话
export const threads = pgTable('threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  hotelName: text('hotel_name').notNull(), // 冗余存储酒店名方便显示
  hotelId: text('hotel_id'), // 对应的外部 ID (如有)
  checkIn: date('check_in'),
  checkOut: date('check_out'),
  metadata: jsonb('metadata').default({}), // 存储当时的查价结果快照
  title: text('title'), // 对话标题，例如 "马尔代夫白马庄园 - 2月"
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Messages 表：对话消息
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('thread_id').references(() => threads.id, { onDelete: 'cascade' }).notNull(),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Orders 表：订单系统（为后续交易闭环准备）
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  threadId: uuid('thread_id').references(() => threads.id),
  hotelName: text('hotel_name').notNull(),
  totalPrice: decimal('total_price', { precision: 12, scale: 2 }),
  currency: text('currency').default('CNY'),
  checkIn: date('check_in').notNull(),
  checkOut: date('check_out').notNull(),
  status: orderStatusEnum('status').default('pending'),
  bookingDetails: jsonb('booking_details'), // 存储具体渠道信息，如 Luxtrip
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Relations
export const profilesRelations = relations(profiles, ({ many }) => ({
  threads: many(threads),
  orders: many(orders),
}));

export const threadsRelations = relations(threads, ({ one, many }) => ({
  user: one(profiles, {
    fields: [threads.userId],
    references: [profiles.id],
  }),
  messages: many(messages),
  orders: many(orders),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  thread: one(threads, {
    fields: [messages.threadId],
    references: [threads.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(profiles, {
    fields: [orders.userId],
    references: [profiles.id],
  }),
  thread: one(threads, {
    fields: [orders.threadId],
    references: [threads.id],
  }),
}));

// Type exports
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
