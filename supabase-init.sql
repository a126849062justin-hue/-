-- HCF AI System - Supabase Database Initialization Script
-- Run this in the Supabase SQL Editor

-- 1. AI Interactions (每次 AI 對話記錄)
CREATE TABLE IF NOT EXISTS ai_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    device_type TEXT DEFAULT 'unknown',   -- 'mobile', 'tablet', 'desktop'
    engine TEXT NOT NULL,                 -- 'claude', 'gemini'
    user_message TEXT,
    ai_response TEXT,
    response_time INTEGER DEFAULT 0,      -- 毫秒
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    cost DECIMAL(10, 6) DEFAULT 0,        -- USD
    success BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Page Views (頁面瀏覽追蹤)
CREATE TABLE IF NOT EXISTS page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    device_type TEXT DEFAULT 'unknown',
    page_url TEXT,
    referrer TEXT,
    session_duration INTEGER DEFAULT 0,   -- 秒
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bookings (預約記錄)
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    course TEXT,
    price DECIMAL(10, 2),
    status TEXT DEFAULT 'pending',        -- 'pending', 'confirmed', 'cancelled'
    ai_recommended BOOLEAN DEFAULT FALSE,
    ai_engine TEXT,                       -- 推薦的 AI 引擎
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. System Logs (系統健康記錄)
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engine TEXT,
    status TEXT DEFAULT 'healthy',        -- 'healthy', 'degraded', 'down'
    message TEXT,
    error_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. User Events (使用者行為事件追蹤：CTA點擊、捲動深度、互動事件)
CREATE TABLE IF NOT EXISTS user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    category TEXT NOT NULL,               -- 'cta_click', 'scroll', 'engagement', 'navigation', 'conversion'
    event_name TEXT NOT NULL,             -- e.g. 'fitbook_booking', '75', 'ai_chat_open'
    page_url TEXT,
    device_type TEXT DEFAULT 'desktop',   -- 'mobile', 'tablet', 'desktop'
    metadata JSONB DEFAULT '{}',          -- extra data (label, value, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_interactions_engine ON ai_interactions (engine);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_created_at ON ai_interactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_success ON ai_interactions (success);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON user_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_category ON user_events (category);
CREATE INDEX IF NOT EXISTS idx_user_events_event_name ON user_events (event_name);

-- Row Level Security (RLS) - disable for server-side access with service key
-- ⚠️ WARNING: RLS is disabled for server-side access with service_role key ONLY
-- In production, consider enabling RLS with proper policies
-- Make sure to NEVER expose your service_role key to the client
ALTER TABLE ai_interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE page_views DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_events DISABLE ROW LEVEL SECURITY;
