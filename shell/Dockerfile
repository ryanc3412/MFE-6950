FROM node:22-alpine

WORKDIR /app

# Use Corepack to provide pnpm (no npm install -g to avoid EEXIST)
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json ./

RUN pnpm install

COPY . .

ENV NEXT_PRIVATE_LOCAL_WEBPACK=true

RUN pnpm build

EXPOSE 3000

# Listen on all interfaces so container is reachable from host (WSL/Windows)
ENV HOSTNAME=0.0.0.0 \
    PORT=3000 \
    NODE_ENV=production

CMD ["pnpm", "start"]
