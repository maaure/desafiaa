FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist/
COPY frontend/build/ ./frontend/build/
EXPOSE 3000
CMD ["node", "dist/server.js"]
