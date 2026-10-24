# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci || npm install

# Copy application source
COPY . .

# Build frontend application bundle
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy manifests and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy built frontend assets and backend source code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

COPY --from=builder /app/server.ts ./server.ts

EXPOSE 3000

CMD ["node", "server.ts"]
