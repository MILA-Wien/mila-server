# Use Node.js Alpine for build stage with all dev tools
FROM node:22-alpine AS build

# Set working directory inside the container
WORKDIR /app

RUN corepack enable

# Copy package files for dependency installation
COPY package.json ./
COPY collectivo/package.json ./collectivo/
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY collectivo/.npmrc ./collectivo/.npmrc

# Install dependencies using clean install for reproducibility
ENV CYPRESS_INSTALL_BINARY=0
RUN pnpm i

# Copy entire project to container
COPY . .

# Build the Nuxt application
RUN pnpm run build

# Use distroless Node.js image for production for minimal, secure runtime
FROM gcr.io/distroless/nodejs22-debian12 AS prod

# Set working directory in production container
WORKDIR /app

# Copy built output from build stage to production container
COPY --from=build /app/collectivo/.output ./.output

# Expose port the app will run on
EXPOSE 3000

# Command to start the Nuxt server from built output
CMD ["./.output/server/index.mjs"]