# syntax = docker/dockerfile:1

ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Node.js"

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Build stage
FROM base as build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential pkg-config python-is-python3

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files from monorepo root (context is root)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy workspace packages that this service depends on
COPY ufa/packages/ ./ufa/packages/

# Copy this service
COPY ufa/services/transactional-supabase-foobar/ ./ufa/services/transactional-supabase-foobar/

# Install all dependencies (including workspace deps)
RUN pnpm install --frozen-lockfile

# Build the TypeScript
WORKDIR /app/ufa/services/transactional-supabase-foobar
RUN pnpm run build

# Production stage
FROM base

# Install pnpm for production
RUN npm install -g pnpm

# Copy workspace configuration for production dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy workspace packages that this service depends on (for production)
COPY ufa/packages/ ./ufa/packages/

# Copy service package.json
COPY ufa/services/transactional-supabase-foobar/package.json ./ufa/services/transactional-supabase-foobar/

# Install only production dependencies (with workspace context)
RUN pnpm install --frozen-lockfile --prod

# Copy built application from build stage
COPY --from=build /app/ufa/services/transactional-supabase-foobar/dist ./dist

# Expose port
EXPOSE 8082

# Start the server
CMD ["node", "dist/src/server.js"]