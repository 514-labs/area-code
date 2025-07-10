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
-- CALL seed_bar_data(); -- default 500K bar records (keeps existing data)
-- CALL seed_bar_data(2000000); -- 2M bar records (keeps existing data)
-- CALL seed_all_data(); -- 1M foo + 500K bar records (keeps existing data)
-- CALL seed_all_data(10000000, 5000000, true); -- 10M foo + 5M bar (cleans first)

-- Drop existing functions and procedures to avoid conflicts
DROP FUNCTION IF EXISTS seed_transactional_data(INT);
DROP FUNCTION IF EXISTS seed_foo_data(INT);
DROP FUNCTION IF EXISTS seed_bar_data(INT);
DROP FUNCTION IF EXISTS seed_all_data(INT, INT);
DROP PROCEDURE IF EXISTS seed_foo_data(INT);
DROP PROCEDURE IF EXISTS seed_bar_data(INT);
DROP PROCEDURE IF EXISTS seed_all_data(INT, INT);
DROP FUNCTION IF EXISTS random_choice(TEXT[]);
DROP FUNCTION IF EXISTS random_metadata();
DROP FUNCTION IF EXISTS random_tags();
DROP FUNCTION IF EXISTS random_service_name();
DROP FUNCTION IF EXISTS random_description();
DROP FUNCTION IF EXISTS random_large_text();



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

-- High-performance Foo seeding procedure
CREATE OR REPLACE PROCEDURE seed_foo_data(record_count INT DEFAULT 1000000, clean_existing BOOLEAN DEFAULT false)
LANGUAGE plpgsql AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    foo_records BIGINT;
    batch_size INT := 1000;  -- Smaller batch size to prevent WAL issues
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
        DELETE FROM bar;
        DELETE FROM foo;
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
            large_text
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
            random_large_text()
        FROM generate_series(batch_start, batch_end) AS i;
        
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

