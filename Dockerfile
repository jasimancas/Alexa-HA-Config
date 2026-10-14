FROM node:24-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM node:24-alpine AS runner
ARG BUILD_VERSION=dev
ARG BUILD_ARCH=amd64

RUN apk add --no-cache nginx \
	&& rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
		/usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

WORKDIR /app
ENV NODE_ENV=production \
	NEXT_TELEMETRY_DISABLED=1 \
	PORT=3000 \
	HOSTNAME=127.0.0.1

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY nginx.conf /etc/nginx/nginx.conf
COPY run.sh /run.sh

LABEL io.hass.type="addon" \
	io.hass.version="${BUILD_VERSION}" \
	io.hass.arch="${BUILD_ARCH}" \
	io.hass.name="Alexa HA Config" \
	org.opencontainers.image.source="https://github.com/jasimancas/Alexa-HA-Config" \
	org.opencontainers.image.licenses="MIT"

EXPOSE 8080
CMD ["/run.sh"]
