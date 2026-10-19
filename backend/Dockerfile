FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy workspaces package files
COPY apps/frontend/package*.json ./apps/frontend/
COPY apps/seller/package*.json ./apps/seller/
COPY apps/admin/package*.json ./apps/admin/
COPY backend/package*.json ./backend/

# Install ALL dependencies (including devDependencies for tsc build)
RUN npm ci

# Copy backend source
COPY backend ./backend

# Build the backend workspace (compiles TypeScript → dist/)
RUN npm run build --workspace=janaushadhi-backend

# ---- Production Image ----
FROM node:20-alpine AS production
WORKDIR /app

# Copy package files for production dependency installation
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
COPY apps/seller/package*.json ./apps/seller/
COPY apps/admin/package*.json ./apps/admin/
COPY backend/package*.json ./backend/

# Install the backend's production dependencies only (not the web apps')
RUN npm ci --omit=dev --workspace=janaushadhi-backend --include-workspace-root

# Copy compiled backend output from builder stage
COPY --from=builder /app/backend/dist ./backend/dist

# Copy database migration SQL files
COPY backend/migrations ./backend/migrations

# CSV datasets used by the ETL scripts and the background store import
COPY ["data/A_Z_medicines_dataset_of_India.csv", "data/Product List_3_4_2026 @ 16_33_44.csv", "data/kendra_stores.csv", "data/pincode_geo.csv", "/app/data/"]

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Expose server port
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/api/v1/health/live > /dev/null || exit 1

# Run the compiled JavaScript output — NOT tsx dev transpiler
WORKDIR /app/backend
CMD ["node", "dist/src/index.js"]
