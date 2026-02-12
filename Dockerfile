# Build stage for client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy server code
COPY src/ ./src/
COPY server.js ./

# Copy built client
COPY --from=client-build /app/client/dist ./client/dist

# Create necessary directories
RUN mkdir -p uploads/images uploads/pdfs uploads/imports logs

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/v1/health || exit 1

CMD ["node", "server.js"]
