ARG NODE_IMAGE=node:22-alpine
FROM ${NODE_IMAGE} AS base
ARG NPM_REGISTRY=https://registry.npmmirror.com/
ARG NPM_REGISTRIES=
ENV NPM_REGISTRY=${NPM_REGISTRY}
ENV NPM_REGISTRIES=${NPM_REGISTRIES}
RUN npm config set registry ${NPM_REGISTRY} && \
    npm config set fetch-timeout 600000 && \
    npm config set fetch-retries 10 && \
    corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app
COPY docker/pnpm-install-mirrors.sh /usr/local/bin/pnpm-install-mirrors.sh
RUN sed -i 's/\r$//' /usr/local/bin/pnpm-install-mirrors.sh && chmod +x /usr/local/bin/pnpm-install-mirrors.sh

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY scripts ./scripts
RUN pnpm-install-mirrors.sh

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate && pnpm build && \
    pkg=$(find node_modules/.pnpm -maxdepth 1 -type d -name '@prisma+client@*' | head -1) && \
    rm -rf node_modules/.prisma node_modules/@prisma && \
    mkdir -p node_modules/.prisma node_modules/@prisma && \
    cp -r "$pkg/node_modules/.prisma/." node_modules/.prisma/ && \
    cp -r "$pkg/node_modules/@prisma/." node_modules/@prisma/

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs && \
    npm install -g prisma@6.19.3 tsx@4.22.4 && \
    npm install --prefix /app bcryptjs@3.0.3
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json
RUN rm -rf node_modules/@prisma node_modules/.prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY docker/entrypoint.prod.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /data/uploads && chown -R nextjs:nodejs /data/uploads /app
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["/bin/sh", "/entrypoint.sh"]
