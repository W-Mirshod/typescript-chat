FROM oven/bun:1 AS base
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential make g++ pkg-config ca-certificates && rm -rf /var/lib/apt/lists/*

ENV PYTHON=/usr/bin/python3

COPY package.json bun.lock ./
RUN bun install

COPY . .

RUN mkdir -p data

RUN bun scripts/init-db.ts || true
RUN bun scripts/create-xlsx.ts || true

RUN bun run build

EXPOSE 3000

CMD ["bun", "run", "start"]

