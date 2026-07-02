FROM node:22-alpine
WORKDIR /app

# Dependências de produção
COPY package*.json ./
RUN npm install --omit=dev

# Build compilado
COPY dist/ ./dist/
COPY ../frontend/build/ ./frontend/build/

# Migrations e config do drizzle
COPY drizzle.config.ts ./
COPY src/db/migrations/ ./src/db/migrations/

# Entrypoint (roda migrations antes de iniciar)
COPY scripts/entrypoint.sh ./scripts/entrypoint.sh
RUN chmod +x ./scripts/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["sh", "./scripts/entrypoint.sh"]
CMD ["node", "dist/server.js"]
