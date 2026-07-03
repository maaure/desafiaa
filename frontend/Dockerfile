# ── Build stage ──────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.4 --activate

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ── Run stage ────────────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

COPY --from=build /app/build ./build
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/.npmrc ./

RUN corepack enable && corepack prepare pnpm@10.33.4 --activate && \
    pnpm install --frozen-lockfile --prod

EXPOSE 3001
ENV HOST=0.0.0.0
ENV PORT=3001

CMD ["node", "build"]
