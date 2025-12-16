FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy application files
COPY . .

# Create data directory if it doesn't exist
RUN mkdir -p data

# Initialize database and create XLSX if needed (will skip if already exists)
RUN bun scripts/init-db.ts || true
RUN bun scripts/create-xlsx.ts || true

# Build Next.js app
RUN bun run build

EXPOSE 3000

CMD ["bun", "run", "start"]

