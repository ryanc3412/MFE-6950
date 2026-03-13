FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json ./

RUN pnpm install

COPY . .

ENV NEXT_PRIVATE_LOCAL_WEBPACK=true

RUN pnpm build

EXPOSE 3001

ENV HOSTNAME=0.0.0.0 \
    PORT=3001 \
    NODE_ENV=production

CMD ["pnpm", "start"]
