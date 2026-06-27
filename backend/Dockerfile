FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy workspaces package files
COPY apps/frontend/package*.json ./apps/frontend/
COPY apps/seller/package*.json ./apps/seller/
COPY apps/admin/package*.json ./apps/admin/
COPY backend/package*.json ./backend/

# Install dependencies using root lockfile
RUN npm ci

# Copy backend source
COPY backend ./backend

# Build the backend workspace
RUN npm run build --workspace=janaushadhi-backend

# Production image
FROM node:20-alpine AS production
WORKDIR /app

# Copy package files for production dependency installation
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
COPY apps/seller/package*.json ./apps/seller/
COPY apps/admin/package*.json ./apps/admin/
COPY backend/package*.json ./backend/

# Install production dependencies
RUN npm ci --omit=dev

# Copy backend source
COPY backend /app/backend

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Expose server port
EXPOSE 5000

# Run the backend application using tsx from backend workspace directory
WORKDIR /app/backend
CMD ["npx", "tsx", "src/index.ts"]
