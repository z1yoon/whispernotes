FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Copy package files
COPY frontend/package.json ./
COPY frontend/package-lock.json* ./

# Set production environment
ENV NODE_ENV=production

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY frontend/ .

# Build the application
RUN npm run build

# Copy static assets for standalone mode
RUN cp -r .next/static .next/standalone/.next/static
RUN cp -r public .next/standalone/public

# Expose port
EXPOSE 3000
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Start the application
# Use standalone server for production
WORKDIR /app/.next/standalone
CMD ["node", "server.js"]