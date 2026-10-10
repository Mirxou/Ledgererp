# ─── Ledgererp Dockerfile ───────────────────────────────────────
# Multi-stage production build using Bun for fast installs
# Standalone Next.js output for minimal image size

# ─── Stage 1: Dependencies ─────────────────────────────────────
FROM oven/bun:1 AS deps
WORKDIR /app

# Copy lockfile and manifest for dependency installation
COPY package.json bun.lockb ./

# Install all dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# ─── Stage 2: Builder ──────────────────────────────────────────
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/bun.lockb ./bun.lockb

# Copy application source code
COPY . .

# Build the Next.js application (standalone output)
RUN bun run build

# ─── Stage 3: Runner (Production) ──────────────────────────────
FROM oven/bun:1 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root system user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone server output (includes minimal node_modules)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create db and backups directories with proper permissions for SQLite
RUN mkdir -p /app/db/backups && chown -R nextjs:nodejs /app/db

# Switch to non-root user
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Standalone mode requires Node.js to run server.js
CMD ["node", "server.js"]
