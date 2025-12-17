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
        <div className="mt-2 mb-2 overflow-x-auto rounded-lg border-2 border-slate-200 shadow-inner">
            <table className="min-w-full text-xs border-collapse">
                <tbody>
                    {data.map((row, r) => (
                        <tr key={r} className={r % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            {row.map((cell, c) => (
                                <td key={c} className="border border-slate-200 px-3 py-2 text-slate-700 font-medium">
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
        <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-10">
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
                    <Terminal size={40} className="text-white" strokeWidth={2.5} />
                </div>
            </div>
            <div className="space-y-3">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    Welcome to AI Chat
                </h1>
                <p className="text-slate-600 max-w-md text-lg font-medium">
                    I can help you analyze data, answer questions, and manage your threads.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl w-full">
                <button
                    onClick={() => onExampleClick("Analyze the spreadsheet data")}
                    className="p-6 bg-white border-2 border-slate-200 rounded-2xl hover:border-blue-400 hover:shadow-xl transition-all duration-300 text-left group transform hover:scale-[1.02] hover:-translate-y-1 relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mb-4 group-hover:from-blue-200 group-hover:to-blue-300 transition-colors">
                            <MessageSquare size={24} className="text-blue-600" />
                        </div>
                        <div className="font-bold text-lg text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">Analyze Data</div>
                        <div className="text-sm text-slate-600 group-hover:text-slate-700">Read and summarize the spreadsheet</div>
                    </div>
                </button>
                <button
                    onClick={() => onExampleClick("What is the weather in Tokyo?")}
                    className="p-6 bg-white border-2 border-slate-200 rounded-2xl hover:border-blue-400 hover:shadow-xl transition-all duration-300 text-left group transform hover:scale-[1.02] hover:-translate-y-1 relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-100 to-cyan-200 rounded-xl flex items-center justify-center mb-4 group-hover:from-cyan-200 group-hover:to-cyan-300 transition-colors">
                            <ArrowRight size={24} className="text-cyan-600" />
                        </div>
                        <div className="font-bold text-lg text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">Check Weather</div>
                        <div className="text-sm text-slate-600 group-hover:text-slate-700">Get real-time weather info</div>
                    </div>
                </button>
                <button
                    onClick={() => onExampleClick("Write 'Test' to cell A1")}
                    className="p-6 bg-white border-2 border-slate-200 rounded-2xl hover:border-blue-400 hover:shadow-xl transition-all duration-300 text-left group transform hover:scale-[1.02] hover:-translate-y-1 relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center mb-4 group-hover:from-green-200 group-hover:to-green-300 transition-colors">
                            <Terminal size={24} className="text-green-600" />
                        </div>
                        <div className="font-bold text-lg text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">Update Sheet</div>
                        <div className="text-sm text-slate-600 group-hover:text-slate-700">Modify spreadsheet values</div>
                    </div>
                </button>
                <button
                    onClick={() => onExampleClick("Write a haiku about TypeScript")}
                    className="p-6 bg-white border-2 border-slate-200 rounded-2xl hover:border-blue-400 hover:shadow-xl transition-all duration-300 text-left group transform hover:scale-[1.02] hover:-translate-y-1 relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center mb-4 group-hover:from-purple-200 group-hover:to-purple-300 transition-colors">
                            <MessageSquare size={24} className="text-purple-600" />
                        </div>
                        <div className="font-bold text-lg text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">Creative Writing</div>
                        <div className="text-sm text-slate-600 group-hover:text-slate-700">Generate poems or stories</div>
                    </div>
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
        messages: initialMessages,
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
        <div className="flex flex-col h-full max-w-4xl mx-auto w-full relative">
            <TableDialog
                isOpen={isTableOpen}
                onClose={() => setIsTableOpen(false)}
                data={tableData || []}
                onInsertReference={(ref) => {
                    const newValue = `${localInput || ''} ${ref}`.trim();
                    setLocalInput(newValue);
                }}
            />
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white" ref={scrollRef}>
                {messages.length === 0 ? (
                    <WelcomeScreen onExampleClick={(text) => {
                        setLocalInput(text);
                        sendMessage({ role: 'user', parts: [{ type: 'text', text }] });
                    }} />
                ) : (
                    <>
                        {messages.map((m: any) => (
                            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                                <div
                                    className={`max-w-[80%] p-4 rounded-2xl shadow-lg ${m.role === 'user'
                                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                                        : 'bg-white text-slate-800 border-2 border-slate-200'
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
                                                    <div key={toolCallId} className="mt-3 text-sm">
                                                        <div className="text-slate-600 mb-3 font-semibold">Spreadsheet Data:</div>
                                                        {renderTablePreview(sheetData)}
                                                        <button
                                                            onClick={() => {
                                                                setTableData(sheetData);
                                                                setIsTableOpen(true);
                                                            }}
                                                            className="mt-3 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white border border-green-600 rounded-xl hover:from-green-600 hover:to-emerald-600 flex items-center gap-2 shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] font-medium"
                                                        >
                                                            <span className="text-sm">View Full Table</span>
                                                        </button>
                                                    </div>
                                                );
                                            }
                                            return <div key={toolCallId} className="mt-2 text-xs text-slate-500 italic">Reading sheet...</div>
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
                    <div className="flex justify-start mb-4">
                        <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-lg">
                            <Loader2 className="animate-spin text-blue-600" size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                ) : null}
            </div>

            {error && (
                <div className="p-4 mx-4 mb-4 bg-red-50 text-red-600 rounded-lg border border-red-200 text-sm">
                    Error: {error.message || "Something went wrong"}
                </div>
            )}

            <div className="p-5 border-t-2 border-slate-200 bg-gradient-to-b from-white to-slate-50/50 shadow-2xl relative z-10 backdrop-blur-sm">
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
                    className="flex gap-3"
                    noValidate
                >
                    <input
                        type="text"
                        className="flex-1 p-4 border-2 border-slate-300 bg-white text-slate-900 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-500 placeholder:text-slate-400 shadow-inner font-medium transition-all"
                        value={localInput}
                        onChange={(e) => setLocalInput(e.target.value)}
                        placeholder="Type a message..."
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 disabled:transform-none"
                        disabled={status === 'streaming' || !localInput || !localInput.trim()}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}

