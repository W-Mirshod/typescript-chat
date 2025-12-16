'use client';

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
// Types workaround for AI SDK 5.x
type Message = any;
type ToolInvocation = any;
import { useRouter, usePathname } from "next/navigation";
import { TableDialog } from "./TableDialog";

interface ChatProps {
    id?: string;
    initialMessages?: Message[];
}

export function Chat({ id, initialMessages = [] }: ChatProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [tableData, setTableData] = useState<any[][] | null>(null);
    const [isTableOpen, setIsTableOpen] = useState(false);

    // If id is provided, we pass it to useChat body so API knows which thread
    const { messages, input, handleInputChange, handleSubmit, status, addToolResult, setInput } = useChat({
        initialMessages,
        maxSteps: 5, // Enable multi-step tools
        body: { threadId: id },
        onFinish: () => {
            if (pathname === '/' && id) {
                router.push(`/c/${id}`);
                // Also need to refresh the sidebar to show new thread
                // We can't trigger server refresh easily from here without server action
                // But next/navigation router.refresh() handles server component refresh
                router.refresh();
            }
        }
    } as any) as any;

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
            <TableDialog
                isOpen={isTableOpen}
                onClose={() => setIsTableOpen(false)}
                data={tableData || []}
                onInsertReference={(ref) => setInput(input + " " + ref)}
            />
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.map((m: any) => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-[80%] p-3 rounded-lg ${m.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-800 border'
                                }`}
                        >
                            <div className="whitespace-pre-wrap">{m.content}</div>
                            {m.toolInvocations?.map((toolInvocation: ToolInvocation) => {
                                const toolCallId = toolInvocation.toolCallId;
                                // Render tool result or call status
                                if (toolInvocation.toolName === 'getWeather') {
                                    if ('result' in toolInvocation) {
                                        return (
                                            <div key={toolCallId} className="mt-2 p-2 bg-white rounded border text-sm text-gray-600">
                                                Weather in {toolInvocation.args.location}: {toolInvocation.result.temperature}°F, {toolInvocation.result.condition}
                                            </div>
                                        )
                                    }
                                    return <div key={toolCallId} className="mt-2 text-xs text-gray-400">Checking weather...</div>
                                }
                                if (toolInvocation.toolName === 'readSheet') {
                                    if ('result' in toolInvocation) {
                                        return (
                                            <div key={toolCallId} className="mt-2 text-sm">
                                                <div className="text-gray-500 mb-1">Spreadsheet Data:</div>
                                                <button
                                                    onClick={() => {
                                                        setTableData(toolInvocation.result as any[][]);
                                                        setIsTableOpen(true);
                                                    }}
                                                    className="px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 flex items-center gap-2"
                                                >
                                                    <span className="font-mono text-xs">View Table</span>
                                                </button>
                                            </div>
                                        );
                                    }
                                    return <div key={toolCallId} className="mt-2 text-xs text-gray-400">Reading sheet...</div>
                                }
                                if (toolInvocation.toolName === 'askForConfirmation') {
                                    if ('result' in toolInvocation) {
                                        // Result already submitted
                                        return <div key={toolCallId} className="mt-2 text-sm text-gray-500">Action {toolInvocation.result === 'Yes' ? 'Confirmed' : 'Cancelled'}</div>
                                    }
                                    // Render confirmation buttons
                                    return (
                                        <div key={toolCallId} className="mt-2 p-3 bg-white border rounded shadow-sm">
                                            <p className="mb-2 text-gray-800 font-medium">{toolInvocation.args.message}</p>
                                            <div className="flex gap-2">
                                                <button
                                                    className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                                                    onClick={() => addToolResult({ toolCallId, result: 'Yes' })}
                                                >
                                                    Yes
                                                </button>
                                                <button
                                                    className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300"
                                                    onClick={() => addToolResult({ toolCallId, result: 'No' })}
                                                >
                                                    No
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    </div>
                ))}
                {status === 'submitted' || status === 'streaming' ? (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 p-3 rounded-lg text-gray-500 animate-pulse">Thinking...</div>
                    </div>
                ) : null}
            </div>

            <div className="p-4 border-t bg-white">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={input || ''}
                        onChange={handleInputChange}
                        placeholder="Type a message..."
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        disabled={status === 'streaming' || !input || !input.trim()}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
