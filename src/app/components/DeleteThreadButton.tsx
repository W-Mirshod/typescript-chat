'use client';

import { Trash2 } from "lucide-react";
import { removeThread } from "../actions/delete-thread";
import { usePathname } from "next/navigation";

interface DeleteThreadButtonProps {
    threadId: string;
}

export function DeleteThreadButton({ threadId }: DeleteThreadButtonProps) {
    const pathname = usePathname();
    const isCurrentThread = pathname === `/c/${threadId}`;

    return (
        <form
            action={async () => {
                await removeThread(threadId, isCurrentThread);
            }}
            className="flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
        >
            <button
                type="submit"
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95"
                onClick={(e) => e.stopPropagation()}
            >
                <Trash2 size={16} className="stroke-[2]" />
            </button>
        </form>
    );
}
