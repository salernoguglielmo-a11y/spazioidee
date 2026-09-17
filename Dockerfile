# ── build ────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── runtime ──────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# I dati (SQLite e file caricati) vivono su volume: non nell'immagine.
RUN mkdir -p /data/uploads && chown -R nextjs:nodejs /data
ENV DATA_DIR=/data
ENV DATABASE_URL=file:/data/spazioidee.db
VOLUME ["/data"]

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
