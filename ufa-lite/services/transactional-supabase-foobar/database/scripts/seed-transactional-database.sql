-- SQL Seed Script for High-Volume Foo and Bar Records  
-- This script creates PostgreSQL PROCEDURES to efficiently generate millions of records
-- 
-- IMPORTANT: Uses PROCEDURES (not functions) to handle transactions properly
-- This prevents WAL (Write-Ahead Log) crashes when inserting millions of records
-- 
-- USAGE EXAMPLES:
-- CALL seed_foo_data(); -- default 1M foo records (keeps existing data)
-- CALL seed_foo_data(5000000); -- 5M foo records (keeps existing data)
-- CALL seed_foo_data(1000000, true); -- 1M foo records (cleans existing data first)
-- CALL seed_bar_data(); -- default 100K bar records (keeps existing data)
-- CALL seed_bar_data(2000000); -- 2M bar records (keeps existing data)
-- CALL seed_all_data(); -- 1M foo + 100K bar records (keeps existing data)
-- CALL seed_all_data(10000000, 5000000, true); -- 10M foo + 5M bar (cleans first)

-- Drop existing functions and procedures to avoid conflicts
DROP FUNCTION IF EXISTS seed_transactional_data(INT);
DROP FUNCTION IF EXISTS seed_foo_data(INT);
DROP FUNCTION IF EXISTS seed_bar_data(INT);
DROP FUNCTION IF EXISTS seed_all_data(INT, INT);
DROP PROCEDURE IF EXISTS seed_foo_data(INT, BOOLEAN);
DROP PROCEDURE IF EXISTS seed_bar_data(INT, BOOLEAN);
DROP PROCEDURE IF EXISTS seed_all_data(INT, INT, BOOLEAN);
DROP FUNCTION IF EXISTS random_choice(TEXT[]);
DROP FUNCTION IF EXISTS random_metadata();
DROP FUNCTION IF EXISTS random_tags();
DROP FUNCTION IF EXISTS random_service_name();
DROP FUNCTION IF EXISTS random_description();
DROP FUNCTION IF EXISTS random_large_text();
DROP FUNCTION IF EXISTS random_created_at();
DROP FUNCTION IF EXISTS random_updated_at(TIMESTAMP);
DROP FUNCTION IF EXISTS random_bar_label();
DROP FUNCTION IF EXISTS random_bar_notes();
DROP FUNCTION IF EXISTS random_foo_id();



-- Helper function: Generate random metadata (high-performance)
CREATE OR REPLACE FUNCTION random_metadata() 
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object(
        'dept', (ARRAY['eng', 'prod', 'data', 'ops', 'sec'])[1 + floor(random() * 5)::int],
        'team', (ARRAY['be', 'fe', 'analytics', 'infra', 'security'])[1 + floor(random() * 5)::int],
        'region', (ARRAY['us-east-1', 'us-west-2', 'eu-west-1'])[1 + floor(random() * 3)::int],
        'cost', round((random() * 500 + 50)::numeric, 2)
    );
END;
$$ LANGUAGE plpgsql;

-- Helper function: Generate random tags (high-performance)
CREATE OR REPLACE FUNCTION random_tags() 
RETURNS TEXT[] AS $$
BEGIN
    -- Direct array selection for maximum performance
    RETURN CASE floor(random() * 10)::int
        WHEN 0 THEN ARRAY['api', 'backend', 'db']
        WHEN 1 THEN ARRAY['frontend', 'ui', 'react']
        WHEN 2 THEN ARRAY['analytics', 'data', 'reporting']
        WHEN 3 THEN ARRAY['security', 'auth', 'encryption']
        WHEN 4 THEN ARRAY['performance', 'optimization', 'cache']
        WHEN 5 THEN ARRAY['cloud', 'aws', 'serverless']
        WHEN 6 THEN ARRAY['ai', 'ml', 'automation']
        WHEN 7 THEN ARRAY['realtime', 'websocket', 'stream']
        WHEN 8 THEN ARRAY['mobile', 'responsive', 'pwa']
        ELSE ARRAY['testing', 'qa', 'ci-cd']
    END;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Generate random service name (high-performance)
CREATE OR REPLACE FUNCTION random_service_name() 
RETURNS TEXT AS $$
BEGIN
    RETURN (ARRAY[
        'Analytics Dashboard', 'User Management', 'Payment Gateway', 'Email Service',
        'Auth System', 'File Storage', 'Search Engine', 'Chat System',
        'Notification Service', 'Content Management', 'API Gateway', 'DB Backup',
        'Log Aggregator', 'Monitoring Service', 'Cache Layer', 'Load Balancer',
        'Image Processor', 'Video Transcoder', 'PDF Generator', 'Report Builder',
        'Workflow Engine', 'Task Scheduler', 'Event Streaming', 'Data Pipeline'
    ])[1 + floor(random() * 24)::int];
END;
$$ LANGUAGE plpgsql;

-- Helper function: Generate random description (high-performance)
CREATE OR REPLACE FUNCTION random_description() 
RETURNS TEXT AS $$
BEGIN
    RETURN (ARRAY[
        'Comprehensive solution for managing complex workflows.',
        'Streamlined interface for enhanced user experience.',
        'Robust system designed for scalability and performance.',
        'Innovative platform with seamless integration capabilities.',
        'Advanced analytics and reporting for data-driven decisions.',
        'Secure and reliable service with enterprise features.',
        'Real-time processing engine with low-latency responses.',
        'Cloud-native architecture optimized for modern apps.'
    ])[1 + floor(random() * 8)::int];
END;
$$ LANGUAGE plpgsql;

-- Helper function: Generate random large text (high-performance)
CREATE OR REPLACE FUNCTION random_large_text() 
RETURNS TEXT AS $$
BEGIN
    RETURN (ARRAY[
        'Comprehensive documentation section with system architecture and implementation details.',
        'Technical specifications include hardware requirements, software dependencies, and config parameters.',
        'Operational procedures for deployment, monitoring, and maintenance with step-by-step instructions.',
        'Historical context and evolution including major version changes and architectural decisions.',
        'Performance metrics and benchmarking data with response times and throughput measurements.',
        'Security considerations and compliance requirements with access controls and encryption standards.',
        'Integration guidelines and API documentation for connecting with other systems.',
        'Disaster recovery and business continuity planning with backup procedures and recovery objectives.'
    ])[1 + floor(random() * 8)::int];
END;
$$ LANGUAGE plpgsql;

-- Helper function: Generate random timestamp within the last 6 months
CREATE OR REPLACE FUNCTION random_created_at() 
RETURNS TIMESTAMP AS $$
BEGIN
    -- Generate random timestamp between 6 months ago and now
    RETURN NOW() - INTERVAL '6 months' + (random() * INTERVAL '6 months');
END;
$$ LANGUAGE plpgsql;

-- Helper function: Generate random updated_at timestamp after created_at
CREATE OR REPLACE FUNCTION random_updated_at(created_at_value TIMESTAMP) 
RETURNS TIMESTAMP AS $$
BEGIN
    -- Generate random timestamp between created_at and now
    RETURN created_at_value + (random() * (NOW() - created_at_value));
END;
$$ LANGUAGE plpgsql;

-- High-performance Foo seeding procedure
CREATE OR REPLACE PROCEDURE seed_foo_data(record_count INT DEFAULT 1000000, clean_existing BOOLEAN DEFAULT false)
LANGUAGE plpgsql AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    foo_records BIGINT;
    batch_size INT := 500;  -- Even smaller batch size to prevent WAL issues
    current_batch INT := 0;
    batch_start INT;
    batch_end INT;
    total_batches INT;
BEGIN
    -- Record start time
    start_time := NOW();
    total_batches := CEIL(record_count::FLOAT / batch_size);
    
    -- Log start
    RAISE NOTICE 'Starting high-volume insert of % foo records in % batches of % records each', record_count, total_batches, batch_size;
    
    -- Clean existing data if requested
    IF clean_existing THEN
        RAISE NOTICE 'Cleaning existing data (clean_existing = true)';
        TRUNCATE TABLE bar, foo CASCADE;
        COMMIT;
    ELSE
        RAISE NOTICE 'Keeping existing data (clean_existing = false)';
    END IF;

    -- Insert the foo records in batches with commits
    WHILE current_batch * batch_size < record_count LOOP
        batch_start := current_batch * batch_size + 1;
        batch_end := LEAST((current_batch + 1) * batch_size, record_count);
        
        -- Progress reporting every 100 batches
        IF current_batch % 100 = 0 THEN
            RAISE NOTICE 'Processing batch % of % (%.1f%% complete)', current_batch + 1, total_batches, 
                        (current_batch::FLOAT / total_batches * 100);
        END IF;
        
        INSERT INTO foo (
            name,
            description,
            status,
            priority,
            is_active,
            metadata,
            tags,
            score,
            large_text,
            created_at,
            updated_at
        )
        SELECT 
            random_service_name() || '_' || i,
            random_description(),
            (ARRAY['active', 'inactive', 'pending', 'archived'])[1 + floor(random() * 4)::int]::foo_status,
            1 + floor(random() * 10)::int,
            random() < 0.7,  -- 70% active
            random_metadata(),
            random_tags(),
            round((random() * 100)::numeric, 2),
            random_large_text(),
            created_at_val,
            random_updated_at(created_at_val)
        FROM (
            SELECT 
                i,
                random_created_at() AS created_at_val
            FROM generate_series(batch_start, batch_end) AS i
        ) AS subquery;
        
        current_batch := current_batch + 1;
        
        -- Commit every 10 batches to prevent WAL buildup
        IF current_batch % 10 = 0 THEN
            COMMIT;
        END IF;
    END LOOP;

    -- Final commit
    COMMIT;

    -- Get foo count
    SELECT COUNT(*) INTO foo_records FROM foo;
    
    -- Record end time
    end_time := NOW();
    
    RAISE NOTICE 'High-volume foo seed completed! Inserted % foo records in % (%.0f records/second)', 
                foo_records, (end_time - start_time), 
                foo_records / EXTRACT(EPOCH FROM (end_time - start_time));
END;
$$;

-- Helper function: Generate random bar label
CREATE OR REPLACE FUNCTION random_bar_label() 
RETURNS TEXT AS $$
BEGIN
    RETURN (ARRAY[
        'Primary', 'Secondary', 'Backup', 'Test', 'Production', 'Development',
        'Staging', 'Alpha', 'Beta', 'Release', 'Hotfix', 'Feature',
        'Critical', 'Important', 'Normal', 'Low', 'High', 'Medium',
        'Urgent', 'Routine', 'Special', 'Custom', 'Default', 'Override'
    ])[1 + floor(random() * 24)::int];
END;
$$ LANGUAGE plpgsql;

-- Helper function: Generate random bar notes
CREATE OR REPLACE FUNCTION random_bar_notes() 
RETURNS TEXT AS $$
BEGIN
    RETURN (ARRAY[
        'Configured for optimal performance with monitoring enabled.',
        'Requires manual review and approval before deployment.',
        'Automated processing with fallback to manual mode.',
        'Integrated with external systems for real-time updates.',
        'Scheduled for maintenance during off-peak hours.',
        'Enhanced security features with audit trail logging.',
        'Optimized for high-throughput data processing.',
        'Configured with redundancy for business continuity.'
    ])[1 + floor(random() * 8)::int];
END;
$$ LANGUAGE plpgsql;

-- Helper function: Get random foo_id for foreign key reference (OPTIMIZED)
CREATE OR REPLACE FUNCTION random_foo_id() 
RETURNS UUID AS $$
DECLARE
    foo_id UUID;
    foo_count BIGINT;
    random_offset BIGINT;
BEGIN
    -- Get total foo count (cached by PostgreSQL)
    SELECT COUNT(*) INTO foo_count FROM foo;
    
    -- Get random offset
    random_offset := floor(random() * foo_count)::BIGINT;
    
    -- Get foo_id at random offset (much faster than ORDER BY random())
    SELECT id INTO foo_id FROM foo OFFSET random_offset LIMIT 1;
    
    RETURN foo_id;
END;
$$ LANGUAGE plpgsql;

-- Reliable Bar seeding procedure (WAL-safe optimization)
CREATE OR REPLACE PROCEDURE seed_bar_data(record_count INT DEFAULT 100000, clean_existing BOOLEAN DEFAULT false)
LANGUAGE plpgsql AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    bar_records BIGINT;
    batch_size INT := 5000;  -- Conservative batch size to prevent WAL issues
    current_batch INT := 0;
    batch_start INT;
    batch_end INT;
    total_batches INT;
    foo_ids UUID[];
    foo_count INT;
    foo_idx INT;
    base_time TIMESTAMP;
BEGIN
    -- Record start time
    start_time := NOW();
    base_time := NOW() - INTERVAL '6 months';
    total_batches := CEIL(record_count::FLOAT / batch_size);
    
    -- Pre-load 1000 random foo_ids at start (MUCH faster than querying per batch)
    SELECT array_agg(id) INTO foo_ids FROM (
        SELECT id FROM foo TABLESAMPLE SYSTEM(1) LIMIT 1000
    ) AS sample_foo;
    foo_count := array_length(foo_ids, 1);
    
    IF foo_count = 0 THEN
        RAISE EXCEPTION 'No foo records found. Please seed foo data first.';
    END IF;
    
    -- Log start
    RAISE NOTICE 'Starting reliable insert of % bar records in % batches of % records each', record_count, total_batches, batch_size;
    RAISE NOTICE 'Pre-loaded % foo_ids for referencing', foo_count;
    
    -- Clean existing bar data if requested (but not foo data)
    IF clean_existing THEN
        RAISE NOTICE 'Cleaning existing bar data (clean_existing = true)';
        DELETE FROM bar;
        COMMIT;
    ELSE
        RAISE NOTICE 'Keeping existing bar data (clean_existing = false)';
    END IF;

    -- Insert bar records in safe batches (WAL-friendly)
    WHILE current_batch * batch_size < record_count LOOP
        batch_start := current_batch * batch_size + 1;
        batch_end := LEAST((current_batch + 1) * batch_size, record_count);
        
        -- Get random foo_id from pre-loaded array (INSTANT)
        foo_idx := 1 + floor(random() * foo_count)::int;
        
        -- Progress reporting every 2 batches
        IF current_batch % 2 = 0 THEN
            RAISE NOTICE 'Processing batch % of % (%.1f%% complete)', current_batch + 1, total_batches, 
                        (current_batch::FLOAT / total_batches * 100);
        END IF;
        
        -- Small delay every 10 batches to let WAL catch up
        IF current_batch % 10 = 0 THEN
            PERFORM pg_sleep(0.1);
        END IF;
        
        INSERT INTO bar (
            foo_id,
            value,
            label,
            notes,
            is_enabled,
            created_at,
            updated_at
        )
        SELECT 
            foo_ids[foo_idx],  -- Pre-loaded foo_id (INSTANT)
            floor(random() * 1000)::int,  -- Random value 0-999
            (ARRAY['Primary','Secondary','Backup','Test','Production','Development'])[1 + floor(random() * 6)::int],
            (ARRAY['Fast processing','Quick turnaround','Optimized performance','High throughput'])[1 + floor(random() * 4)::int],
            random() < 0.8,  -- 80% enabled
            base_time + (random() * INTERVAL '6 months'),  -- Direct random timestamp
            base_time + (random() * INTERVAL '6 months')   -- Direct random timestamp
        FROM generate_series(batch_start, batch_end) AS i;
        
        current_batch := current_batch + 1;
        
        -- Commit every 2 batches to prevent WAL buildup
        IF current_batch % 2 = 0 THEN
            COMMIT;
        END IF;
    END LOOP;

    -- Final commit
    COMMIT;

    -- Get bar count
    SELECT COUNT(*) INTO bar_records FROM bar;
    
    -- Record end time
    end_time := NOW();
    
    RAISE NOTICE 'Reliable bar seed completed! Inserted % bar records in % (%.0f records/second)', 
                bar_records, (end_time - start_time), 
                bar_records / EXTRACT(EPOCH FROM (end_time - start_time));
END;
$$;

-- Combined seeding procedure for both foo and bar data
CREATE OR REPLACE PROCEDURE seed_all_data(foo_count INT DEFAULT 1000000, bar_count INT DEFAULT 100000, clean_existing BOOLEAN DEFAULT false)
LANGUAGE plpgsql AS $$
BEGIN
    RAISE NOTICE 'Starting combined data seeding: % foo records, % bar records', foo_count, bar_count;
    
    -- Seed foo data first
    CALL seed_foo_data(foo_count, clean_existing);
    
    -- Seed bar data (always keep existing foo data for bar seeding)
    CALL seed_bar_data(bar_count, false);
    
    RAISE NOTICE 'Combined data seeding completed!';
END;
$$;

