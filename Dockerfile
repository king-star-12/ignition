# Ignition — Next.js standalone build for Azure Container Apps.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Saved reports land here when the filesystem is writable; the store falls
# back to memory when it is not, so this is a convenience, not a dependency.
RUN mkdir -p /app/.data/runs /app/.data/search-cache && chown -R nextjs:nodejs /app/.data

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
