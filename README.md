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

1. Set your OpenAI API Key:
   ```bash
   export OPENAI_API_KEY=your_key_here
   ```
   (Or create a `.env.local` file)

2. Start the development server:
   ```bash
   bun dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).

## Features

- **Threads**: Create new threads, switch between them via sidebar. Autosave on first message.
- **Persistence**: Messages are saved to local SQLite `chat.db`.
- **Generative UI**:
  - **Weather**: Ask "What's the weather in NY?" (Mock tool).
  - **Dangerous Actions**: Ask "Update cell A2 to 500" or "Delete this thread". A confirmation UI will appear.
  - **XLSX**: Ask "Show me the excel sheet". Click "View Table" to open the grid.
    - **Selection**: Select cells in the grid and click "Insert Mention" to add `@Sheet1!A1` to your chat.

## Architecture

- `src/lib/db.ts`: Bun SQLite connection.
- `src/app/api/chat/route.ts`: Main API route handling AI stream and server-side tools.
- `src/app/components/Chat.tsx`: Client-side Chat component with `useChat` and Generative UI rendering.

## Known Limitations

- "Delete Thread" tool deletes from DB but might require refresh to disappear from sidebar immediately (though `revalidatePath`/`router.refresh` is attempted).
- XLSX writes are simplified (single file `data/example.xlsx`).
