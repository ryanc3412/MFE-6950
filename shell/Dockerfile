FROM node:20-alpine

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:3002
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Use Corepack to provide pnpm (no npm install -g to avoid EEXIST)
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

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
