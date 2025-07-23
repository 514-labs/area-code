-- Comprehensive setup script for enabling PostgreSQL realtime changes
-- This script follows the Supabase documentation for setting up realtime
-- Includes support for foo, bar, and foo_bar tables with anonymous access for sync-base service
-- Run this script after setting up your database tables

-- Enable Row Level Security for all tables
ALTER TABLE "foo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "foo_bar" ENABLE ROW LEVEL SECURITY;

-- Create policies for foo table
-- Allow authenticated users to read all foo records
CREATE POLICY "Allow authenticated users to read foo"
ON "foo"
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert foo records
CREATE POLICY "Allow authenticated users to insert foo"
ON "foo"
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update foo records
CREATE POLICY "Allow authenticated users to update foo"
ON "foo"
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete foo records
CREATE POLICY "Allow authenticated users to delete foo"
ON "foo"
FOR DELETE
TO authenticated
USING (true);

-- Create policies for bar table
-- Allow authenticated users to read all bar records
CREATE POLICY "Allow authenticated users to read bar"
ON "bar"
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert bar records
CREATE POLICY "Allow authenticated users to insert bar"
ON "bar"
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update bar records
CREATE POLICY "Allow authenticated users to update bar"
ON "bar"
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete bar records
CREATE POLICY "Allow authenticated users to delete bar"
ON "bar"
FOR DELETE
TO authenticated
USING (true);

-- Create policies for foo_bar junction table
-- Allow authenticated users to read all foo_bar records
CREATE POLICY "Allow authenticated users to read foo_bar"
ON "foo_bar"
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert foo_bar records
CREATE POLICY "Allow authenticated users to insert foo_bar"
ON "foo_bar"
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update foo_bar records
CREATE POLICY "Allow authenticated users to update foo_bar"
ON "foo_bar"
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete foo_bar records
CREATE POLICY "Allow authenticated users to delete foo_bar"
ON "foo_bar"
FOR DELETE
TO authenticated
USING (true);

-- Anonymous access policies for sync-base service
-- These policies are required for the sync-base service to receive realtime events
CREATE POLICY "Allow anonymous access to foo"
ON "foo"
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anonymous access to bar"
ON "bar"
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anonymous access to foo_bar"
ON "foo_bar"
FOR SELECT
TO anon
USING (true);

-- Set replica identity to full for all tables to receive old record data
-- This is needed to get the old record values in UPDATE and DELETE events
ALTER TABLE "foo" REPLICA IDENTITY FULL;
ALTER TABLE "bar" REPLICA IDENTITY FULL;
ALTER TABLE "foo_bar" REPLICA IDENTITY FULL;

-- Grant necessary permissions for realtime
-- These grants allow the realtime system to access the tables
GRANT SELECT ON "foo" TO authenticated;
GRANT SELECT ON "bar" TO authenticated;
GRANT SELECT ON "foo_bar" TO authenticated;

-- Grant permissions for anonymous access (required for sync-base service)
GRANT SELECT ON "foo" TO anon;
GRANT SELECT ON "bar" TO anon;
GRANT SELECT ON "foo_bar" TO anon;

-- Grant service_role access for testing and administration
GRANT ALL ON "foo" TO service_role;
GRANT ALL ON "bar" TO service_role;
GRANT ALL ON "foo_bar" TO service_role;

-- Additional grants for any custom roles you might have
-- GRANT SELECT ON "foo" TO your_custom_role;
-- GRANT SELECT ON "bar" TO your_custom_role;

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at timestamps
CREATE TRIGGER update_foo_updated_at
    BEFORE UPDATE ON "foo"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bar_updated_at
    BEFORE UPDATE ON "bar"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Note: foo_bar table doesn't have updated_at column, so no trigger needed

-- Create a publication for realtime (if using self-hosted Supabase)
-- This is needed for the realtime server to know which tables to replicate
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- Alternative: Create publication for specific tables only
-- DROP PUBLICATION IF EXISTS supabase_realtime;
-- CREATE PUBLICATION supabase_realtime FOR TABLE "foo", "bar", "foo_bar";

-- Verify the setup
\echo '🔍 Verifying comprehensive realtime setup...'

-- Check RLS status (note: using rowsecurity column which exists in all PostgreSQL versions)
SELECT 
    '📋 RLS Status:' as info,
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ Enabled' 
        ELSE '❌ Disabled' 
    END as rls_status
FROM pg_tables 
WHERE tablename IN ('foo', 'bar', 'foo_bar')
ORDER BY tablename;

-- Check replica identity
SELECT 
    '🔄 Replica Identity:' as info,
    schemaname,
    tablename,
    CASE relreplident
        WHEN 'f' THEN '✅ FULL'
        WHEN 'd' THEN '⚠️ DEFAULT'
        WHEN 'n' THEN '❌ NOTHING'
        WHEN 'i' THEN '🔍 INDEX'
        ELSE '❓ UNKNOWN'
    END as replica_identity
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public' AND tablename IN ('foo', 'bar', 'foo_bar')
ORDER BY tablename;

-- Check publication
SELECT 
    '📡 Publication Status:' as info,
    pubname,
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public' 
AND tablename IN ('foo', 'bar', 'foo_bar')
ORDER BY tablename;

-- Check anonymous access policies
SELECT 
    '🔐 Anonymous Policies:' as info,
    schemaname,
    tablename,
    policyname,
    CASE 
        WHEN roles @> '{anon}' THEN '✅ Anon access enabled'
        ELSE '❌ No anon access'
    END as anon_access
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('foo', 'bar', 'foo_bar')
AND policyname LIKE '%anonymous%'
ORDER BY tablename;

-- Success message
\echo '✅ Comprehensive realtime setup completed successfully!'
\echo ''
\echo '📊 Summary of changes:'
\echo '  ✅ Row Level Security enabled for all tables (foo, bar, foo_bar)'
\echo '  ✅ Anonymous access policies created for sync-base service'
\echo '  ✅ Authenticated user policies created for all operations'
\echo '  ✅ Replica identity set to FULL for complete event data'
\echo '  ✅ Publication configured for realtime replication'
\echo '  ✅ Updated timestamp triggers (foo, bar tables)'
\echo '  ✅ Proper permissions granted to all roles'
\echo ''
\echo '🎯 Next steps:'
\echo '  1. Start your sync-base service: cd services/sync-base && moose dev'
\echo '  2. Test by making changes to the database'
\echo '  3. Monitor the sync-base logs for realtime events'
\echo '  4. Use the API endpoints to trigger database changes'
\echo ''
\echo '💡 The setup now supports:'
\echo '  - Anonymous access (for sync-base service)'
\echo '  - Authenticated access (for API operations)'
\echo '  - All three tables: foo, bar, foo_bar'
\echo '  - Full event data including old/new records' 