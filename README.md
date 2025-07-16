<img width="1076" alt="Hero 25" src="https://github.com/user-attachments/assets/98b7fe13-df60-4a56-bf01-f84d0f5beca2" />

# Starter Application

Area Code is a starter repo with all the necessary building blocks for a production ready repository that can be used to build multi-modal applications.

It's built on top of Turborepo. The monorepo contains the following capabilities:

## Getting Started

The project includes an automated setup script that configures all services automatically. No manual configuration is required.

### Quick Start

Follow these commands in order to set up and run the application:

```bash
# 1. Install dependencies
pnpm i

# 2. Setup all services (initializes configuration and data)
pnpm dev:setup

# 3. Start all services
pnpm dev:start

# 4. Seed databases with sample data
pnpm dev:seed

# 5. Run development workflow
pnpm dev:workflow
```

Additional useful commands:

```bash
# Check status of all services
pnpm dev:status

# Stop all services
pnpm dev:shutdown

# Reset all services (stop, clear data, restart)
pnpm dev:reset
```

### Available Commands

- `pnpm dev:setup` - Install dependencies and initialize all services
- `pnpm dev:start` - Start all services
- `pnpm dev:shutdown` - Stop all services
- `pnpm dev:status` - Show status of all services
- `pnpm dev:reset` - Reset all services (stop, clear data, restart)
- `pnpm dev:seed` - Seed databases with sample data
- `pnpm dev:workflow` - Run development workflow

### Targeting Specific Services

You can target individual services using the `--service` flag:

```bash
# Start only the transactional service
pnpm dev:start --service=transactional-base

# Setup only the retrieval service
pnpm dev:setup --service=retrieval-base

# Check status of analytical service
pnpm dev:status --service=analytical-base
```

### Available Services

- `transactional-base` - Transactional functionality (payments, orders, etc.)
- `retrieval-base` - Retrieval functionality (search, recommendations, etc.)
- `analytical-base` - Analytical functionality (analytics, reporting, dashboards, etc.)
- `sync-base` - Synchronization functionality
- `data-warehouse` - Data warehouse functionality

The setup script automatically handles all configuration, dependency installation, and service initialization. No user actions are required beyond running the commands.

## Apps

- `web`: a Vite app that serves the frontend

## Services

API centric services that power functionality for your applications

- `analytical-service`: Analytical service that powers the analytical functionality for your applications (e.g. analytics, reporting, dashboards, newsfeeds, etc.)
- `retrieval-service`: Retrieval service that powers the retrieval functionality for your applications (e.g. search, recommendations, etc.)
- `transaction-service`: Transaction service that powers the transactional functionality for your applications (e.g. payments, orders, etc.)
- `messaging-service`: Messaging service that powers the messaging functionality for your applications (e.g. chat, notifications, etc.)
- `ai-service`: AI service that powers the AI functionality for your applications (e.g. chat, voice, etc.)

## Packages

- `<library-name>-config`: configuration implementations for specific libraries
- `ui`: a library of shared web UI components

## Future plans

We plan on enabling a user to compose their own application with a subset of the services and packages. We plan on leveraging the `generate` tool provided by turborepo to generate the application code. We also plan on enabling python and other languages based services to be added to the repository.

- Add a `mobile` app that serves the mobile frontend
- Add a `desktop` app that serves the desktop frontend
- Add a `cli` app that serves the command line interface
- Add a `docs` app that serves the documentation
- Add a `blog` app that serves the blog
- Add a `worker` service that enables background processing for the application
- Add a `tests` package that contains shared tests for the repository
- Add a `types` package that contains shared types for the repository
- Add a `utils` package that contains shared utilities for the repository
