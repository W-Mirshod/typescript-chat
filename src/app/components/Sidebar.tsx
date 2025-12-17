import Link from "next/link";
import { getThreadList, createNewThread } from "../actions";
import { PlusCircle, MessageSquare } from "lucide-react";
import { DeleteThreadButton } from "./DeleteThreadButton";

export async function Sidebar() {
    const threads = await getThreadList();

    return (
        <div className="w-64 bg-gradient-to-b from-slate-50 to-slate-100/50 border-r border-slate-200 h-full flex flex-col shadow-lg">
            <div className="p-4 border-b border-slate-200/80 bg-white/50 backdrop-blur-sm">
                <form action={async () => {
                    'use server';
                    await createNewThread();
                }}>
                    <button type="submit" className="flex items-center gap-2.5 p-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 w-full justify-center transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] font-semibold">
                        <PlusCircle size={20} className="stroke-[2.5]" />
                        <span>New Chat</span>
                    </button>
                </form>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                {threads.map((thread) => (
                    <div
                        key={thread.id}
                        className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 border border-transparent hover:border-slate-200 bg-white/40 backdrop-blur-sm"
                    >
                        <Link
                            href={`/c/${thread.id}`}
                            className="flex items-center gap-3 flex-1 min-w-0"
                        >
                            <div className="p-2.5 bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600 rounded-lg group-hover:from-blue-100 group-hover:to-indigo-100 group-hover:text-blue-600 transition-all duration-200 flex-shrink-0 shadow-sm">
                                <MessageSquare size={18} className="stroke-[2]" />
                            </div>
                            <div className="flex-1 overflow-hidden min-w-0">
                                <div className="font-semibold text-slate-800 truncate group-hover:text-slate-900 transition-colors">
                                    {thread.title}
                                </div>
                                <div className="text-xs text-slate-500 mt-1 font-medium">
                                    {new Date(thread.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        </Link>
                        <DeleteThreadButton threadId={thread.id} />
                    </div>
                ))}
            </div>
        </div>
    );
}
