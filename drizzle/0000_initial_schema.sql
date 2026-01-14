-- Drizzle Migration: Initial Schema
-- Execute this SQL in your Google Cloud SQL PostgreSQL database

-- Create enum type for order status
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- Profiles 表：用户资料和偏好
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    bed_preference TEXT DEFAULT 'King Size',
    budget_level TEXT DEFAULT 'Luxury',
    dietary_restrictions TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Threads 表：对话会话
CREATE TABLE IF NOT EXISTS threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    hotel_name TEXT NOT NULL,
    hotel_id TEXT,
    check_in DATE,
    check_out DATE,
    metadata JSONB DEFAULT '{}',
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages 表：对话消息
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Orders 表：订单系统
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES threads(id),
    hotel_name TEXT NOT NULL,
    total_price DECIMAL(12, 2),
    currency TEXT DEFAULT 'CNY',
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    status order_status DEFAULT 'pending',
    booking_details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_threads_user_id ON threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_updated_at ON threads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_thread_id ON orders(thread_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 创建 updated_at 自动更新触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为 threads 和 profiles 表添加 updated_at 触发器
CREATE TRIGGER update_threads_updated_at BEFORE UPDATE ON threads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
