FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends g++ \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./backend/
RUN npm ci --prefix backend --omit=dev

COPY frontend/package*.json ./frontend/
RUN npm ci --prefix frontend

COPY . .

RUN npm --prefix backend run build:engine:linux \
    && npm --prefix frontend run build

ENV NODE_ENV=production
ENV CPP_ENGINE_PATH=/app/provenance_engine
ENV PROVENANCE_STORE_PATH=/var/data/store.json

EXPOSE 3000

CMD ["node", "backend/server.js"]
