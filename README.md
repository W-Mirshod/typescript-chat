# Simplified ChatGPT-like Interface with Generative UI

This project implements a simplified ChatGPT-like interface using Next.js 16, Vercel AI SDK, and Bun SQLite.
It features persistent threads, message history, generative UI tools (weather, confirmation, table view), and XLSX file handling.

## Requirements

- **Bun 1.3+**: Required for package management and built-in SQLite.

## Installation

1. Install dependencies:
   ```bash
   bun install
   ```

2. Initialize the database:
   ```bash
   bun scripts/init-db.ts
   ```

3. Create example XLSX file (optional, or use provided tool):
   ```bash
   bun scripts/create-xlsx.ts
   ```

## Running the App

1. Set your Azure OpenAI credentials:
   ```bash
   export AZURE_OPENAI_API_KEY=your_azure_api_key
   export AZURE_OPENAI_RESOURCE_NAME=your_resource_name
   export AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name
   ```
   (Or create a `.env.local` file with these variables)

2. Start the development server:
   ```bash
   bun dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).

## Docker Deployment

### Using Docker Compose (Recommended)

1. Create a `.env` file in the project root:
   ```bash
   AZURE_OPENAI_API_KEY=your_azure_api_key
   AZURE_OPENAI_RESOURCE_NAME=your_resource_name
   AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name
   ```

2. Build and start the container:
   ```bash
   docker-compose up -d
   ```

3. View logs:
   ```bash
   docker-compose logs -f
   ```

4. Stop the container:
   ```bash
   docker-compose down
   ```

The Docker setup includes:
- Persistent volumes for `chat.db` and `data/example.xlsx`
- Automatic database and XLSX file initialization
- Production-ready Next.js build

### Using Docker directly

```bash
# Build the image
docker build -t typescript-chat .

# Run the container
docker run -p 3000:3000 \
  -e AZURE_OPENAI_API_KEY=your_key \
  -e AZURE_OPENAI_RESOURCE_NAME=your_resource \
  -e AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/chat.db:/app/chat.db \
  typescript-chat
```

## Features

- **Threads**: Create new threads, switch between them via sidebar. Autosave on first message.
- **Persistence**: Messages are saved to local SQLite `chat.db`.
- **Generative UI**:
  - **Weather**: Ask "What's the weather in NY?" (Mock tool).
  - **Dangerous Actions**: Ask "Update cell A2 to 500" or "Delete this thread". A confirmation UI will appear.
  - **XLSX**: Ask "Show me the excel sheet" or "Read range @Sheet1!A1:B5".
    - **Table Preview**: When reading sheet data, a preview table is displayed inline in the chat message.
    - **Full Table View**: Click "View Full Table" to open the grid in a modal dialog.
    - **Cell Selection**: Select cells in the grid and click "Insert Mention" to add `@Sheet1!A1:B2` to your chat.
    - **Range Mentions**: Use range mentions like `@Sheet1!A1:B5` in your messages, and the agent will understand and read those ranges.

## Architecture

- `src/lib/db.ts`: Bun SQLite connection.
- `src/app/api/chat/route.ts`: Main API route handling AI stream and server-side tools.
- `src/app/components/Chat.tsx`: Client-side Chat component with `useChat` and Generative UI rendering.
