FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json ./

RUN pnpm install

COPY . .

RUN pnpm run build

EXPOSE 3004

# Bind to all interfaces so container is reachable from host (WSL/Windows)
# Host and port are set in vite.config.ts preview section
CMD ["pnpm", "preview"]
