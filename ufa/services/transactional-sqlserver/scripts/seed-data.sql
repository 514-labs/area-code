USE sqlCDC;
GO

-- Clear existing data
DELETE FROM bar;
DELETE FROM foo;

-- Declare variables for foo IDs
DECLARE @foo_id_1 UNIQUEIDENTIFIER = NEWID();
DECLARE @foo_id_2 UNIQUEIDENTIFIER = NEWID();
DECLARE @foo_id_3 UNIQUEIDENTIFIER = NEWID();

-- Insert sample foo records
INSERT INTO foo (id, name, description, status, priority, is_active, metadata, tags, score, large_text, created_at, updated_at) VALUES 
(@foo_id_1, 'Analytics Dashboard', 'Comprehensive solution for managing complex workflows.', 'active', 8, 1, '{"dept":"eng","team":"analytics","region":"us-east-1","cost":299.50}', '["analytics","data","reporting"]', 85, 'Comprehensive documentation section with system architecture and implementation details.', GETDATE(), GETDATE()),
(@foo_id_2, 'User Management', 'Streamlined interface for enhanced user experience.', 'active', 6, 1, '{"dept":"prod","team":"be","region":"us-west-2","cost":150.75}', '["api","backend","db"]', 92, 'Technical specifications include hardware requirements, software dependencies, and config parameters.', GETDATE(), GETDATE()),
(@foo_id_3, 'Payment Gateway', 'Robust system designed for scalability and performance.', 'pending', 9, 1, '{"dept":"ops","team":"security","region":"eu-west-1","cost":425.00}', '["security","auth","encryption"]', 78, 'Operational procedures for deployment, monitoring, and maintenance with step-by-step instructions.', GETDATE(), GETDATE());

-- Insert sample bar records (distributed across foo records)
INSERT INTO bar (foo_id, value, label, notes, is_enabled, created_at, updated_at) VALUES 
(@foo_id_1, 156, 'Primary', 'Configured for optimal performance with monitoring enabled.', 1, GETDATE(), GETDATE()),
(@foo_id_1, 298, 'Secondary', 'Requires manual review and approval before deployment.', 1, GETDATE(), GETDATE()),
(@foo_id_1, 445, 'Backup', 'Automated processing with fallback to manual mode.', 0, GETDATE(), GETDATE()),
(@foo_id_2, 72, 'Test', 'Integrated with external systems for real-time updates.', 1, GETDATE(), GETDATE()),
(@foo_id_2, 833, 'Production', 'Scheduled for maintenance during off-peak hours.', 1, GETDATE(), GETDATE()),
(@foo_id_2, 119, 'Development', 'Enhanced security features with audit trail logging.', 1, GETDATE(), GETDATE()),
(@foo_id_3, 567, 'Staging', 'Optimized for high-throughput data processing.', 1, GETDATE(), GETDATE()),
(@foo_id_3, 234, 'Alpha', 'Configured with redundancy for business continuity.', 0, GETDATE(), GETDATE()),
(@foo_id_3, 789, 'Beta', 'Requires manual review and approval before deployment.', 1, GETDATE(), GETDATE()),
(@foo_id_3, 401, 'Release', 'Automated processing with fallback to manual mode.', 1, GETDATE(), GETDATE());
GO