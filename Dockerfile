FROM node:22-alpine

WORKDIR /app

# Copy the monorepo configuration
COPY package.json package-lock.json* ./
COPY tsconfig.json tsconfig.base.json ./

# Copy all source code
COPY packages/ ./packages/
COPY services/ ./services/
COPY apps/ ./apps/
COPY ui/ ./ui/

# Install dependencies for the whole workspace
# This accurately symlinks all workspaces into /app/node_modules
RUN npm install

# Build all workspaces
RUN npm run build

# Define required environment variables
ENV NODE_ENV=production

# Start exactly what got built
CMD ["node", "services/compliance-api/dist/index.js"]
