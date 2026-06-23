# --- Build stage: install deps and produce the static client bundle ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Runtime stage: serve UI + API + WebSocket from one Node process ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8002

# Reuse the installed modules (includes tsx, used to run the TS server).
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
COPY --from=build /app/dist ./dist
COPY server ./server
COPY shared ./shared
COPY tsconfig.json ./

# Persisted state (store.json) lives here — mount a volume to keep it.
VOLUME ["/app/server/data"]

EXPOSE 8002
CMD ["npm", "run", "start"]
