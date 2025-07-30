#!/usr/bin/env python3
"""
SQL Server Data Seeding Script
Generates foo and bar data for SQL Server database with CDC enabled
Uses docker exec with sqlcmd (same approach as existing setup)
"""

import sys
import os
import logging
import argparse
import random
import json
import subprocess
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

class SQLServerSeeder:
    def __init__(self, container_name: str = "transactional-sqlserver-sqlserver-1"):
        """Initialize SQL Server seeder with container name"""
        self.container_name = container_name
        
    def check_container_running(self) -> bool:
        """Check if SQL Server container is running"""
        try:
            result = subprocess.run([
                'docker', 'ps', '--format', '{{.Names}}', '--filter', f'name={self.container_name}'
            ], capture_output=True, text=True, check=True)
            
            if self.container_name in result.stdout:
                logger.info(f"✅ Container {self.container_name} is running")
                return True
            else:
                logger.error(f"❌ Container {self.container_name} is not running")
                return False
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Failed to check container status: {e}")
            return False
    
    def test_connection(self) -> bool:
        """Test SQL Server connection"""
        try:
            result = subprocess.run([
                'docker', 'exec', self.container_name,
                '/opt/mssql-tools18/bin/sqlcmd', '-S', 'localhost', '-U', 'sa', '-P', 'Password!',
                '-Q', 'SELECT 1 as test;', '-N', '-C'
            ], capture_output=True, text=True, check=True)
            
            if 'test' in result.stdout:
                logger.info("✅ SQL Server connection successful")
                return True
            else:
                logger.error("❌ SQL Server connection test failed")
                return False
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ SQL Server connection failed: {e}")
            return False
    
    def execute_sql_file(self, sql_content: str) -> bool:
        """Execute SQL content using docker exec and sqlcmd with stdin"""
        try:
            # Execute SQL by piping content to sqlcmd
            process = subprocess.run([
                'docker', 'exec', '-i', self.container_name,
                '/opt/mssql-tools18/bin/sqlcmd', '-S', 'localhost', '-U', 'sa', '-P', 'Password!',
                '-N', '-C'
            ], input=sql_content, text=True, capture_output=True, check=True)
            
            return True
                
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ SQL execution failed: {e}")
            if hasattr(e, 'stdout') and e.stdout:
                logger.error(f"stdout: {e.stdout}")
            if hasattr(e, 'stderr') and e.stderr:
                logger.error(f"stderr: {e.stderr}")
            return False
        except Exception as e:
            logger.error(f"❌ Unexpected error executing SQL: {e}")
            return False
    
    def setup_database(self, clear_data: bool = False) -> bool:
        """Setup database schema and enable CDC"""
        logger.info("🏗️ Setting up SQL Server database schema...")
        
        setup_sql = """
-- Create the sqlCDC database for demonstrating capturing data changes
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'sqlCDC')
BEGIN
    CREATE DATABASE sqlCDC;
    PRINT 'Database sqlCDC created successfully';
END
ELSE
BEGIN
    PRINT 'Database sqlCDC already exists';
END
GO

USE sqlCDC;
GO

-- Enable CDC on database if not already enabled
IF NOT EXISTS (SELECT * FROM sys.change_tracking_databases WHERE database_id = DB_ID('sqlCDC'))
BEGIN
    EXEC sys.sp_cdc_enable_db;
    PRINT 'CDC enabled on database sqlCDC';
END
ELSE
BEGIN
    PRINT 'CDC already enabled on database sqlCDC';
END
GO

"""
        
        if clear_data:
            logger.info("🧹 Clearing existing data...")
            setup_sql += """
-- Clear existing data if requested
IF OBJECT_ID('dbo.bar', 'U') IS NOT NULL 
BEGIN
    DROP TABLE dbo.bar;
    PRINT 'Existing bar table dropped';
END

IF OBJECT_ID('dbo.foo', 'U') IS NOT NULL 
BEGIN
    DROP TABLE dbo.foo;
    PRINT 'Existing foo table dropped';
END
GO

"""
        
        setup_sql += """
-- Create foo table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'foo')
BEGIN
    CREATE TABLE foo (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(1000),
        status NVARCHAR(20) CHECK (status IN ('active', 'inactive', 'pending', 'archived')),
        priority INT CHECK (priority BETWEEN 1 AND 10),
        is_active BIT DEFAULT 1,
        metadata NVARCHAR(MAX), -- JSON string
        tags NVARCHAR(MAX), -- JSON array as string
        score DECIMAL(5,2),
        large_text NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Table foo created successfully';
END
ELSE
BEGIN
    PRINT 'Table foo already exists';
END
GO

-- Create bar table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'bar')
BEGIN
    CREATE TABLE bar (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        foo_id UNIQUEIDENTIFIER,
        value INT,
        label NVARCHAR(255),
        notes NVARCHAR(1000),
        is_enabled BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (foo_id) REFERENCES foo(id)
    );
    PRINT 'Table bar created successfully';
END
ELSE
BEGIN
    PRINT 'Table bar already exists';
END
GO

-- Enable CDC on foo table
IF NOT EXISTS (SELECT * FROM cdc.change_tables WHERE source_object_id = OBJECT_ID('dbo.foo'))
BEGIN
    EXEC sys.sp_cdc_enable_table 
        @source_schema = 'dbo', 
        @source_name = 'foo', 
        @role_name = NULL, 
        @supports_net_changes = 0;
    PRINT 'CDC enabled on foo table';
END
ELSE
BEGIN
    PRINT 'CDC already enabled on foo table';
END
GO

-- Enable CDC on bar table
IF NOT EXISTS (SELECT * FROM cdc.change_tables WHERE source_object_id = OBJECT_ID('dbo.bar'))
BEGIN
    EXEC sys.sp_cdc_enable_table 
        @source_schema = 'dbo', 
        @source_name = 'bar', 
        @role_name = NULL, 
        @supports_net_changes = 0;
    PRINT 'CDC enabled on bar table';
END
ELSE
BEGIN
    PRINT 'CDC already enabled on bar table';
END
GO
"""
        
        if not self.execute_sql_file(setup_sql):
            return False
        
        return True

    def generate_random_metadata(self) -> str:
        """Generate random metadata JSON"""
        dept_options = ['eng', 'prod', 'data', 'ops', 'sec']
        team_options = ['be', 'fe', 'analytics', 'infra', 'security']
        region_options = ['us-east-1', 'us-west-2', 'eu-west-1']
        
        metadata = {
            'dept': random.choice(dept_options),
            'team': random.choice(team_options),
            'region': random.choice(region_options),
            'cost': round(random.uniform(50, 550), 2)
        }
        return json.dumps(metadata).replace("'", "''")  # Escape single quotes for SQL
    
    def generate_random_tags(self) -> str:
        """Generate random tags JSON array"""
        tag_sets = [
            ['api', 'backend', 'db'],
            ['frontend', 'ui', 'react'],
            ['analytics', 'data', 'reporting'],
            ['security', 'auth', 'encryption'],
            ['performance', 'optimization', 'cache'],
            ['cloud', 'aws', 'serverless'],
            ['ai', 'ml', 'automation'],
            ['realtime', 'websocket', 'stream'],
            ['mobile', 'responsive', 'pwa'],
            ['testing', 'qa', 'ci-cd']
        ]
        return json.dumps(random.choice(tag_sets)).replace("'", "''")  # Escape single quotes for SQL
    
    def generate_random_timestamp(self, start_months_ago: int = 6) -> str:
        """Generate random timestamp within the last N months"""
        now = datetime.now()
        start_date = now - timedelta(days=start_months_ago * 30)
        random_days = random.randint(0, (now - start_date).days)
        random_time = start_date + timedelta(days=random_days)
        return random_time.strftime('%Y-%m-%d %H:%M:%S')
    
    def seed_foo_data(self, record_count: int, clean_existing: bool = False) -> bool:
        """Seed foo table with specified number of records"""
        logger.info(f"🌱 Seeding {record_count:,} foo records...")
        
        if clean_existing:
            clear_sql = """
USE sqlCDC;
DELETE FROM bar;
DELETE FROM foo;
GO
"""
            if not self.execute_sql_file(clear_sql):
                return False
            logger.info("🧹 Existing data cleared")
        
        # Data generation lists
        service_names = [
            'Analytics Dashboard', 'User Management', 'Payment Gateway', 'Email Service',
            'Auth System', 'File Storage', 'Search Engine', 'Chat System',
            'Notification Service', 'Content Management', 'API Gateway', 'DB Backup',
            'Log Aggregator', 'Monitoring Service', 'Cache Layer', 'Load Balancer',
            'Image Processor', 'Video Transcoder', 'PDF Generator', 'Report Builder',
            'Workflow Engine', 'Task Scheduler', 'Event Streaming', 'Data Pipeline'
        ]
        
        descriptions = [
            'Comprehensive solution for managing complex workflows.',
            'Streamlined interface for enhanced user experience.',
            'Robust system designed for scalability and performance.',
            'Innovative platform with seamless integration capabilities.',
            'Advanced analytics and reporting for data-driven decisions.',
            'Secure and reliable service with enterprise features.',
            'Real-time processing engine with low-latency responses.',
            'Cloud-native architecture optimized for modern apps.'
        ]
        
        large_texts = [
            'Comprehensive documentation section with system architecture and implementation details.',
            'Technical specifications include hardware requirements, software dependencies, and config parameters.',
            'Operational procedures for deployment, monitoring, and maintenance with step-by-step instructions.',
            'Historical context and evolution including major version changes and architectural decisions.',
            'Performance metrics and benchmarking data with response times and throughput measurements.',
            'Security considerations and compliance requirements with access controls and encryption standards.',
            'Integration guidelines and API documentation for connecting with other systems.',
            'Disaster recovery and business continuity planning with backup procedures and recovery objectives.'
        ]
        
        statuses = ['active', 'inactive', 'pending', 'archived']
        
        batch_size = 500  # Smaller batches for SQL file approach
        total_batches = (record_count + batch_size - 1) // batch_size
        
        for batch_num in range(total_batches):
            start_idx = batch_num * batch_size
            end_idx = min(start_idx + batch_size, record_count)
            batch_records = end_idx - start_idx
            
            if batch_num % 5 == 0:
                progress = (batch_num / total_batches) * 100
                logger.info(f"📊 Processing foo batch {batch_num + 1}/{total_batches} ({progress:.1f}% complete)")
            
            # Build batch INSERT SQL
            batch_sql = "USE sqlCDC;\n"
            
            for i in range(batch_records):
                created_at = self.generate_random_timestamp()
                updated_at_dt = datetime.strptime(created_at, '%Y-%m-%d %H:%M:%S') + timedelta(
                    seconds=random.randint(0, int((datetime.now() - datetime.strptime(created_at, '%Y-%m-%d %H:%M:%S')).total_seconds()))
                )
                updated_at = updated_at_dt.strftime('%Y-%m-%d %H:%M:%S')
                
                name = f"{random.choice(service_names)}_{start_idx + i + 1}".replace("'", "''")
                description = random.choice(descriptions).replace("'", "''")
                status = random.choice(statuses)
                priority = random.randint(1, 10)
                is_active = 1 if random.random() < 0.7 else 0
                metadata = self.generate_random_metadata()
                tags = self.generate_random_tags()
                score = round(random.uniform(0, 100), 2)
                large_text = random.choice(large_texts).replace("'", "''")
                
                batch_sql += f"""
INSERT INTO foo (name, description, status, priority, is_active, metadata, tags, score, large_text, created_at, updated_at)
VALUES ('{name}', '{description}', '{status}', {priority}, {is_active}, '{metadata}', '{tags}', {score}, '{large_text}', '{created_at}', '{updated_at}');
"""
            
            batch_sql += "GO\n"
            
            if not self.execute_sql_file(batch_sql):
                logger.error(f"❌ Failed to insert foo batch {batch_num + 1}")
                return False
            
            # Small delay every 10 batches
            if batch_num % 10 == 0 and batch_num > 0:
                time.sleep(0.1)
        
        logger.info(f"✅ Successfully seeded {record_count:,} foo records")
        return True
    
    def seed_bar_data(self, record_count: int, clean_existing: bool = False) -> bool:
        """Seed bar table with specified number of records"""
        logger.info(f"📊 Seeding {record_count:,} bar records...")
        
        if clean_existing:
            clear_sql = """
USE sqlCDC;
DELETE FROM bar;
GO
"""
            if not self.execute_sql_file(clear_sql):
                return False
            logger.info("🧹 Existing bar data cleared")
        
        # Get available foo IDs
        try:
            result = subprocess.run([
                'docker', 'exec', self.container_name,
                '/opt/mssql-tools18/bin/sqlcmd', '-S', 'localhost', '-U', 'sa', '-P', 'Password!',
                '-Q', 'USE sqlCDC; SELECT id FROM foo;', '-N', '-C', '-h', '-1'
            ], capture_output=True, text=True, check=True)
            
            # Parse only lines that look like UUIDs (36 characters with dashes)
            uuid_pattern = re.compile(r'^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$', re.IGNORECASE)
            foo_ids = [line.strip() for line in result.stdout.strip().split('\n') 
                      if line.strip() and uuid_pattern.match(line.strip())]
            
            if not foo_ids:
                logger.error("❌ No foo records found. Please seed foo data first.")
                return False
                
            logger.info(f"📋 Found {len(foo_ids):,} foo records for referencing")
            
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Failed to fetch foo IDs: {e}")
            return False
        
        # Data generation lists
        labels = ['Primary', 'Secondary', 'Backup', 'Test', 'Production', 'Development',
                 'Staging', 'Alpha', 'Beta', 'Release', 'Hotfix', 'Feature']
        
        notes_options = [
            'Configured for optimal performance with monitoring enabled.',
            'Requires manual review and approval before deployment.',
            'Automated processing with fallback to manual mode.',
            'Integrated with external systems for real-time updates.',
            'Scheduled for maintenance during off-peak hours.',
            'Enhanced security features with audit trail logging.',
            'Optimized for high-throughput data processing.',
            'Configured with redundancy for business continuity.'
        ]
        
        batch_size = 1000  # Larger batches for bar since it's simpler
        total_batches = (record_count + batch_size - 1) // batch_size
        
        for batch_num in range(total_batches):
            start_idx = batch_num * batch_size
            end_idx = min(start_idx + batch_size, record_count)
            batch_records = end_idx - start_idx
            
            if batch_num % 2 == 0:
                progress = (batch_num / total_batches) * 100
                logger.info(f"📊 Processing bar batch {batch_num + 1}/{total_batches} ({progress:.1f}% complete)")
            
            # Build batch INSERT SQL
            batch_sql = "USE sqlCDC;\n"
            
            for i in range(batch_records):
                created_at = self.generate_random_timestamp()
                updated_at_dt = datetime.strptime(created_at, '%Y-%m-%d %H:%M:%S') + timedelta(
                    seconds=random.randint(0, int((datetime.now() - datetime.strptime(created_at, '%Y-%m-%d %H:%M:%S')).total_seconds()))
                )
                updated_at = updated_at_dt.strftime('%Y-%m-%d %H:%M:%S')
                
                foo_id = random.choice(foo_ids)
                value = random.randint(0, 999)
                label = random.choice(labels).replace("'", "''")
                notes = random.choice(notes_options).replace("'", "''")
                is_enabled = 1 if random.random() < 0.8 else 0
                
                batch_sql += f"""
INSERT INTO bar (foo_id, value, label, notes, is_enabled, created_at, updated_at)
VALUES ('{foo_id}', {value}, '{label}', '{notes}', {is_enabled}, '{created_at}', '{updated_at}');
"""
            
            batch_sql += "GO\n"
            
            if not self.execute_sql_file(batch_sql):
                logger.error(f"❌ Failed to insert bar batch {batch_num + 1}")
                return False
            
            # Small delay every 5 batches
            if batch_num % 5 == 0 and batch_num > 0:
                time.sleep(0.1)
        
        logger.info(f"✅ Successfully seeded {record_count:,} bar records")
        return True

    def verify_data(self) -> bool:
        """Verify data was inserted"""
        logger.info("🔍 Verifying data...")
        try:
            result = subprocess.run([
                'docker', 'exec', self.container_name,
                '/opt/mssql-tools18/bin/sqlcmd', '-S', 'localhost', '-U', 'sa', '-P', 'Password!',
                '-Q', 'USE sqlCDC; SELECT COUNT(*) as foo_count FROM foo; SELECT COUNT(*) as bar_count FROM bar;', '-N', '-C'
            ], capture_output=True, text=True, check=True)
            
            # Parse the counts from the output
            lines = result.stdout.strip().split('\n')
            counts = [line.strip() for line in lines if line.strip().isdigit()]
            if len(counts) >= 2:
                logger.info(f"✅ Verification: {counts[0]} foo records, {counts[1]} bar records")
            else:
                logger.info(f"✅ Verification output: {result.stdout.strip()}")
            return True
        except subprocess.CalledProcessError as e:
            logger.warning(f"⚠️  Could not verify data counts: {e}")
            return False

def main():
    parser = argparse.ArgumentParser(description='SQL Server Setup and Data Seeding Script')
    
    # Subcommands
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Setup command
    setup_parser = subparsers.add_parser('setup', help='Setup database schema and enable CDC')
    setup_parser.add_argument('--container-name', 
                       default='transactional-sqlserver-sqlserver-1',
                       help='SQL Server container name')
    setup_parser.add_argument('--clear-data', action='store_true', 
                       help='Clear existing tables before creating new ones')
    
    # Seed command
    seed_parser = subparsers.add_parser('seed', help='Seed data into existing tables')
    seed_parser.add_argument('--container-name', 
                       default='transactional-sqlserver-sqlserver-1',
                       help='SQL Server container name')
    seed_parser.add_argument('--foo-rows', type=int, default=10000, 
                       help='Number of foo records to create')
    seed_parser.add_argument('--bar-rows', type=int, default=5000, 
                       help='Number of bar records to create')
    seed_parser.add_argument('--clear-data', action='store_true', 
                       help='Clear existing data before seeding')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Initialize seeder
    seeder = SQLServerSeeder(args.container_name)
    
    # Check if container is running
    if not seeder.check_container_running():
        logger.error("❌ SQL Server container is not running. Please start it first:")
        logger.error("   cd ufa/services/transactional-sqlserver")
        logger.error("   docker compose up -d")
        sys.exit(1)
    
    # Test connection
    if not seeder.test_connection():
        logger.error("❌ Cannot connect to SQL Server")
        sys.exit(1)
    
    try:
        start_time = datetime.now()
        
        if args.command == 'setup':
            logger.info("🚀 Starting database setup...")
            logger.info(f"🐳 Container: {args.container_name}")
            logger.info(f"🧹 Clear data: {args.clear_data}")
            
            if not seeder.setup_database(args.clear_data):
                logger.error("❌ Failed to setup database schema")
                sys.exit(1)
                
            logger.info("🎉 Database setup completed successfully!")
            
        elif args.command == 'seed':
            logger.info("🚀 Starting data seeding...")
            logger.info(f"🐳 Container: {args.container_name}")
            logger.info(f"📊 Configuration: {args.foo_rows:,} foo records, {args.bar_rows:,} bar records")
            logger.info(f"🧹 Clear data: {args.clear_data}")
            
            # Seed foo data
            if not seeder.seed_foo_data(args.foo_rows, args.clear_data):
                logger.error("❌ Failed to seed foo data")
                sys.exit(1)
            
            # Seed bar data
            if not seeder.seed_bar_data(args.bar_rows, False):  # Don't clear bar when foo is already seeded
                logger.error("❌ Failed to seed bar data")
                sys.exit(1)
            
            # Verify data
            seeder.verify_data()
            
            end_time = datetime.now()
            duration = end_time - start_time
            total_records = args.foo_rows + args.bar_rows
            
            logger.info(f"🎉 Data seeding completed successfully!")
            logger.info(f"⏱️  Total time: {duration}")
            logger.info(f"📈 Total records: {total_records:,} ({total_records/duration.total_seconds():.0f} records/second)")
        
    except KeyboardInterrupt:
        logger.info("⚠️  Operation interrupted by user")
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
