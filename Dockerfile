# ==========================================
# Stage 1: Build Shared, Client, and Server
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace and package files
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install all dependencies (including devDependencies needed for compiling)
RUN npm ci

# Copy full source trees
COPY shared ./shared
COPY client ./client
COPY server ./server

# Build all packages: shared -> client (outputs to server/public) -> server
RUN npm run build

# Prune devDependencies to keep runtime image lightweight
RUN npm prune --production

# ==========================================
# Stage 2: Production Lightweight Runtime (<150MB)
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy production node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/shared/package*.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/public ./server/public

# Cloud Run health and port exposure
EXPOSE 8080

# Run non-root user for security
USER node

# Launch server
CMD ["node", "server/dist/server.js"]
