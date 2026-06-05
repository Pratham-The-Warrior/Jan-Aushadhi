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

# Copy seller source
COPY apps/seller ./apps/seller

# Build the seller workspace
RUN npm run build --workspace=seller

FROM nginx:stable-alpine
COPY --from=builder /app/apps/seller/dist /usr/share/nginx/html
COPY apps/seller/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
