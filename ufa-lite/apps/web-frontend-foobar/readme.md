# Application Frontend

A React dashboard application for managing and visualizing Foo and Bar entities with both transactional and analytical data views.

## Available Scripts

```bash
# Development
pnpm dev        # Start development server with Vite
pnpm ufa:dev    # Alias for dev script used in monorepo context

# Production
pnpm build      # Build for production (TypeScript + Vite build)
pnpm preview    # Preview production build locally

# Code quality
pnpm lint       # Run ESLint on TypeScript source files
```

## Environment

Create a `.env.development` file in this folder with:

```
VITE_TRANSACTIONAL_API_BASE=http://localhost:8082/api
VITE_ANALYTICAL_CONSUMPTION_API_BASE=http://localhost:4100/consumption
VITE_RETRIEVAL_API_BASE=http://localhost:8083
```
