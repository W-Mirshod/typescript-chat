import Link from "next/link";
import { getThreadList, createNewThread } from "../actions";
import { PlusCircle, MessageSquare } from "lucide-react";

export async function Sidebar() {
    const threads = await getThreadList();

    return (
        <div className="w-64 bg-gray-50 border-r h-full flex flex-col">
            <div className="p-4 border-b">
                <form action={async () => {
                    'use server';
                    const id = await createNewThread();
                    // Redirect handled in action or client? Action returns id.
                    // We need to redirect.
                    // Since it's a server action inside a server component, we can use `redirect` in `createNewThread` or here.
                    // But `createNewThread` in `actions.ts` didn't redirect.
                    // Let's modify `createNewThread` to redirect or handle it here.
                    // Actually, we can't redirect from inside the form action easily without `redirect` from `actions.ts`.
                    // I'll assume `createNewThread` does NOT redirect, so we'll do it via client component wrapper if needed, 
                    // or just make a simple button that links to `/` for now as "New Chat" logic is on `/`.
                    // But `/` is new chat.
                }}>
                    <Link href="/" className="flex items-center gap-2 p-2 bg-black text-white rounded hover:bg-gray-800 w-full justify-center">
                        <PlusCircle size={16} /> New Chat
                    </Link>
                </form>
            </div>
            <div className="flex-1 overflow-auto p-2">
                {threads.map((thread) => (
                    <Link
                        key={thread.id}
                        href={`/c/${thread.id}`}
                        className="block p-3 rounded hover:bg-gray-200 mb-2 text-sm truncate"
                    >
                        <div className="flex items-center gap-2">
                            <MessageSquare size={14} className="text-gray-500" />
                            <span className="font-medium text-gray-700 truncate">{thread.title}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                            {new Date(thread.created_at).toLocaleDateString()}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
