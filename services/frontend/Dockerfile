FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json ./
COPY package-lock.json* ./

# Set production environment
ENV NODE_ENV=production

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000
ENV PORT 3000
ENV NEXT_TELEMETRY_DISABLED=1

# Start the application
CMD ["npm", "start"]