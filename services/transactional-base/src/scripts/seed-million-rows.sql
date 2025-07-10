-- SQL Seed Script for Millions of Foo Records
-- This script generates 2 million foo records directly in PostgreSQL for maximum efficiency

-- Enable timing
\timing

BEGIN;

-- Clean existing data
DELETE FROM bar;
DELETE FROM foo;

-- Create a function to generate random text from an array
CREATE OR REPLACE FUNCTION random_choice(choices TEXT[]) 
RETURNS TEXT AS $$
BEGIN
    RETURN choices[1 + floor(random() * array_length(choices, 1))::int];
END;
$$ LANGUAGE plpgsql;

-- Create a function to generate random JSONB metadata
CREATE OR REPLACE FUNCTION random_metadata() 
RETURNS JSONB AS $$
DECLARE
    departments TEXT[] := ARRAY['Engineering', 'Product', 'Data', 'DevOps', 'Security'];
    teams TEXT[] := ARRAY['Backend', 'Frontend', 'Analytics', 'Infrastructure', 'InfoSec'];
    owners TEXT[] := ARRAY['tech-team', 'product-team', 'data-team', 'ops-team', 'sec-team'];
    regions TEXT[] := ARRAY['us-east-1', 'us-west-2', 'eu-west-1'];
    zones TEXT[] := ARRAY['1a', '1b', '1c', '2a', '2b', '2c'];
    instances TEXT[] := ARRAY['m5.large', 'c5.xlarge', 'r5.2xlarge'];
BEGIN
    RETURN jsonb_build_object(
        'department', random_choice(departments),
        'team', random_choice(teams),
        'owner', random_choice(owners),
        'region', random_choice(regions),
        'zone', random_choice(zones),
        'instance', random_choice(instances),
        'cost', round((random() * 500 + 50)::numeric, 2),
        'budget', round((random() * 600 + 100)::numeric, 2),
        'lastReview', (CURRENT_DATE - (random() * 30)::int)::text,
        'generatedAt', NOW()::text,
        'uniqueId', gen_random_uuid()::text,
        'batchId', floor(random() * 1000000)
    );
END;
$$ LANGUAGE plpgsql;

-- Create a function to generate random tags array
CREATE OR REPLACE FUNCTION random_tags() 
RETURNS TEXT[] AS $$
DECLARE
    tag_sets TEXT[][] := ARRAY[
        ARRAY['api', 'backend', 'database'],
        ARRAY['frontend', 'ui', 'react'],
        ARRAY['analytics', 'data', 'reporting'],
        ARRAY['security', 'auth', 'encryption'],
        ARRAY['performance', 'optimization', 'caching'],
        ARRAY['cloud', 'aws', 'serverless'],
        ARRAY['ai', 'ml', 'automation'],
        ARRAY['realtime', 'websocket', 'streaming'],
        ARRAY['mobile', 'responsive', 'pwa'],
        ARRAY['testing', 'qa', 'ci-cd'],
        ARRAY['monitoring', 'logging', 'alerting'],
        ARRAY['search', 'elasticsearch', 'indexing'],
        ARRAY['payments', 'billing', 'subscription'],
        ARRAY['email', 'notification', 'messaging'],
        ARRAY['file', 'storage', 'upload'],
        ARRAY['docker', 'kubernetes', 'containers'],
        ARRAY['microservices', 'distributed', 'scalable'],
        ARRAY['backup', 'recovery', 'disaster'],
        ARRAY['compliance', 'audit', 'governance'],
        ARRAY['devops', 'infrastructure', 'deployment']
    ];
BEGIN
    RETURN tag_sets[1 + floor(random() * array_length(tag_sets, 1))::int] || 
           ARRAY['batch-' || floor(random() * 1000)::text];
END;
$$ LANGUAGE plpgsql;

-- Create names array for random selection
CREATE OR REPLACE FUNCTION random_service_name() 
RETURNS TEXT AS $$
DECLARE
    names TEXT[] := ARRAY[
        'Analytics Dashboard', 'User Management', 'Payment Gateway', 'Email Service',
        'Authentication System', 'File Storage', 'Search Engine', 'Chat System',
        'Notification Service', 'Content Management', 'API Gateway', 'Database Backup',
        'Log Aggregator', 'Monitoring Service', 'Cache Layer', 'Load Balancer',
        'Image Processor', 'Video Transcoder', 'PDF Generator', 'Report Builder',
        'Workflow Engine', 'Task Scheduler', 'Event Streaming', 'Data Pipeline',
        'Machine Learning', 'AI Assistant', 'Security Scanner', 'Backup Service',
        'Inventory System', 'Order Processing', 'Customer Support', 'Marketing Tool',
        'Social Media', 'Blog Platform', 'Forum System', 'Wiki Platform',
        'Document Editor', 'Spreadsheet Tool', 'Presentation App', 'Drawing Board',
        'Calendar System', 'Time Tracker', 'Project Manager', 'Team Collaboration',
        'Code Repository', 'Build System', 'Deployment Tool', 'Testing Framework',
        'Performance Monitor', 'Error Tracking', 'User Analytics', 'A/B Testing',
        'Data Warehouse', 'ETL Pipeline', 'Message Queue', 'Service Mesh',
        'Container Registry', 'Secrets Manager', 'Config Service', 'Health Check',
        'Rate Limiter', 'Circuit Breaker', 'Feature Flags', 'Audit Logger',
        'Compliance Tool', 'Backup System', 'Disaster Recovery', 'Metrics Collection',
        'Alerting System', 'Incident Response', 'Runbook Manager', 'Knowledge Base',
        'Documentation Hub', 'Change Management', 'Release Pipeline', 'Quality Assurance',
        'Security Audit', 'Penetration Testing', 'Vulnerability Scanner', 'Threat Detection',
        'Access Control', 'Identity Provider', 'Single Sign-On', 'Multi-Factor Auth',
        'Password Manager', 'Session Manager', 'Token Service', 'Encryption Service',
        'Key Management', 'Certificate Authority', 'Network Monitor', 'Bandwidth Analyzer',
        'Latency Monitor', 'Uptime Tracker', 'Resource Monitor', 'Cost Optimizer',
        'Usage Analytics', 'Capacity Planner', 'Auto Scaler', 'Load Tester',
        'Stress Tester', 'Performance Profiler', 'Memory Analyzer', 'CPU Monitor',
        'Disk Monitor', 'Network Analyzer', 'Database Monitor', 'Query Optimizer',
        'Index Advisor', 'Backup Validator', 'Data Integrity', 'Sync Service',
        'Replication Manager', 'Failover System', 'Chaos Engineering', 'Experiment Platform',
        'Canary Deployer', 'Blue-Green Deploy', 'Rolling Update', 'Rollback Manager'
    ];
BEGIN
    RETURN random_choice(names);
END;
$$ LANGUAGE plpgsql;

-- Create descriptions array for random selection
CREATE OR REPLACE FUNCTION random_description() 
RETURNS TEXT AS $$
DECLARE
    descriptions TEXT[] := ARRAY[
        'A comprehensive solution for managing complex workflows and data processing.',
        'Streamlined interface for enhanced user experience and productivity.',
        'Robust system designed for scalability and high-performance operations.',
        'Innovative platform that integrates seamlessly with existing infrastructure.',
        'Advanced analytics and reporting capabilities for data-driven decisions.',
        'Secure and reliable service with enterprise-grade features.',
        'Real-time processing engine with low-latency response times.',
        'Cloud-native architecture optimized for modern applications.',
        'Intelligent automation system that reduces manual overhead.',
        'Flexible framework supporting multiple integration patterns.',
        'High-throughput system capable of handling millions of requests.',
        'User-friendly interface with intuitive navigation and controls.',
        'Distributed system with fault tolerance and automatic recovery.',
        'Advanced security features including encryption and access controls.',
        'Comprehensive monitoring and alerting system for operational excellence.',
        'Lightweight solution with minimal resource requirements.',
        'Scalable microservice architecture with container support.',
        'Machine learning powered insights and predictive analytics.',
        'Real-time collaboration platform with multi-user support.',
        'Event-driven architecture with asynchronous processing capabilities.',
        'High-availability system with 99.99% uptime guarantee.',
        'Enterprise-grade solution with 24/7 support and monitoring.',
        'Cost-effective platform that reduces operational overhead.',
        'Multi-tenant architecture supporting thousands of organizations.',
        'API-first design enabling seamless third-party integrations.'
    ];
BEGIN
    RETURN random_choice(descriptions);
END;
$$ LANGUAGE plpgsql;

-- Create large text template function
CREATE OR REPLACE FUNCTION random_large_text() 
RETURNS TEXT AS $$
DECLARE
    templates TEXT[] := ARRAY[
        'This is a comprehensive documentation section that contains detailed information about the system architecture, implementation details, and best practices for maintenance and troubleshooting. It includes performance tuning guidelines, security considerations, and operational procedures.',
        'Technical specifications and requirements for this component include specific hardware requirements, software dependencies, configuration parameters, and performance benchmarks that must be met. The system requires minimum 8GB RAM, 4 CPU cores, and 100GB storage space.',
        'Operational procedures for deployment, monitoring, and maintenance of this system component. Includes step-by-step instructions for common administrative tasks and emergency procedures. Regular maintenance windows should be scheduled monthly.',
        'Historical context and evolution of this system component, including major version changes, architectural decisions, and lessons learned from previous implementations. The system has undergone 5 major revisions since its initial deployment.',
        'Performance metrics and benchmarking data collected over time, including response times, throughput measurements, error rates, and resource utilization statistics. Average response time is 150ms with 99.9% uptime.',
        'Security considerations and compliance requirements for this component, including access controls, encryption standards, audit logging, and regulatory compliance measures. All data is encrypted at rest and in transit.',
        'Integration guidelines and API documentation for connecting this component with other systems, including authentication requirements, data formats, and error handling procedures. RESTful APIs with OpenAPI 3.0 specification.',
        'Disaster recovery and business continuity planning documentation including backup procedures, recovery time objectives (RTO), recovery point objectives (RPO), and failover mechanisms. RTO is 4 hours, RPO is 1 hour.',
        'Monitoring and alerting configuration including key performance indicators (KPIs), threshold values, escalation procedures, and dashboard configurations. Critical alerts are sent to on-call team within 2 minutes.'
    ];
BEGIN
    RETURN random_choice(templates) || ' Generated at ' || NOW()::text || ' with unique identifier ' || gen_random_uuid()::text || '.';
END;
$$ LANGUAGE plpgsql;

-- Log start time
SELECT 'Starting to insert 2,000,000 foo records at: ' || NOW();

-- Insert 2 million records in batches of 10,000
-- This uses a more efficient approach with generate_series
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
    random() < 0.5,
    random_metadata(),
    random_tags(),
    round((random() * 100)::numeric, 2),
    random_large_text()
FROM generate_series(1, 2000000) AS i;

-- Log completion
SELECT 'Completed inserting records at: ' || NOW();
SELECT 'Total foo records: ' || COUNT(*) FROM foo;

-- Create some bar records for testing (using a sample of foo records)
INSERT INTO bar (foo_id, value, label, notes, is_enabled)
SELECT 
    f.id,
    10 + floor(random() * 1000)::int,
    'Bar for ' || f.name,
    'This bar belongs to ' || f.name,
    random() < 0.8  -- 80% enabled
FROM (
    SELECT id, name 
    FROM foo 
    ORDER BY random() 
    LIMIT 100
) f
CROSS JOIN generate_series(1, (1 + floor(random() * 3)::int)) -- 1-3 bars per foo
;

-- Log bar completion
SELECT 'Total bar records: ' || COUNT(*) FROM bar;

-- Clean up functions
DROP FUNCTION IF EXISTS random_choice(TEXT[]);
DROP FUNCTION IF EXISTS random_metadata();
DROP FUNCTION IF EXISTS random_tags();
DROP FUNCTION IF EXISTS random_service_name();
DROP FUNCTION IF EXISTS random_description();
DROP FUNCTION IF EXISTS random_large_text();

COMMIT;

-- Final summary
SELECT 'Seed completed successfully!' as status;
SELECT 'Foo records: ' || COUNT(*) FROM foo;
SELECT 'Bar records: ' || COUNT(*) FROM bar; 