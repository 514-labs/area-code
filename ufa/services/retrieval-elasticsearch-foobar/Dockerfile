# Simple Dockerfile that replicates development environment
FROM node:slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY ufa/services/retrieval-elasticsearch-foobar/package.json ./ufa/services/retrieval-elasticsearch-foobar/
COPY ufa/packages/models/package.json ./ufa/packages/models/
COPY ufa/packages/eslint-config/package.json ./ufa/packages/eslint-config/
COPY ufa/packages/typescript-config/package.json ./ufa/packages/typescript-config/

# Install all dependencies (including dev dependencies like tsx)
RUN pnpm install

# Copy source code
COPY ufa/services/retrieval-elasticsearch-foobar ./ufa/services/retrieval-elasticsearch-foobar
COPY ufa/packages ./ufa/packages

# Set working directory to the service
WORKDIR /app/ufa/services/retrieval-elasticsearch-foobar

# Build the TypeScript code
RUN pnpm build

# Set production environment
ENV NODE_ENV=production

# Skip Elasticsearch wait in production (assume ES is available externally)
ENV SKIP_ES_WAIT=true

# Expose port
EXPOSE 8083

# Run the bundled JavaScript
CMD ["node", "dist/server.js"]