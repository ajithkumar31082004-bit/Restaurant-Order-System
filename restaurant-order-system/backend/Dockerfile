# ── Stage 1: Dependencies ─────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only package files first (better layer caching)
COPY package.json package-lock.json ./

# Install all dependencies (including dev for build stage)
RUN npm ci --omit=dev && npm cache clean --force

# ── Stage 2: Production Image ──────────────────────────────────────────────────
FROM node:20-alpine AS production

LABEL maintainer="FoodHub DevOps"
LABEL version="2.0.0"
LABEL description="FoodHub Restaurant Order System — Backend API"

# Install dumb-init for proper signal handling (enables graceful shutdown)
RUN apk add --no-cache dumb-init

WORKDIR /app

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001

# Copy production node_modules from deps stage
COPY --from=deps --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copy application source code
COPY --chown=nodeuser:nodejs . .

# Create uploads directory (for food images) with correct permissions
RUN mkdir -p /app/uploads && chown -R nodeuser:nodejs /app/uploads

# Switch to non-root user
USER nodeuser

# Expose the application port
EXPOSE 5000

# Health check — Docker will mark container unhealthy if /health fails
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Use dumb-init as PID 1 for proper signal forwarding
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "server.js"]
