import { Database } from "bun:sqlite";

// Initialize the database
const db = new Database("chat.db", { create: true });

export default db;
