FROM node:18-alpine AS builder
# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src
COPY scripts ./scripts

# Build the application
RUN npm run build

# Production image
FROM node:18-alpine AS production
WORKDIR /app

# Copy package files for production install
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled output and configuration
COPY --from=builder /app/dist ./dist
# If you have non-TS assets in src that need copying, you'd add them here

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Expose server port
EXPOSE 5000

# Run the app
CMD ["node", "dist/index.js"]
