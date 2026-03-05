# Base stage for building
FROM node:22-alpine AS builder

WORKDIR /app

# Copy the monorepo configuration
COPY package.json package-lock.json* ./
COPY tsconfig.json tsconfig.base.json ./

# Copy packages and services
COPY packages/ ./packages/
COPY services/ ./services/

# Install dependencies for the whole workspace
RUN npm install

# Build the compliance-api workspace natively
RUN npm run build --workspace=@complihub/compliance-api

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

# Copy the built dist from the builder stage
COPY --from=builder /app/services/compliance-api/dist ./services/compliance-api/dist
COPY --from=builder /app/services/compliance-api/package.json ./services/compliance-api/package.json

# Copy all internal packages so that symlinks in node_modules do not break
COPY --from=builder /app/packages ./packages

# Copy all node_modules (required since standard workspaces link local deps inside node_modules)
COPY --from=builder /app/node_modules ./node_modules
COPY package.json package-lock.json* ./

# Define required environment variables (To be provided by the host)
ENV NODE_ENV=production
ENV PORT=3005

EXPOSE 3005

# Start exactly what got built
CMD ["node", "services/compliance-api/dist/index.js"]
