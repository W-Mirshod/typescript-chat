import db from "./db";

export interface Thread {
    id: string;
    title: string;
    created_at: number;
}

export interface Message {
    id: string;
    thread_id: string;
    role: 'user' | 'assistant' | 'system' | 'data';
    content: string;
    created_at: number;
}

export const getThreads = () => {
    return db.query("SELECT * FROM threads ORDER BY created_at DESC").all() as Thread[];
};

export const getThread = (id: string) => {
    return db.query("SELECT * FROM threads WHERE id = ?").get(id) as Thread | null;
};

export const createThread = (id: string, title: string) => {
    const statement = db.query("INSERT INTO threads (id, title, created_at) VALUES (?, ?, ?)");
    statement.run(id, title, Date.now());
    return { id, title, created_at: Date.now() };
};

export const getMessages = (threadId: string) => {
    return db.query("SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC").all(threadId) as Message[];
};

export const saveMessage = (message: { id: string; threadId: string; role: string; content: string }) => {
    const statement = db.query(
        "INSERT INTO messages (id, thread_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)"
    );
    statement.run(message.id, message.threadId, message.role, message.content, Date.now());
};

export const deleteThread = (threadId: string) => {
    db.query("DELETE FROM threads WHERE id = ?").run(threadId);
};
