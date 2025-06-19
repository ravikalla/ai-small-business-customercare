/**
 * Supabase Database Configuration
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');
const RetryManager = require('../utils/retry');

class DatabaseConfig {
    constructor() {
        this.isConnected = false;
        this.supabaseUrl = process.env.SUPABASE_URL;
        this.supabaseKey = process.env.SUPABASE_ANON_KEY;
        this.supabase = null;
    }

    async connect() {
        try {
            if (!this.supabaseUrl || !this.supabaseKey) {
                throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
            }

            logger.info('[DB] Connecting to Supabase...');
            
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: false // Server-side, don't persist sessions
                },
                db: {
                    schema: 'public'
                }
            });

            // Test connection with a simple health check
            await RetryManager.withRetry(async () => {
                const { error } = await this.supabase.from('businesses').select('count').limit(1);
                if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist yet, which is ok
                    throw error;
                }
            }, {
                maxAttempts: 3,
                delayMs: 1000,
                retryCondition: (error) => {
                    // Retry on network or timeout errors
                    return error.code === 'ECONNREFUSED' || 
                           error.code === 'ETIMEDOUT' ||
                           error.message?.includes('timeout');
                },
                operationName: 'supabaseConnect'
            });

            this.isConnected = true;
            logger.success(`[DB] Connected to Supabase: ${this.supabaseUrl}`);

        } catch (error) {
            logger.error('[DB] Failed to connect to Supabase:', error);
            throw error;
        }
    }

    getClient() {
        if (!this.supabase) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.supabase;
    }

    async disconnect() {
        // Supabase client doesn't need explicit disconnection
        this.isConnected = false;
        this.supabase = null;
        logger.info('[DB] Disconnected from Supabase');
    }

    isHealthy() {
        return this.isConnected && this.supabase !== null;
    }

    async getConnectionStatus() {
        if (!this.isHealthy()) {
            return {
                status: 'disconnected',
                isHealthy: false,
                url: this.supabaseUrl
            };
        }

        try {
            // Test with a simple query
            const start = Date.now();
            const { error } = await this.supabase.from('businesses').select('count').limit(1);
            const latency = Date.now() - start;

            return {
                status: error && error.code !== 'PGRST116' ? 'error' : 'connected',
                isHealthy: !error || error.code === 'PGRST116',
                url: this.supabaseUrl,
                latency: `${latency}ms`,
                lastError: error && error.code !== 'PGRST116' ? error.message : null
            };
        } catch (error) {
            return {
                status: 'error',
                isHealthy: false,
                url: this.supabaseUrl,
                error: error.message
            };
        }
    }

    async createTables() {
        try {
            logger.info('[DB] Creating database tables...');
            
            const client = this.getClient();
            
            // Note: In production, you'd run these SQL commands in Supabase dashboard
            // For development, we'll check if tables exist and guide user to create them
            
            const { data, error } = await client.from('businesses').select('count').limit(1);
            
            if (error && error.code === 'PGRST116') {
                logger.warn('[DB] Tables not found. Please create tables in Supabase dashboard:');
                logger.warn('[DB] 1. Go to your Supabase project dashboard');
                logger.warn('[DB] 2. Navigate to SQL Editor');
                logger.warn('[DB] 3. Run the table creation scripts');
                
                // We'll create a migration file for the user
                await this.generateMigrationScript();
                
                throw new Error('Database tables not found. Please run the migration script in Supabase.');
            }
            
            logger.success('[DB] Database tables verified');
            
        } catch (error) {
            logger.error('[DB] Error with database tables:', error);
            throw error;
        }
    }

    async generateMigrationScript() {
        const migrationSQL = `
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
`;

        const fs = require('fs').promises;
        const path = require('path');
        
        const migrationPath = path.join(__dirname, '../../migrations/001_initial_schema.sql');
        await fs.mkdir(path.dirname(migrationPath), { recursive: true });
        await fs.writeFile(migrationPath, migrationSQL);
        
        logger.info(`[DB] Migration script created at: ${migrationPath}`);
        logger.info('[DB] Please run this script in your Supabase SQL Editor');
    }
}

module.exports = new DatabaseConfig();