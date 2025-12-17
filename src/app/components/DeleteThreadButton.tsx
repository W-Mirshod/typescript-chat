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
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
            >
                <Trash2 size={14} />
            </button>
        </form>
    );
}
