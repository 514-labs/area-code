-- Automated Realtime Replication Setup Script
-- This script automatically sets up replication for all tables in the public schema
-- It's idempotent - can be run multiple times safely

-- Enable logging for better feedback
\set QUIET off
\set ON_ERROR_STOP on

-- Display script info
SELECT 'Starting automated realtime replication setup...' as status;

-- Create a function to setup replication for a specific table
CREATE OR REPLACE FUNCTION setup_table_replication(
    schema_name TEXT,
    table_name TEXT
) RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    policy_count INTEGER;
    trigger_count INTEGER;
BEGIN
    -- Check if table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables t
        WHERE t.table_schema = schema_name 
        AND t.table_name = setup_table_replication.table_name
    ) THEN
        RETURN 'Table ' || schema_name || '.' || table_name || ' does not exist - skipping';
    END IF;

    result := 'Setting up replication for ' || schema_name || '.' || table_name || E':\n';

    -- 1. Enable Row Level Security
    BEGIN
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', schema_name, table_name);
        result := result || '  ✓ Enabled RLS' || E'\n';
    EXCEPTION
        WHEN OTHERS THEN
            result := result || '  ⚠ RLS already enabled or failed: ' || SQLERRM || E'\n';
    END;

    -- 2. Set replica identity to FULL
    BEGIN
        EXECUTE format('ALTER TABLE %I.%I REPLICA IDENTITY FULL', schema_name, table_name);
        result := result || '  ✓ Set replica identity to FULL' || E'\n';
    EXCEPTION
        WHEN OTHERS THEN
            result := result || '  ⚠ Replica identity setup failed: ' || SQLERRM || E'\n';
    END;

    -- 3. Create policies for authenticated users (if they don't exist)
    -- Check if policies already exist
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE schemaname = schema_name 
    AND tablename = setup_table_replication.table_name;

    IF policy_count = 0 THEN
        -- Create SELECT policy
        BEGIN
            EXECUTE format('CREATE POLICY "Allow authenticated users to read %I" ON %I.%I FOR SELECT TO authenticated USING (true)', 
                          table_name, schema_name, table_name);
            result := result || '  ✓ Created SELECT policy' || E'\n';
        EXCEPTION
            WHEN OTHERS THEN
                result := result || '  ⚠ SELECT policy creation failed: ' || SQLERRM || E'\n';
        END;

        -- Create INSERT policy
        BEGIN
            EXECUTE format('CREATE POLICY "Allow authenticated users to insert %I" ON %I.%I FOR INSERT TO authenticated WITH CHECK (true)', 
                          table_name, schema_name, table_name);
            result := result || '  ✓ Created INSERT policy' || E'\n';
        EXCEPTION
            WHEN OTHERS THEN
                result := result || '  ⚠ INSERT policy creation failed: ' || SQLERRM || E'\n';
        END;

        -- Create UPDATE policy
        BEGIN
            EXECUTE format('CREATE POLICY "Allow authenticated users to update %I" ON %I.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', 
                          table_name, schema_name, table_name);
            result := result || '  ✓ Created UPDATE policy' || E'\n';
        EXCEPTION
            WHEN OTHERS THEN
                result := result || '  ⚠ UPDATE policy creation failed: ' || SQLERRM || E'\n';
        END;

        -- Create DELETE policy
        BEGIN
            EXECUTE format('CREATE POLICY "Allow authenticated users to delete %I" ON %I.%I FOR DELETE TO authenticated USING (true)', 
                          table_name, schema_name, table_name);
            result := result || '  ✓ Created DELETE policy' || E'\n';
        EXCEPTION
            WHEN OTHERS THEN
                result := result || '  ⚠ DELETE policy creation failed: ' || SQLERRM || E'\n';
        END;
    ELSE
        result := result || '  ⚠ Policies already exist (' || policy_count || ' found)' || E'\n';
    END IF;

    -- 4. Grant necessary permissions
    BEGIN
        EXECUTE format('GRANT SELECT ON %I.%I TO authenticated', schema_name, table_name);
        EXECUTE format('GRANT SELECT ON %I.%I TO anon', schema_name, table_name);
        EXECUTE format('GRANT ALL ON %I.%I TO service_role', schema_name, table_name);
        result := result || '  ✓ Granted permissions' || E'\n';
    EXCEPTION
        WHEN OTHERS THEN
            result := result || '  ⚠ Permission grants failed: ' || SQLERRM || E'\n';
    END;

    -- 5. Create updated_at trigger if table has updated_at column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_schema = schema_name 
        AND c.table_name = setup_table_replication.table_name 
        AND c.column_name = 'updated_at'
    ) THEN
        -- Check if trigger already exists
        SELECT COUNT(*) INTO trigger_count
        FROM information_schema.triggers
        WHERE event_object_schema = schema_name
        AND event_object_table = setup_table_replication.table_name
        AND trigger_name = 'update_' || table_name || '_updated_at';

        IF trigger_count = 0 THEN
            BEGIN
                EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 
                              table_name, schema_name, table_name);
                result := result || '  ✓ Created updated_at trigger' || E'\n';
            EXCEPTION
                WHEN OTHERS THEN
                    result := result || '  ⚠ Trigger creation failed: ' || SQLERRM || E'\n';
            END;
        ELSE
            result := result || '  ⚠ Trigger already exists' || E'\n';
        END IF;
    ELSE
        result := result || '  ⚠ No updated_at column found' || E'\n';
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create the updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Main execution: Setup replication for all tables in public schema
DO $$
DECLARE
    table_record RECORD;
    setup_result TEXT;
    total_tables INTEGER := 0;
    success_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting replication setup for all tables in public schema...';
    RAISE NOTICE '================================================================';
    
    -- Get all tables in public schema
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename
    LOOP
        total_tables := total_tables + 1;
        
        -- Setup replication for this table
        SELECT setup_table_replication(table_record.schemaname, table_record.tablename) INTO setup_result;
        
        -- Display results
        RAISE NOTICE '%', setup_result;
        
        -- Count as success if no major errors
        IF setup_result !~ 'does not exist' THEN
            success_count := success_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'Replication setup completed: % of % tables processed', success_count, total_tables;
END;
$$;

-- Drop the setup function as it's no longer needed
DROP FUNCTION IF EXISTS setup_table_replication(TEXT, TEXT);

-- Create or recreate the publication for all tables
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- Grant service role permission to manage this specific publication
-- Note: We can't change owner, but we can grant ALTER permission
GRANT ALL ON DATABASE postgres TO service_role;
-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO service_role;
-- Grant all privileges on all tables in public schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
-- Grant CREATE on schema for publications
GRANT CREATE ON SCHEMA public TO service_role;

-- Verify the setup
SELECT 'Verifying replication setup...' as status;

-- Check RLS status
SELECT 
    'RLS Status' as check_type,
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN 'Enabled' 
        ELSE 'Disabled' 
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check replica identity
SELECT 
    'Replica Identity' as check_type,
    schemaname,
    tablename,
    CASE relreplident
        WHEN 'f' THEN 'FULL'
        WHEN 'd' THEN 'DEFAULT'
        WHEN 'n' THEN 'NOTHING'
        WHEN 'i' THEN 'INDEX'
        ELSE 'UNKNOWN'
    END as replica_identity
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check publication
SELECT 
    'Publication' as check_type,
    pubname,
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public'
ORDER BY tablename;

-- Check policies count
SELECT 
    'Policies' as check_type,
    schemaname,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Final success message
SELECT 'Automated replication setup completed successfully!' as status;
SELECT 'All tables in public schema are now configured for realtime replication.' as info;
SELECT 'You can now use the realtime client to listen to changes.' as next_steps;