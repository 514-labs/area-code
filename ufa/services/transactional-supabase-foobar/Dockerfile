# Simple Dockerfile that replicates development environment
FROM node:slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY ufa/services/transactional-supabase-foobar/package.json ./ufa/services/transactional-supabase-foobar/
COPY ufa/packages/models/package.json ./ufa/packages/models/
COPY ufa/packages/eslint-config/package.json ./ufa/packages/eslint-config/
COPY ufa/packages/typescript-config/package.json ./ufa/packages/typescript-config/

# Install all dependencies (including dev dependencies like tsx)
RUN pnpm install

# Copy source code
COPY ufa/services/transactional-supabase-foobar ./ufa/services/transactional-supabase-foobar
COPY ufa/packages ./ufa/packages

# Set working directory to the service
WORKDIR /app/ufa/services/transactional-supabase-foobar

# Build the TypeScript code
RUN pnpm build

# Set production environment
ENV NODE_ENV=production

# Expose port
EXPOSE 8082

# Run the bundled JavaScript
CMD ["node", "dist/server.js"]
