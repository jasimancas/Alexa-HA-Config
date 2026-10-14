FROM node:24-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile


FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable pnpm && pnpm run build


FROM base AS runner
USER root

RUN apk add --no-cache libc6-compat nginx

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOST=0.0.0.0
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app .

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080
EXPOSE 3000

RUN corepack enable pnpm

CMD sh -c "pnpm start & nginx -g 'daemon off;'"
