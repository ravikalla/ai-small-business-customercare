-- Small Business Care System Database Migration
-- Author: Ravi Kalla <ravi2523096+sbc@gmail.com>

-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id BIGSERIAL PRIMARY KEY,
    business_id VARCHAR(100) UNIQUE NOT NULL,
    business_name VARCHAR(200) NOT NULL,
    owner_phone VARCHAR(20) UNIQUE NOT NULL,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    knowledge_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create knowledge_entries table
CREATE TABLE IF NOT EXISTS knowledge_entries (
    id BIGSERIAL PRIMARY KEY,
    knowledge_id VARCHAR(100) UNIQUE NOT NULL,
    business_id VARCHAR(100) NOT NULL REFERENCES businesses(business_id) ON DELETE CASCADE,
    business_name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('text', 'document', 'image')),
    filename VARCHAR(500),
    file_type VARCHAR(20),
    content_preview TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_businesses_owner_phone ON businesses(owner_phone);
CREATE INDEX IF NOT EXISTS idx_businesses_business_id ON businesses(business_id);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_registered_at ON businesses(registered_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_business_id ON knowledge_entries(business_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_knowledge_id ON knowledge_entries(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_type ON knowledge_entries(type);
CREATE INDEX IF NOT EXISTS idx_knowledge_created_at ON knowledge_entries(created_at DESC);

-- Enable Row Level Security
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (optional - enables multi-tenant security)
-- Businesses can only see their own data
CREATE POLICY businesses_isolation ON businesses
    FOR ALL USING (true); -- For now, allow all access via service key

CREATE POLICY knowledge_isolation ON knowledge_entries
    FOR ALL USING (true); -- For now, allow all access via service key

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_businesses_updated_at 
    BEFORE UPDATE ON businesses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_entries_updated_at 
    BEFORE UPDATE ON knowledge_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (if using service role key)
-- These are typically handled automatically by Supabase