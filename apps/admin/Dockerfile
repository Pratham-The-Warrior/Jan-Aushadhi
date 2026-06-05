FROM node:18-alpine AS builder
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

# Copy admin source
COPY apps/admin ./apps/admin

# Build the admin workspace
RUN npm run build --workspace=admin

FROM nginx:stable-alpine
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
