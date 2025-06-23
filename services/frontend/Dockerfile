# Multi-stage build for better performance
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Dependencies stage - install all dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Development stage with pre-built assets
FROM base AS development
COPY package*.json ./
RUN npm install
COPY . .
# Pre-build to reduce initial compilation time
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production build stage
FROM base AS builder
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
# Build the application
RUN npm run build

# Production stage - optimized for fast startup
FROM node:18-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT 3000

# Start the application
CMD ["node", "server.js"]