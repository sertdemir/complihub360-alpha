FROM node:22-alpine

WORKDIR /app

# Copy the monorepo configuration
COPY package.json package-lock.json* ./
COPY tsconfig.json tsconfig.base.json ./

# Copy packages and services
COPY packages/ ./packages/
COPY services/ ./services/

# Install dependencies for the whole workspace
# This accurately symlinks all workspaces into /app/node_modules
RUN npm install

# Build the compliance-api workspace natively
RUN npm run build --workspace=@complihub/compliance-api

# Define required environment variables
ENV NODE_ENV=production
ENV PORT=3005

EXPOSE 3005

# Start exactly what got built
CMD ["node", "services/compliance-api/dist/index.js"]
