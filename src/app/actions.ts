import { createThread, deleteThread, getThreads } from "@/lib/db-queries";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createNewThread(message?: string) {
    const title = message ? message.slice(0, 30) : "New Chat";
    const id = crypto.randomUUID();
    createThread(id, title);
    revalidatePath("/");
    return id;
}

export async function removeThread(id: string) {
    deleteThread(id);
    revalidatePath("/");
}

export async function getThreadList() {
    return getThreads();
}
