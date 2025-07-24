# PostgreSQL Realtime Changes Test Implementation

This implementation provides a comprehensive test suite for listening to PostgreSQL changes on the `foo` and `bar` tables using Supabase's realtime functionality. It follows the official [Supabase documentation](https://supabase.com/docs/guides/realtime/postgres-changes) for setting up and using PostgreSQL changes.

## Features

- **Multiple listening strategies**: Listen to all changes, specific events, or filtered changes
- **Business logic integration**: Handle changes with custom business logic
- **Comprehensive logging**: Detailed event logging with timestamps
- **Graceful shutdown**: Clean resource management
- **Test operations**: Built-in test data generation
- **Row Level Security**: Proper authentication and authorization setup

## Prerequisites

1. Self-hosted Supabase instance running (via Docker)
2. PostgreSQL database with `foo` and `bar` tables
3. Environment variables properly configured
4. Node.js 20.x (due to Moose requirements)

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the `services/transactional-base` directory:

```bash
# Copy the example environment file
cp env.example .env
```

Generate JWT secrets and API keys:

```bash
# Generate secure JWT tokens
node generate-jwt.mjs
```

Update your `.env` file with the generated keys:

```env
# Critical environment variables for realtime
SUPABASE_PUBLIC_URL=http://localhost:8000
ANON_KEY=your-generated-anon-key
SERVICE_ROLE_KEY=your-generated-service-role-key
REALTIME_URL=ws://localhost:8000/realtime/v1
DB_SCHEMA=public
```

### 2. Database Setup

Start the database and services:

```bash
# Start all services
npm run db:start

# Wait for services to be ready
npm run db:status
```

Run the database migrations:

```bash
# Apply migrations
npm run db:migrate

# Optionally seed with test data
npm run db:seed
```

### 3. Enable Realtime for Tables

Execute the comprehensive realtime setup script:

```bash
# Run the setup script directly
docker exec -i supabase-db psql -U postgres -d postgres < src/scripts/setup-realtime.sql
```

This comprehensive script will:
- Enable Row Level Security (RLS) on all tables (foo, bar, foo_bar)
- Create anonymous access policies (required for sync-base service)
- Create authenticated user policies for all operations
- Set replica identity to FULL (to receive old record data)
- Create publication for realtime replication
- Set up automatic timestamp triggers
- Grant proper permissions to all roles
- Verify the complete setup

### 4. Verify Realtime Configuration

The setup script automatically verifies the configuration and displays the results. You should see output like:

```
🔍 Verifying comprehensive realtime setup...

         info         | schemaname | tablename | rls_status 
----------------------+------------+-----------+------------
 📋 RLS Status:       | public     | bar       | ✅ Enabled
 📋 RLS Status:       | public     | foo       | ✅ Enabled
 📋 RLS Status:       | public     | foo_bar   | ✅ Enabled

         info         | schemaname | tablename | replica_identity 
----------------------+------------+-----------+------------------
 🔄 Replica Identity: | public     | bar       | ✅ FULL
 🔄 Replica Identity: | public     | foo       | ✅ FULL
 🔄 Replica Identity: | public     | foo_bar   | ✅ FULL

          info          |      pubname      | schemaname | tablename 
------------------------+-------------------+------------+-----------
 📡 Publication Status: | supabase_realtime | public     | bar
 📡 Publication Status: | supabase_realtime | public     | foo
 📡 Publication Status: | supabase_realtime | public     | foo_bar

          info          | schemaname | tablename |            policyname             |      anon_access      
------------------------+------------+-----------+-----------------------------------+----------------------
 🔐 Anonymous Policies: | public     | bar       | Allow anonymous access to bar     | ✅ Anon access enabled
 🔐 Anonymous Policies: | public     | foo       | Allow anonymous access to foo     | ✅ Anon access enabled
 🔐 Anonymous Policies: | public     | foo_bar   | Allow anonymous access to foo_bar | ✅ Anon access enabled
```

If you need to manually verify the setup later:

```sql
-- Check publication tables
SELECT pubname, schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public';

-- Check anonymous policies
SELECT schemaname, tablename, policyname
FROM pg_policies 
WHERE schemaname = 'public' 
AND policyname LIKE '%anonymous%';
```

## Running the Test

### Basic Usage

```bash
# Run the realtime test
npm run test:realtime:dev

# Or with the compiled version
npm run build && npm run test:realtime
```

### With Test Data Generation

```bash
# Run with automatic test data insertion
npx tsx tests/test-realtime-postgres-changes.ts --test-insert
```

### Expected Output

When running successfully, you should see:

```
🚀 Starting PostgreSQL Changes Test for Foo and Bar Tables
============================================================
Setting up PostgreSQL changes listeners...
Configuration: {
  supabaseUrl: 'http://localhost:8000',
  realtimeUrl: 'ws://localhost:8000/realtime/v1',
  schema: 'public'
}
Foo table listener status: SUBSCRIBED
Bar table listener status: SUBSCRIBED
Foo specific events listener status: SUBSCRIBED
Bar specific events listener status: SUBSCRIBED
Foo active filter listener status: SUBSCRIBED
Bar high value filter listener status: SUBSCRIBED

✅ All listeners are now active!
Make changes to the foo and bar tables to see realtime updates...
```

## Testing the Functionality

### 1. Using the API Endpoints

Start the API server:

```bash
npm run dev
```

Test with curl commands:

```bash
# Create a foo record
curl -X POST http://localhost:3000/foo \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Foo",
    "description": "Test description",
    "status": "active",
    "priority": 1
  }'

# Update a foo record
curl -X PUT http://localhost:3000/foo/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Foo",
    "status": "inactive"
  }'

# Delete a foo record
curl -X DELETE http://localhost:3000/foo/{id}
```

### 2. Direct Database Operations

You can also test by directly modifying the database:

```sql
-- Insert a foo record
INSERT INTO foo (name, description, status, priority) 
VALUES ('Direct Insert', 'Inserted directly', 'active', 1);

-- Update a foo record
UPDATE foo SET status = 'inactive' WHERE name = 'Direct Insert';

-- Delete a foo record
DELETE FROM foo WHERE name = 'Direct Insert';
```

### 3. Expected Realtime Events

When you make changes, you should see output like:

```
[2024-01-01T12:00:00.000Z] INSERT event on foo table:
Payload: {
  "schema": "public",
  "table": "foo",
  "commit_timestamp": "2024-01-01T12:00:00.000Z",
  "eventType": "INSERT",
  "new": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Test Foo",
    "description": "Test description",
    "status": "active",
    "priority": 1,
    "isActive": true,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  },
  "old": {}
}
---
🆕 New foo record created: { id: '123e4567...', name: 'Test Foo', ... }
🔔 Business Logic: New foo "Test Foo" created
```

## Listener Types

The test implementation includes several types of listeners:

### 1. All Changes Listeners
- Listens to all INSERT, UPDATE, and DELETE events
- Separate listeners for `foo` and `bar` tables

### 2. Specific Event Listeners
- Separate listeners for INSERT, UPDATE, and DELETE events
- Includes old and new record data
- Provides detailed logging for each event type

### 3. Filtered Listeners
- **Active Foo Filter**: Only listens to foo records with `status = 'active'`
- **High Value Bar Filter**: Only listens to bar records with `value > 100`

### 4. Business Logic Handlers
- Custom logic that responds to specific changes
- Example: Status change notifications
- Example: Value threshold alerts

## Troubleshooting

### Common Issues

1. **Connection Failed**
   ```
   Error: Connection failed to ws://localhost:8000/realtime/v1
   ```
   - Check if Supabase services are running: `npm run db:status`
   - Verify REALTIME_URL in .env file
   - Ensure port 8000 is not blocked

2. **Authentication Error**
   ```
   Error: Invalid JWT token
   ```
   - Regenerate JWT tokens: `node generate-jwt.mjs`
   - Update ANON_KEY in .env file
   - Check JWT_SECRET configuration

3. **No Events Received**
   ```
   Listeners connected but no events received
   ```
   - Verify RLS policies are set correctly
   - Check if replica identity is set to FULL
   - Ensure publication includes the tables

4. **Permission Denied**
   ```
   Error: Permission denied for table foo
   ```
   - Run the setup-realtime.sql script
   - Check RLS policies
   - Verify user permissions

### Debug Mode

Enable debug logging by setting environment variables:

```bash
DEBUG=true npm run test:realtime:dev
```

### Checking Logs

View Supabase logs:

```bash
# View all logs
npm run db:logs

# View specific service logs
docker logs transactional-base-realtime-1
```

## Advanced Configuration

### Custom JWT Tokens

For advanced use cases, you can sign custom JWT tokens:

```javascript
// In your test file
const customToken = jwt.sign(
  { 
    sub: 'user-123',
    role: 'authenticated',
    // custom claims
  },
  process.env.JWT_SECRET
);

supabase.realtime.setAuth(customToken);
```

### Multiple Channels

You can create multiple channels for different purposes:

```javascript
// Separate channels for different business logic
const auditChannel = supabase.channel('audit-changes');
const notificationChannel = supabase.channel('notification-changes');
const analyticsChannel = supabase.channel('analytics-changes');
```

### Performance Considerations

- **Database Performance**: Each change event triggers authorization checks
- **Connection Limits**: Monitor WebSocket connections
- **Message Throughput**: Review the throughput estimates in the Supabase docs
- **Scaling**: Consider using separate "public" tables without RLS for high-volume scenarios

## Production Considerations

1. **Security**: Implement proper RLS policies for production
2. **Monitoring**: Set up monitoring for connection health
3. **Error Handling**: Implement retry logic for connection failures
4. **Resource Management**: Monitor memory usage and connection counts
5. **Backup Strategy**: Ensure realtime setup is included in backup procedures

## Related Documentation

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime/postgres-changes)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [WebSocket API Reference](https://supabase.com/docs/reference/javascript/subscribe)

## Support

For issues related to:
- **Supabase Realtime**: Check the official Supabase documentation and GitHub issues
- **This Implementation**: Review the code comments and this README
- **Database Issues**: Check PostgreSQL logs and configuration 