# Stage 1 - build the React frontend
FROM node:22-slim AS frontend

WORKDIR /app/frontend

# Copy manifests first so npm install is cached when only source changes.
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


# Stage 2 - backend runtime, serving the built frontend
FROM node:22-slim

ENV NODE_ENV=production

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./

# server.js resolves the frontend as path.join(__dirname, "../frontend/dist"),
# which from /app/backend is /app/frontend/dist.
COPY --from=frontend /app/frontend/dist /app/frontend/dist

EXPOSE 8080

CMD ["node", "server.js"]