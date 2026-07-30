# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
ENV NITRO_PRESET=node-server
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=optional
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app
RUN addgroup -S atlas && adduser -S -G atlas -u 10001 atlas
COPY --from=build --chown=atlas:atlas /app/.output ./.output
USER atlas
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/healthz').then(r => process.exit(r.status === 204 ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", ".output/server/index.mjs"]
