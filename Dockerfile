# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.cjs ./
COPY eslint.config.js ./

# Install dependencies
RUN npm ci

# Copy source files
COPY public ./public
COPY src ./src
COPY server ./server
COPY index.html ./

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY server ./server

# Expose port
EXPOSE 3000

# Start the server directly with tsx
CMD ["npx", "tsx", "server/index.ts"]

