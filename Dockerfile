# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# These URLs are public and embedded in the browser bundle by next.config.mjs.
# Authentication secrets and the Django API URL are supplied only at runtime.
ARG REACT_APP_WEBSITE_AGENCY
ARG REACT_APP_WEBSITE_COUNTRY
ARG REACT_APP_WEBSITE_INSTITUTION
ARG REACT_APP_WEBSITE_REPORT
ARG REACT_APP_ESCO_API=https://ec.europa.eu/esco/api/search
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN groupadd --system --gid 1001 nextjs \
    && useradd --system --uid 1001 --gid nextjs --no-create-home nextjs

COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
RUN mkdir -p .next/cache && chown nextjs:nextjs .next/cache

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["node", "-e", "const http = require('node:http'); const req = http.get('http://127.0.0.1:3000/api/health', res => { res.resume(); process.exitCode = res.statusCode === 200 ? 0 : 1; }); req.setTimeout(4000, () => req.destroy(new Error('Health check timed out'))); req.on('error', () => { process.exitCode = 1; });"]

CMD ["node", "server.js"]
