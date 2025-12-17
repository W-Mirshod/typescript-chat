'use client';

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState, type ReactElement } from "react";
import { Loader2, Terminal, MessageSquare, ArrowRight } from "lucide-react";
// Types workarounds
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

function WelcomeScreen({ onExampleClick }: { onExampleClick: (text: string) => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-8">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <Terminal size={32} className="text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome to AI Chat</h1>
            <p className="text-gray-600 max-w-md">
                I can help you analyze data, answer questions, and manage your threads.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                <button
                    onClick={() => onExampleClick("Analyze the spreadsheet data")}
                    className="p-4 bg-white border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all text-left group"
                >
                    <div className="font-medium text-gray-800 mb-1 group-hover:text-blue-600">Analyze Data</div>
                    <div className="text-sm text-gray-500">Read and summarize the spreadsheet</div>
                </button>
                <button
                    onClick={() => onExampleClick("What is the weather in Tokyo?")}
                    className="p-4 bg-white border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all text-left group"
                >
                    <div className="font-medium text-gray-800 mb-1 group-hover:text-blue-600">Check Weather</div>
                    <div className="text-sm text-gray-500">Get real-time weather info</div>
                </button>
                <button
                    onClick={() => onExampleClick("Write 'Test' to cell A1")}
                    className="p-4 bg-white border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all text-left group"
                >
                    <div className="font-medium text-gray-800 mb-1 group-hover:text-blue-600">Update Sheet</div>
                    <div className="text-sm text-gray-500">Modify spreadsheet values</div>
                </button>
                <button
                    onClick={() => onExampleClick("Write a haiku about TypeScript")}
                    className="p-4 bg-white border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all text-left group"
                >
                    <div className="font-medium text-gray-800 mb-1 group-hover:text-blue-600">Creative Writing</div>
                    <div className="text-sm text-gray-500">Generate poems or stories</div>
                </button>
            </div>
        </div>
    );
}

export function Chat({ id, initialMessages = [] }: ChatProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [tableData, setTableData] = useState<any[][] | null>(null);
    const [isTableOpen, setIsTableOpen] = useState(false);
    const [localInput, setLocalInput] = useState<string>('');

    // Use useChat from @ai-sdk/react. 
    // Note: In this version (v2+ / ai v5), useChat helpers are reduced.
    // We must manage input state manually and use sendMessage.
    const { messages, status, addToolResult, sendMessage, error } = useChat({
        id: id || 'default',
        api: '/api/chat',
        initialMessages,
        maxSteps: 5,
        body: { threadId: id },
        onFinish: () => {
            if (pathname === '/' && id) {
                router.push(`/c/${id}`);
                router.refresh();
            }
        },
        onError: (err: Error) => {
            console.error("Chat error:", err);
        }
    } as any);

    useEffect(() => {
        console.log("Current messages length:", messages.length);
        console.log("Current status:", status);
        if (error) console.error("Chat error state:", error);
    }, [messages, status, error]);

    const scrollRef = useRef<HTMLDivElement>(null);

    // No need to sync input from hook anymore as we manage it locally

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
                }}
            />
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.length === 0 ? (
                    <WelcomeScreen onExampleClick={(text) => {
                        setLocalInput(text);
                        sendMessage({ role: 'user', parts: [{ type: 'text', text }] });
                    }} />
                ) : (
                    <>
                        {messages.map((m: any) => (
                            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[80%] p-3 rounded-lg ${m.role === 'user'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-800 border'
                                        }`}
                                >
                                    <div className="whitespace-pre-wrap">
                                        {m.parts?.map((part: any, idx: number) => {
                                            if (part.type === 'text') {
                                                return <span key={idx}>{part.text}</span>;
                                            }
                                            return null;
                                        })}
                                    </div>
                                    {m.parts?.map((part: any) => {
                                        if (!part.type?.startsWith('tool-')) return null;
                                        const toolInvocation = part;
                                        const toolCallId = toolInvocation.toolCallId;
                                        const toolName = part.type.replace('tool-', '');
                                        
                                        if (toolName === 'getWeather') {
                                            if (toolInvocation.state === 'output-available') {
                                                return (
                                                    <div key={toolCallId} className="mt-2 p-2 bg-white rounded border text-sm text-gray-600">
                                                        Weather in {toolInvocation.input.location}: {toolInvocation.output.temperature}°F, {toolInvocation.output.condition}
                                                    </div>
                                                )
                                            }
                                            return <div key={toolCallId} className="mt-2 text-xs text-gray-400">Checking weather...</div>
                                        }
                                        if (toolName === 'readSheet') {
                                            if (toolInvocation.state === 'output-available') {
                                                const sheetData = toolInvocation.output as any[][];
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
                                        if (toolName === 'askForConfirmation') {
                                            if (toolInvocation.state === 'output-available') {
                                                return <div key={toolCallId} className="mt-2 text-sm text-gray-500">Action {toolInvocation.output === 'Yes' ? 'Confirmed' : 'Cancelled'}</div>
                                            }
                                            if (toolInvocation.state === 'input-available') {
                                                return (
                                                    <div key={toolCallId} className="mt-2 p-3 bg-white border rounded shadow-sm">
                                                        <p className="mb-2 text-gray-800 font-medium">{toolInvocation.input.message}</p>
                                                        <div className="flex gap-2">
                                                            <button
                                                                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                                                                onClick={() => addToolResult({ toolCallId, output: 'Yes' } as any)}
                                                            >
                                                                Yes
                                                            </button>
                                                            <button
                                                                className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300"
                                                                onClick={() => addToolResult({ toolCallId, output: 'No' } as any)}
                                                            >
                                                                No
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        }
                                        return null;
                                    })}
                                </div>
                            </div>
                        ))}
                    </>
                )}
                {status === 'submitted' || status === 'streaming' ? (
                    <div className="flex justify-start">
                        <div className="p-3 bg-white rounded-lg border shadow-sm">
                            <Loader2 className="animate-spin text-blue-600" size={20} />
                        </div>
                    </div>
                ) : null}
            </div>

            {error && (
                <div className="p-4 mx-4 mb-4 bg-red-50 text-red-600 rounded-lg border border-red-200 text-sm">
                    Error: {error.message || "Something went wrong"}
                </div>
            )}

            <div className="p-4 border-t border-gray-200 bg-white shadow-sm relative z-10">
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        const message = (localInput || '').trim();
                        if (!message) return;

                        if (sendMessage) {
                            setLocalInput('');
                            await sendMessage({ role: 'user', parts: [{ type: 'text', text: message }] });
                        }
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

