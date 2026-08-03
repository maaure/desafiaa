# ── Build stage ──────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.4 --activate

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# Copia seletiva: configs raramente mudam, src muda sempre.
# Assim a camada do pnpm install permanece em cache entre builds.
COPY svelte.config.js vite.config.ts tsconfig.json ./
COPY src/ ./src/

# VITE_GOOGLE_CLIENT_ID é substituído no build (import.meta.env) — vem do compose
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
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
