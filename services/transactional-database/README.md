# Transactional Database - Self-Hosted Supabase

> WE CURRENTLY CAN'T CONFIGURE THIS DB ON ANYTHING OTHER THAN 5432 or else migrations will fail. Need to investigate

A complete self-hosted Supabase database infrastructure for transactional workloads with Docker Compose. This service provides the database infrastructure that the `transactional-base` application service connects to.

## 🏗️ Hybrid Development Approach

This service supports **two deployment modes**:

### 🚀 **CLI Mode (Recommended for Local Development)**

- **Lightweight**: ~200MB RAM, starts in 10-15 seconds
- **Standard tooling**: Built-in Supabase CLI commands
- **Hot reload**: Instant restarts and resets
- **Automatic**: No manual secret generation needed

### 🏭 **Production Mode (For Staging/Production)**

- **Full control**: Custom Docker images, advanced pooling
- **Supavisor**: Tenant-based connection pooling
- **Custom realtime**: Advanced replication setup
- **Production-grade**: Manual secret management

## Quick Start

### For Local Development (CLI Mode)

```bash
# Start Supabase CLI services (lightweight)
pnpm dev:start

# In another terminal - start the API
cd ../transactional-base
pnpm dev:cli

# Stop when done
cd ../transactional-database
pnpm dev:stop
```

### For Production/Staging

```bash
# Copy environment template and generate secrets
cd prod
cp env.example .env
node generate-jwt.mjs

# Start production services
pnpm prod:start
```

## Architecture

This service provides:

- **PostgreSQL database** with Supavisor connection pooling
- **Supabase Auth** for user authentication
- **Supabase Storage** for file uploads
- **Supabase Realtime** for real-time subscriptions
- **Supabase Studio** for database management
- **Edge Functions** runtime

## Directory Structure

```
transactional-database/
├── prod/                    # Production deployment files
│   ├── docker-compose.yml   # Main Docker Compose configuration
│   ├── docker-compose.s3.yml # S3 storage variant
│   ├── setup.sh            # Database setup and management script
│   ├── generate-jwt.mjs     # JWT secret generation for production
│   ├── env.example          # Environment configuration template
│   ├── volumes/             # Docker volumes for data persistence
│   └── dev/                 # Development Docker overrides
├── supabase/                # Supabase CLI configuration
│   └── config.toml          # Local development settings
├── scripts/                 # Database management scripts
├── tests/                   # Database infrastructure tests
├── package.json             # Development and management scripts
└── README.md               # This file
```

## Available Scripts

### CLI Development Mode

- `pnpm dev:start` - Start Supabase CLI services
- `pnpm dev:stop` - Stop CLI services
- `pnpm dev:restart` - Restart CLI services
- `pnpm dev:reset` - Reset CLI database
- `pnpm dev:status` - Show CLI service status
- `pnpm dev:logs` - View CLI service logs
- `pnpm dev:studio` - Open Supabase Studio

### Production Mode

- `pnpm prod:start` - Start production Docker services
- `pnpm prod:stop` - Stop production services
- `pnpm prod:restart` - Restart production services
- `pnpm prod:reset` - Reset production database
- `pnpm prod:status` - Show production service status
- `pnpm prod:logs` - View production service logs

### Testing & Management

- `pnpm test:realtime` - Test realtime functionality
- `pnpm setup:replication` - Configure database replication

## Contents

1. [Before you begin](#before-you-begin)
2. [Installing and running Supabase](#installing-and-running-supabase)
3. [Accessing your services](#accessing-your-services)
4. [Securing your services](#securing-your-services)
5. [Testing Realtime functionality](#testing-realtime-functionality)
6. [Configuration](#configuration)
7. [Troubleshooting](#troubleshooting)

## Before you begin

You need the following installed in your system:

- **Git** and **Docker** (Windows, macOS, or Linux)
- **Node.js** (for JWT generation script)

### Rootless Docker Configuration

If you are using rootless Docker, you'll need to configure the Docker socket location:

1. Check if you're using rootless Docker:

   ```bash
   docker info | grep -i root
   ```

2. If you see `rootless: true`, edit your `prod/.env` file and set:
   ```bash
   DOCKER_SOCKET_LOCATION=/run/user/1000/docker.sock
   ```
   (Replace `1000` with your user ID if different)

## Installing and running Supabase

Follow these steps to start Supabase:

```bash
# Navigate to the service directory
cd services/transactional-database

# Run setup (production deployment)
cd prod && sh setup.sh

# OR use npm scripts for convenience
pnpm start
```

## Accessing your services

### Supabase Studio (Dashboard)

Access Supabase Studio through: `http://localhost:8000`

Default credentials:

- **Username**: `supabase`
- **Password**: `this_password_is_insecure_and_should_be_updated`

⚠️ **Change these credentials immediately** using the instructions in the [Securing your services](#securing-your-services) section.

### APIs

All APIs are available through the same gateway:

- **REST API**: `http://localhost:8000/rest/v1/`
- **Auth API**: `http://localhost:8000/auth/v1/`
- **Storage API**: `http://localhost:8000/storage/v1/`
- **Realtime API**: `http://localhost:8000/realtime/v1/`

### Edge Functions

Edge Functions are stored in `volumes/functions`. The default setup includes a `hello` function:

- **Invoke**: `http://localhost:8000/functions/v1/hello`
- **Add new functions**: Create `volumes/functions/<FUNCTION_NAME>/index.ts`
- **Restart functions service**: `docker compose restart functions --no-deps`

### Database Access

#### Via Supavisor (Connection Pooler) - Recommended

**Session-based connections** (equivalent to direct Postgres):

```bash
psql 'postgres://postgres.your-tenant-id:your-super-secret-and-long-postgres-password@localhost:5432/postgres'
```

**Pooled transactional connections**:

```bash
psql 'postgres://postgres.your-tenant-id:your-super-secret-and-long-postgres-password@localhost:6543/postgres'
```

#### Direct Postgres Connection

For ORMs or direct connections:

```bash
postgres://postgres:[POSTGRES_PASSWORD]@localhost:5432/[POSTGRES_DB]
```

## Securing your services

⚠️ **CRITICAL**: Never deploy with default credentials. Follow all steps below.

If .env.secrets is missing, setup.sh will create it for you.

### 1. Generate JWT Secret and API Keys

Run the JWT generation script from the prod directory:

```bash
cd prod
node generate-jwt.mjs
```

This will:

1. Generate a secure 40-character JWT secret
2. Create `anon` and `service_role` API keys
3. Output the values to copy into your `prod/.env` file

### 2. Update Environment Variables

Edit your `prod/.env` file with your generated values and update these required fields:

```bash
# JWT Configuration
JWT_SECRET=your-generated-jwt-secret
ANON_KEY=your-generated-anon-key
SERVICE_ROLE_KEY=your-generated-service-key

# Database
POSTGRES_PASSWORD=your-secure-database-password

# Dashboard Authentication
DASHBOARD_USERNAME=your-dashboard-username
DASHBOARD_PASSWORD=your-secure-dashboard-password

# Site Configuration
SITE_URL=http://localhost:8000
API_EXTERNAL_URL=http://localhost:8000

# Email Configuration (Required for auth)
SMTP_ADMIN_EMAIL=admin@yourdomain.com
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_SENDER_NAME=Your App Name

# Pooler Configuration
POOLER_TENANT_ID=your-tenant-id
```

### 3. Restart Services

Apply configuration changes:

```bash
cd prod && sh setup.sh --restart

# OR use npm script
pnpm restart
```

## Testing Realtime functionality

This service includes a comprehensive test script for the Supabase Realtime functionality using the [@supabase/realtime-js](https://github.com/supabase/realtime-js) package.

### Setup Test Environment

1. **Install dependencies**:

   ```bash
   cd services/transactional-base
   pnpm install
   ```

2. **Set up test table** (choose one method):

   **Option A: Using Docker (if you don't have psql installed):**

   ```bash
   # Copy the setup script to the database container
   docker cp services/transactional-base/src/setup-test-table.sql supabase-db:/tmp/setup-test-table.sql

   # Run the setup script
   docker exec -it supabase-db psql -U postgres -d postgres -f /tmp/setup-test-table.sql
   ```

   **Option B: Using psql (if you have PostgreSQL client installed):**

   ```bash
   # Connect to your database and run the script
   psql 'postgres://postgres:your-password@localhost:5432/postgres' -f src/setup-test-table.sql
   ```

   **Option C: Using Supabase Studio (Web Interface):**
   1. Go to `http://localhost:8000`
   2. Login with your dashboard credentials
   3. Navigate to "SQL Editor"
   4. Copy and paste the contents of `src/setup-test-table.sql`
   5. Click "Run"

3. **Configure environment variables** in your `.env` file:
   ```bash
   # Realtime Test Configuration
   REALTIME_URL=ws://localhost:8000/realtime/v1
   ANON_KEY=your-generated-anon-key
   DB_SCHEMA=public
   TEST_TABLE=test_table
   USER_ID=test-user-123
   ```

### Running the Realtime Test

**Development mode** (with TypeScript):

```bash
pnpm test:realtime:dev
```

**Production mode** (compiled JavaScript):

```bash
pnpm build
pnpm test:realtime
```

### What the Test Does

The test script demonstrates all major Realtime features:

1. **Database Changes Subscription**: Listens for INSERT, UPDATE, and DELETE events on the test table
2. **Broadcast Messages**: Sends and receives custom messages between clients
3. **Presence Tracking**: Tracks online users and their status

### Testing Database Changes

While the test script is running, try these SQL commands in another terminal:

```sql
-- Insert a new record
INSERT INTO test_table (name, description) VALUES ('Live Test', 'Testing realtime updates');

-- Update an existing record
UPDATE test_table SET name = 'Updated Live Test' WHERE name = 'Live Test';

-- Delete a record
DELETE FROM test_table WHERE name = 'Updated Live Test';
```

You should see real-time updates in the test script console.

### Expected Output

```
🚀 Initializing Realtime Test Script
📡 Realtime URL: ws://localhost:8000/realtime/v1
🔑 Using API Key: eyJhbGciOiJIUzI1NiIs...
📊 Schema: public
📋 Table: test_table
👤 User ID: test-user-123

🔌 Connecting to Realtime server...
✅ Connected to Realtime server

🧪 Starting Realtime tests...

🔄 Test 1: Database Changes Subscription
✅ Successfully subscribed to database changes
📋 Listening for changes on public.test_table
💡 Try running SQL commands like:
   INSERT INTO test_table (name) VALUES ('test');
   UPDATE test_table SET name = 'updated' WHERE id = 1;
   DELETE FROM test_table WHERE id = 1;
✅ Database changes test setup complete

📢 Test 2: Broadcast Messages
✅ Broadcast message sent successfully
✅ Broadcast test complete

👥 Test 3: Presence Tracking
✅ Presence tracking started
✅ Presence test complete

✅ All tests completed successfully!
🔍 Monitor your database and check the console for real-time updates.
💡 Try making changes to the database to see live updates.

📝 To stop the test, press Ctrl+C
```

## Configuration

### Email Server Configuration

For production email sending, configure SMTP settings in your `.env` file:

```bash
SMTP_ADMIN_EMAIL=admin@yourdomain.com
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_SENDER_NAME=Your Application
```

We recommend AWS SES for reliable, cost-effective email delivery.

### S3 Storage Configuration

To use S3 instead of local file storage, update the storage service environment:

```bash
# In docker-compose.yml under storage service
STORAGE_BACKEND=s3
GLOBAL_S3_BUCKET=your-s3-bucket-name
REGION=your-s3-region
```

### AI Assistant Configuration

Enable the Supabase AI Assistant by adding your OpenAI API key:

```bash
OPENAI_API_KEY=your-openai-api-key
```

## Troubleshooting

### Vector Service Issues

If you see "Configuration error. error=Is a directory (os error 21)":

1. Ensure `./volumes/logs/vector.yml` is a file, not a directory:

   ```bash
   ls -l ./volumes/logs/vector.yml
   ```

2. If it's a directory, remove it and create a proper config file:

   ```bash
   rm -rf ./volumes/logs/vector.yml
   touch ./volumes/logs/vector.yml
   ```

3. Add minimal Vector configuration:
   ```yaml
   data_dir: /vector-data-dir
   sources:
     demo:
       type: stdin
   sinks:
     demo_out:
       type: console
       inputs: [demo]
   ```

### Service Health Checks

Check service status:

```bash
docker compose ps
docker compose logs <service-name>
```

### Database Connection Issues

Verify database is accessible:

```bash
docker exec -it supabase-db pg_isready -U postgres
```

### Port Conflicts

If ports are already in use, update your `.env` file:

```bash
KONG_HTTP_PORT=8001  # Change from 8000
KONG_HTTPS_PORT=8444 # Change from 8443
```

## Updating Services

Update service versions by:

1. Checking the latest versions in [Supabase Docker Hub](https://hub.docker.com/u/supabase)
2. Updating the image tags in `docker-compose.yml`
3. Pulling new images and restarting:
   ```bash
   docker compose pull
   docker compose up -d
   ```

## Stopping and Cleanup

**Stop services**:

```bash
docker compose stop
```

**Stop and remove containers**:

```bash
docker compose down
```

**Complete cleanup (⚠️ destroys all data)**:

```bash
docker compose down -v
rm -rf volumes/db/data/
```

## Production Considerations

- Use a secrets manager (AWS Secrets Manager, Azure Key Vault, etc.) instead of `.env` files in production
- Set up proper SSL/TLS certificates
- Configure firewall rules
- Regular backups of the database
- Monitor service health and logs
- Update services regularly for security patches
