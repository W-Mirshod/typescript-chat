'use client';

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState, type ReactElement } from "react";
// Types workaround for AI SDK 5.x
type Message = any;
type ToolInvocation = any;
import { useRouter, usePathname } from "next/navigation";
import { TableDialog } from "./TableDialog";

interface ChatProps {
    id?: string;
    initialMessages?: Message[];
}

// Helper function to convert 2D array to markdown table
function arrayToMarkdownTable(data: any[][]): string {
    if (!data || data.length === 0) return '';
    
    let markdown = '';
    data.forEach((row, index) => {
        const rowStr = row.map(cell => {
            const cellStr = cell === null || cell === undefined ? '' : String(cell);
            // Escape pipes in cell content
            return cellStr.replace(/\|/g, '\\|');
        }).join(' | ');
        markdown += `| ${rowStr} |\n`;
        
        // Add header separator after first row
        if (index === 0) {
            const separator = row.map(() => '---').join(' | ');
            markdown += `| ${separator} |\n`;
        }
    });
    
    return markdown;
}

// Helper function to render markdown table as HTML
function renderTablePreview(data: any[][]): ReactElement {
    if (!data || data.length === 0) return <></>;
    
    return (
        <div className="mt-2 mb-2 overflow-x-auto">
            <table className="min-w-full text-xs border-collapse border border-gray-300">
                <tbody>
                    {data.map((row, r) => (
                        <tr key={r}>
                            {row.map((cell, c) => (
                                <td key={c} className="border border-gray-300 px-2 py-1 bg-white text-gray-800">
                                    {cell === null || cell === undefined ? '' : String(cell)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function Chat({ id, initialMessages = [] }: ChatProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [tableData, setTableData] = useState<any[][] | null>(null);
    const [isTableOpen, setIsTableOpen] = useState(false);
    const [localInput, setLocalInput] = useState<string>('');

    // If id is provided, we pass it to useChat body so API knows which thread
    const { messages, input, handleInputChange, handleSubmit, status, addToolResult, setInput } = useChat({
        api: '/api/chat',
        initialMessages,
        maxSteps: 5,
        body: { threadId: id },
        onFinish: () => {
            if (pathname === '/' && id) {
                router.push(`/c/${id}`);
                router.refresh();
            }
        }
    } as any) as any;

    const scrollRef = useRef<HTMLDivElement>(null);

    // initialize localInput once from the hook's input value
    useEffect(() => {
        setLocalInput(input || '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="flex flex-col h-full max-w-3xl mx-auto w-full relative">
            <TableDialog
                isOpen={isTableOpen}
                onClose={() => setIsTableOpen(false)}
                data={tableData || []}
                onInsertReference={(ref) => {
                    const newValue = `${localInput || ''} ${ref}`.trim();
                    setLocalInput(newValue);
                    setInput(newValue);
                }}
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
                                        const sheetData = toolInvocation.result as any[][];
                                        return (
                                            <div key={toolCallId} className="mt-2 text-sm">
                                                <div className="text-gray-500 mb-2 font-medium">Spreadsheet Data:</div>
                                                {renderTablePreview(sheetData)}
                                                <button
                                                    onClick={() => {
                                                        setTableData(sheetData);
                                                        setIsTableOpen(true);
                                                    }}
                                                    className="mt-2 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 flex items-center gap-2"
                                                >
                                                    <span className="font-mono text-xs">View Full Table</span>
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

            <div className="p-4 border-t border-gray-200 bg-white shadow-sm relative z-10">
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        setInput(localInput || '');
                        await new Promise((r) => setTimeout(r, 0));
                        handleSubmit(e);
                    }}
                    className="flex gap-2"
                    noValidate
                >
                    <input
                        type="text"
                        className="flex-1 p-3 border-2 border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500"
                        value={localInput}
                        onChange={(e) => setLocalInput(e.target.value)}
                        placeholder="Type a message..."
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition-colors"
                        disabled={status === 'streaming' || !localInput || !localInput.trim()}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
