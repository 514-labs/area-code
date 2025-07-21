# Automated Realtime Replication Setup

This directory contains automated scripts to easily set up PostgreSQL realtime replication for all tables in your schema. The scripts are idempotent and can be run multiple times safely.

## 🚀 Quick Start

### 1. Setup Replication for All Tables
```bash
pnpm run setup:replication
```

This command automatically:
- ✅ Enables Row Level Security (RLS) on all tables
- ✅ Sets replica identity to FULL (for old record data)
- ✅ Creates access policies for authenticated users
- ✅ Grants necessary permissions
- ✅ Creates updated_at triggers (if column exists)
- ✅ Configures publication for realtime
- ✅ Verifies the setup

### 2. Check Current Status
```bash
pnpm run setup:replication:status
```

This shows the current replication configuration for all tables.

## 📋 Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **Setup** | `pnpm run setup:replication` | Automatically configure replication for all tables |
| **Status** | `pnpm run setup:replication:status` | Check current replication status |
| **Test** | `pnpm run test:postgres-changes:dev` | Run realtime changes test |
| **Help** | `npx tsx src/scripts/setup-replication.ts --help` | Show detailed help |

## 🔧 How It Works

### Automated Discovery
The setup script automatically:
1. **Discovers all tables** in the `public` schema
2. **Analyzes each table** for columns like `updated_at`
3. **Applies configuration** based on table structure
4. **Verifies setup** and reports results

### For Each Table, It Sets Up:

#### 1. Row Level Security (RLS)
```sql
ALTER TABLE "table_name" ENABLE ROW LEVEL SECURITY;
```

#### 2. Access Policies
```sql
-- Read access for authenticated users
CREATE POLICY "Allow authenticated users to read table_name" 
ON "table_name" FOR SELECT TO authenticated USING (true);

-- Write access for authenticated users  
CREATE POLICY "Allow authenticated users to insert table_name"
ON "table_name" FOR INSERT TO authenticated WITH CHECK (true);

-- Update access for authenticated users
CREATE POLICY "Allow authenticated users to update table_name"
ON "table_name" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Delete access for authenticated users
CREATE POLICY "Allow authenticated users to delete table_name"
ON "table_name" FOR DELETE TO authenticated USING (true);
```

#### 3. Replica Identity
```sql
ALTER TABLE "table_name" REPLICA IDENTITY FULL;
```

#### 4. Permissions
```sql
GRANT SELECT ON "table_name" TO authenticated;
GRANT SELECT ON "table_name" TO anon;
GRANT ALL ON "table_name" TO service_role;
```

#### 5. Automatic Timestamps (if applicable)
```sql
-- For tables with updated_at columns
CREATE TRIGGER update_table_name_updated_at 
BEFORE UPDATE ON "table_name" 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 6. Publication
```sql
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
```

## 📊 Example Output

### Setup Output
```
🚀 Setting up automated realtime replication for all tables...
============================================================
📄 SQL Script: /path/to/setup-realtime-replication.sql
🔗 Database: db:5432/postgres
🐳 Container: supabase-db
✅ SQL script file found
✅ Database container is running: Up 4 hours (healthy)

🔄 Executing replication setup script...
------------------------------------------------------------

Setting up replication for public.foo:
  ✓ Enabled RLS
  ✓ Set replica identity to FULL
  ✓ Created SELECT policy
  ✓ Created INSERT policy
  ✓ Created UPDATE policy
  ✓ Created DELETE policy
  ✓ Granted permissions
  ✓ Created updated_at trigger

Setting up replication for public.bar:
  ✓ Enabled RLS
  ✓ Set replica identity to FULL
  ✓ Created SELECT policy
  ✓ Created INSERT policy
  ✓ Created UPDATE policy
  ✓ Created DELETE policy
  ✓ Granted permissions
  ✓ Created updated_at trigger

✅ Replication setup completed successfully!
✅ 3 tables configured for realtime replication

🎯 Next Steps:
1. Run the realtime test: pnpm run test:postgres-changes:dev
2. Start your API server: pnpm run dev
3. Make changes to your tables to see realtime events
```

### Status Output
```
🔍 Checking current replication status...
==================================================

📊 Tables in public schema:
 schemaname | tablename 
------------+-----------
 public     | bar
 public     | foo
 public     | foo_bar

📊 RLS Status:
 schemaname | tablename | rls_status 
------------+-----------+------------
 public     | bar       | Enabled
 public     | foo       | Enabled
 public     | foo_bar   | Enabled

📊 Publication Tables:
      pubname      | schemaname | tablename 
-------------------+------------+-----------
 supabase_realtime | public     | bar
 supabase_realtime | public     | foo
 supabase_realtime | public     | foo_bar

📊 Policy Count:
 schemaname | tablename | policy_count 
------------+-----------+--------------
 public     | bar       |            4
 public     | foo       |            4
 public     | foo_bar   |            4
```

## 🔍 Verification

After running the setup, you can verify everything is working by:

### 1. Running the Test
```bash
pnpm run test:postgres-changes:dev
```

### 2. Making API Changes
```bash
# Start the API server
pnpm run dev

# In another terminal, create a record
curl -X POST http://localhost:8082/api/foo \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "status": "active", "priority": 1}'
```

### 3. Expected Realtime Events
You should see output like:
```
🎉 REALTIME EVENT RECEIVED!
Event Type: INSERT
Table: foo
Timestamp: 2024-01-01T12:00:00.000Z
✅ NEW RECORD: { id: '123...', name: 'Test', status: 'active' }
```

## 🛠 Troubleshooting

### Common Issues

#### 1. Container Not Running
```
❌ Database container is not running. Please start it with: pnpm run db:start
```
**Solution:** Start the database services:
```bash
pnpm run db:start
pnpm run db:status  # Verify they're running
```

#### 2. SQL Script Errors
```
❌ Error executing SQL script:
ERROR: relation "table_name" does not exist
```
**Solution:** Make sure your database migrations have been run:
```bash
pnpm run db:migrate
```

#### 3. Permission Denied
```
❌ Error: permission denied for table "foo"
```
**Solution:** Check that you're using the correct database user and that the user has sufficient privileges.

#### 4. No Events Received
```
Listeners connected but no events received
```
**Solution:** 
- Verify RLS policies with: `pnpm run setup:replication:status`
- Check that replica identity is set to FULL
- Ensure publication includes your tables

### Debug Mode

For more verbose output, you can run the SQL script directly:
```bash
docker exec -i supabase-db psql -U postgres -d postgres < src/scripts/setup-realtime-replication.sql
```

## 🔄 Idempotent Operations

The scripts are designed to be **idempotent** - you can run them multiple times safely:

- ✅ **Existing RLS**: Won't fail if already enabled
- ✅ **Existing Policies**: Will detect and skip existing policies
- ✅ **Existing Triggers**: Won't create duplicates
- ✅ **Existing Publication**: Will recreate cleanly

This means you can:
- Re-run setup after adding new tables
- Fix partial configurations
- Update permissions safely
- Recover from interrupted setups

## 📈 Performance Considerations

### Database Impact
- **RLS Checks**: Each realtime event triggers authorization checks
- **Replica Identity FULL**: Increases WAL size but provides complete old record data
- **Policy Complexity**: Keep policies simple for better performance

### Scaling Recommendations
- Monitor connection counts and message throughput
- Consider using separate "public" tables without RLS for high-volume scenarios
- Use filtered listeners to reduce client-side processing
- Review [Supabase performance guidelines](https://supabase.com/docs/guides/realtime/postgres-changes#limitations)

## 🔗 Related Documentation

- [PostgreSQL Realtime Changes Test Implementation](./REALTIME_SETUP.md)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime/postgres-changes)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Database Schema Documentation](./src/database/schema.ts)

## 🎯 Next Steps

1. **Run the Setup**: `pnpm run setup:replication`
2. **Verify Status**: `pnpm run setup:replication:status`
3. **Test Realtime**: `pnpm run test:postgres-changes:dev`
4. **Start Building**: Integrate realtime events into your application logic

The automation takes care of all the complex setup details, so you can focus on building your realtime features! 