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
                    await createNewThread();
                }}>
                    <button type="submit" className="flex items-center gap-2 p-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 w-full justify-center transition-all shadow-sm">
                        <PlusCircle size={18} />
                        <span className="font-medium">New Chat</span>
                    </button>
                </form>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-1">
                {threads.map((thread) => (
                    <Link
                        key={thread.id}
                        href={`/c/${thread.id}`}
                        className="group flex items-center gap-3 p-3 rounded-lg hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-200"
                    >
                        <div className="p-2 bg-gray-200 text-gray-500 rounded group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <MessageSquare size={16} />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="font-medium text-gray-700 truncate group-hover:text-gray-900">
                                {thread.title}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                                {new Date(thread.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
