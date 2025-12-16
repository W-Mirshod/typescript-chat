import { Database } from "bun:sqlite";

// Initialize the database
const db = new Database("chat.db");
// bun:sqlite creates the file if it doesn't exist

db.run('PRAGMA journal_mode = WAL');

export default db;
