USE sqlCDC;
GO

-- SQL Server Dynamic Seed Script for High-Volume Foo and Bar Records
-- Supports configurable record counts via SQLCMD variables
-- 
-- USAGE EXAMPLES:
-- sqlcmd -v FOO_COUNT=1000 BAR_COUNT=5000 -i seed-data.sql  (custom counts)
-- sqlcmd -v FOO_COUNT=10 BAR_COUNT=50 -i seed-data.sql     (small dataset)
-- sqlcmd -i seed-data.sql                                  (default: 100 foo, 500 bar)

-- Set default values if variables not provided (will be substituted by script)
SET NOCOUNT ON;
DECLARE @FOO_COUNT INT = $(FOO_COUNT);
DECLARE @BAR_COUNT INT = $(BAR_COUNT);

-- Starting dynamic seed with specified record counts

-- Clear existing data
DELETE FROM bar;
DELETE FROM foo;

-- Helper function: Get random element from array (simulated with CASE statements)
-- Service names
DECLARE @service_names TABLE (id INT IDENTITY(1,1), name VARCHAR(100));
INSERT INTO @service_names (name) VALUES 
('Analytics Dashboard'), ('User Management'), ('Payment Gateway'), ('Email Service'),
('Auth System'), ('File Storage'), ('Search Engine'), ('Chat System'),
('Notification Service'), ('Content Management'), ('API Gateway'), ('DB Backup'),
('Log Aggregator'), ('Monitoring Service'), ('Cache Layer'), ('Load Balancer'),
('Image Processor'), ('Video Transcoder'), ('PDF Generator'), ('Report Builder'),
('Workflow Engine'), ('Task Scheduler'), ('Event Streaming'), ('Data Pipeline');

-- Descriptions
DECLARE @descriptions TABLE (id INT IDENTITY(1,1), description VARCHAR(500));
INSERT INTO @descriptions (description) VALUES 
('Comprehensive solution for managing complex workflows.'),
('Streamlined interface for enhanced user experience.'),
('Robust system designed for scalability and performance.'),
('Innovative platform with seamless integration capabilities.'),
('Advanced analytics and reporting for data-driven decisions.'),
('Secure and reliable service with enterprise features.'),
('Real-time processing engine with low-latency responses.'),
('Cloud-native architecture optimized for modern apps.');

-- Large text options
DECLARE @large_texts TABLE (id INT IDENTITY(1,1), text VARCHAR(1000));
INSERT INTO @large_texts (text) VALUES 
('Comprehensive documentation section with system architecture and implementation details.'),
('Technical specifications include hardware requirements, software dependencies, and config parameters.'),
('Operational procedures for deployment, monitoring, and maintenance with step-by-step instructions.'),
('Historical context and evolution including major version changes and architectural decisions.'),
('Performance metrics and benchmarking data with response times and throughput measurements.'),
('Security considerations and compliance requirements with access controls and encryption standards.'),
('Integration guidelines and API documentation for connecting with other systems.'),
('Disaster recovery and business continuity planning with backup procedures and recovery objectives.');

-- Bar labels
DECLARE @bar_labels TABLE (id INT IDENTITY(1,1), label VARCHAR(50));
INSERT INTO @bar_labels (label) VALUES 
('Primary'), ('Secondary'), ('Backup'), ('Test'), ('Production'), ('Development'),
('Staging'), ('Alpha'), ('Beta'), ('Release'), ('Hotfix'), ('Feature'),
('Critical'), ('Important'), ('Normal'), ('Low'), ('High'), ('Medium');

-- Bar notes
DECLARE @bar_notes TABLE (id INT IDENTITY(1,1), notes VARCHAR(500));
INSERT INTO @bar_notes (notes) VALUES 
('Configured for optimal performance with monitoring enabled.'),
('Requires manual review and approval before deployment.'),
('Automated processing with fallback to manual mode.'),
('Integrated with external systems for real-time updates.'),
('Scheduled for maintenance during off-peak hours.'),
('Enhanced security features with audit trail logging.'),
('Optimized for high-throughput data processing.'),
('Configured with redundancy for business continuity.');

-- Departments, teams, regions for metadata
DECLARE @depts TABLE (id INT IDENTITY(1,1), dept VARCHAR(20));
INSERT INTO @depts (dept) VALUES ('eng'), ('prod'), ('data'), ('ops'), ('sec');

DECLARE @teams TABLE (id INT IDENTITY(1,1), team VARCHAR(20));
INSERT INTO @teams (team) VALUES ('be'), ('fe'), ('analytics'), ('infra'), ('security');

DECLARE @regions TABLE (id INT IDENTITY(1,1), region VARCHAR(20));
INSERT INTO @regions (region) VALUES ('us-east-1'), ('us-west-2'), ('eu-west-1');

-- Status values
DECLARE @statuses TABLE (id INT IDENTITY(1,1), status VARCHAR(20));
INSERT INTO @statuses (status) VALUES ('active'), ('inactive'), ('pending'), ('archived');

-- Tags arrays (simplified as comma-separated for SQL Server)
DECLARE @tag_sets TABLE (id INT IDENTITY(1,1), tags VARCHAR(500));
INSERT INTO @tag_sets (tags) VALUES 
('["api","backend","db"]'), ('["frontend","ui","react"]'), ('["analytics","data","reporting"]'),
('["security","auth","encryption"]'), ('["performance","optimization","cache"]'), ('["cloud","aws","serverless"]'),
('["ai","ml","automation"]'), ('["realtime","websocket","stream"]'), ('["mobile","responsive","pwa"]'),
('["testing","qa","ci-cd"]');

-- Create temp table to store foo IDs for bar foreign key references
CREATE TABLE #foo_ids (id UNIQUEIDENTIFIER);

-- Seeding foo records silently

-- Generate foo records in batches
DECLARE @i INT = 1;
DECLARE @batch_size INT = 100;
DECLARE @start_time DATETIME2 = GETDATE();

WHILE @i <= @FOO_COUNT
BEGIN
    DECLARE @end_batch INT = IIF(@i + @batch_size - 1 > @FOO_COUNT, @FOO_COUNT, @i + @batch_size - 1);
    
    -- Progress reporting disabled for cleaner output
    
    WITH batch_data AS (
        SELECT 
            ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) as rn,
            NEWID() as new_id
        FROM master.dbo.spt_values s1 
        CROSS JOIN master.dbo.spt_values s2
        WHERE s1.type = 'P' AND s2.type = 'P'
    )
    INSERT INTO foo (id, name, description, status, priority, is_active, metadata, tags, score, large_text, created_at, updated_at)
    OUTPUT inserted.id INTO #foo_ids
    SELECT 
        bd.new_id,
        sn.name + '_' + CAST((@i + bd.rn - 1) AS VARCHAR(10)),
        d.description,
        s.status,
        1 + (ABS(CHECKSUM(NEWID())) % 10),
        IIF(ABS(CHECKSUM(NEWID())) % 100 < 70, 1, 0), -- 70% active
        '{"dept":"' + dp.dept + '","team":"' + t.team + '","region":"' + r.region + '","cost":' + CAST((50 + (ABS(CHECKSUM(NEWID())) % 500)) AS VARCHAR(10)) + '.00}',
        tags.tags,
        ROUND((ABS(CHECKSUM(NEWID())) % 10000) / 100.0, 2),
        lt.text,
        DATEADD(day, -ABS(CHECKSUM(NEWID())) % 180, GETDATE()), -- Random date within last 6 months
        GETDATE()
    FROM batch_data bd
    CROSS JOIN (SELECT TOP 1 name FROM @service_names ORDER BY ABS(CHECKSUM(NEWID()))) sn
    CROSS JOIN (SELECT TOP 1 description FROM @descriptions ORDER BY ABS(CHECKSUM(NEWID()))) d
    CROSS JOIN (SELECT TOP 1 status FROM @statuses ORDER BY ABS(CHECKSUM(NEWID()))) s
    CROSS JOIN (SELECT TOP 1 dept FROM @depts ORDER BY ABS(CHECKSUM(NEWID()))) dp
    CROSS JOIN (SELECT TOP 1 team FROM @teams ORDER BY ABS(CHECKSUM(NEWID()))) t
    CROSS JOIN (SELECT TOP 1 region FROM @regions ORDER BY ABS(CHECKSUM(NEWID()))) r
    CROSS JOIN (SELECT TOP 1 tags FROM @tag_sets ORDER BY ABS(CHECKSUM(NEWID()))) tags
    CROSS JOIN (SELECT TOP 1 text FROM @large_texts ORDER BY ABS(CHECKSUM(NEWID()))) lt
    WHERE bd.rn BETWEEN 1 AND (@end_batch - @i + 1);
    
    SET @i = @end_batch + 1;
END;

DECLARE @foo_time DATETIME2 = GETDATE();
-- Foo seeding completed silently

PRINT 'Seeding ' + CAST(@BAR_COUNT AS VARCHAR(10)) + ' bar records...';

-- Generate bar records with foreign key references
SET @i = 1;
DECLARE @bar_start_time DATETIME2 = GETDATE();

-- Get count of foo records for random selection
DECLARE @foo_record_count INT;
SELECT @foo_record_count = COUNT(*) FROM #foo_ids;

WHILE @i <= @BAR_COUNT
BEGIN
    DECLARE @bar_end_batch INT = IIF(@i + @batch_size - 1 > @BAR_COUNT, @BAR_COUNT, @i + @batch_size - 1);
    
    -- Progress reporting disabled for cleaner output
    
    WITH batch_data AS (
        SELECT 
            ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) as rn
        FROM master.dbo.spt_values s1 
        CROSS JOIN master.dbo.spt_values s2
        WHERE s1.type = 'P' AND s2.type = 'P'
    )
    INSERT INTO bar (foo_id, value, label, notes, is_enabled, created_at, updated_at)
    SELECT 
        (SELECT TOP 1 id FROM #foo_ids ORDER BY ABS(CHECKSUM(NEWID()))), -- Random foo_id
        ABS(CHECKSUM(NEWID())) % 1000, -- Random value 0-999
        bl.label,
        bn.notes,
        IIF(ABS(CHECKSUM(NEWID())) % 100 < 80, 1, 0), -- 80% enabled
        DATEADD(day, -ABS(CHECKSUM(NEWID())) % 180, GETDATE()), -- Random date within last 6 months
        GETDATE()
    FROM batch_data bd
    CROSS JOIN (SELECT TOP 1 label FROM @bar_labels ORDER BY ABS(CHECKSUM(NEWID()))) bl
    CROSS JOIN (SELECT TOP 1 notes FROM @bar_notes ORDER BY ABS(CHECKSUM(NEWID()))) bn
    WHERE bd.rn BETWEEN 1 AND (@bar_end_batch - @i + 1);
    
    SET @i = @bar_end_batch + 1;
END;

DECLARE @bar_time DATETIME2 = GETDATE();
-- Bar seeding completed silently

-- Cleanup
DROP TABLE #foo_ids;

-- Final verification
DECLARE @final_foo_count INT, @final_bar_count INT;
SELECT @final_foo_count = COUNT(*) FROM foo;
SELECT @final_bar_count = COUNT(*) FROM bar;

DECLARE @total_time DATETIME2 = GETDATE();
PRINT 'Dynamic seeding completed!';
PRINT 'Total records: ' + CAST(@final_foo_count AS VARCHAR(10)) + ' foo, ' + CAST(@final_bar_count AS VARCHAR(10)) + ' bar';
PRINT 'Total time: ' + CAST(DATEDIFF(SECOND, @start_time, @total_time) AS VARCHAR(10)) + ' seconds';

GO