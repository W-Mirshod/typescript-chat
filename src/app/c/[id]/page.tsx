import { Chat } from "@/app/components/Chat";
import { getMessages, getThread, Message } from "@/lib/db-queries";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ThreadPage({ params }: PageProps) {
    const { id } = await params;
    const thread = getThread(id);

    if (!thread) {
        // If thread doesn't exist, maybe redirect home or show not found
        // For now, let's treat it as a new chat with that ID (auto-create on send)
        // But getMessages will be empty
    }

    const dbMessages = getMessages(id);

    // Convert DB messages to AI SDK v5 UIMessage format
    const initialMessages: any[] = dbMessages.map((m) => ({
        id: m.id,
        role: m.role,
        parts: [{ type: 'text', text: m.content }],
        createdAt: new Date(m.created_at),
    }));

    return <Chat id={id} initialMessages={initialMessages} />;
}
