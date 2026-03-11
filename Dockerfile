# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — builder
# Install frontend dependencies and produce the Vite production bundle.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.js eslint.config.js ./
COPY public/ ./public/
COPY src/ ./src/

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — production
# Install server dependencies, Playwright + Chromium, serve everything.
#
# server/index.js serves the dist/ folder as static files when
# NODE_ENV=production.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS production

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install server dependencies
COPY server/package.json ./server/
RUN cd server && npm install --omit=dev

# Install Playwright Chromium + all OS-level deps in one step
RUN cd server && npx playwright install --with-deps chromium

# Copy server source
COPY server/ ./server/

# Copy the built React app from builder
COPY --from=builder /app/dist ./dist

# Ensure data directories exist for volume mounts
RUN mkdir -p ./server/data/page-cache ./server/data/notes/uploads

# Run as non-root
RUN groupadd --gid 1001 nodejs \
    && useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home appuser \
    && chown -R appuser:nodejs /app
USER appuser

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "server/index.js"]
