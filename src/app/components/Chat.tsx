'use client';

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState, useMemo, type ReactElement } from "react";
import { Loader2, Terminal, MessageSquare, ArrowRight, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
// Types workarounds
type Message = any;
type ToolInvocation = any;
import { useRouter, usePathname } from "next/navigation";
import { TableDialog } from "./TableDialog";
import { getCachedSpreadsheetData } from "@/lib/spreadsheet-cache";

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
        <div className="flex flex-col items-center justify-center h-full text-center p-4 md:p-8 space-y-6 md:space-y-10">
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-4 md:p-6 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
                    <Terminal size={32} className="text-white md:w-10 md:h-10" strokeWidth={2.5} />
                </div>
            </div>
            <div className="space-y-2 md:space-y-3">
                <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    Welcome to AI Chat
                </h1>
                <p className="text-slate-600 max-w-md text-base md:text-lg font-medium">
                    I can help you analyze data, answer questions, and manage your threads.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5 max-w-2xl w-full">
                <button
                    onClick={() => onExampleClick("Analyze the spreadsheet data")}
                    className="p-4 md:p-6 bg-white border-2 border-slate-200 rounded-2xl hover:border-blue-400 hover:shadow-xl transition-all duration-300 text-left group transform hover:scale-[1.02] hover:-translate-y-1 relative overflow-hidden"
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
                    className="p-4 md:p-6 bg-white border-2 border-slate-200 rounded-2xl hover:border-blue-400 hover:shadow-xl transition-all duration-300 text-left group transform hover:scale-[1.02] hover:-translate-y-1 relative overflow-hidden"
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
                    className="p-4 md:p-6 bg-white border-2 border-slate-200 rounded-2xl hover:border-blue-400 hover:shadow-xl transition-all duration-300 text-left group transform hover:scale-[1.02] hover:-translate-y-1 relative overflow-hidden"
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
                    className="p-4 md:p-6 bg-white border-2 border-slate-200 rounded-2xl hover:border-blue-400 hover:shadow-xl transition-all duration-300 text-left group transform hover:scale-[1.02] hover:-translate-y-1 relative overflow-hidden"
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
    const [persistentTableData, setPersistentTableData] = useState<any[][] | null>(null);

    // Ensure we have a stable threadId even if props.id is not provided
    const [generatedId] = useState(() => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).substring(7));
    const threadId = id || generatedId;

    // Use useChat from @ai-sdk/react. 
    // Note: In this version (v2+ / ai v5), useChat helpers are reduced.
    // We must manage input state manually and use sendMessage.
    const { messages, status, addToolResult, sendMessage, error } = useChat({
        id: threadId,
        api: '/api/chat',
        messages: initialMessages,
        maxSteps: 10,
        body: { threadId },
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
        
        messages.forEach((m: any, idx: number) => {
            if (m.parts) {
                m.parts.forEach((part: any) => {
                    if (part.type?.startsWith('tool-')) {
                        console.log(`Message ${idx} - ${part.type} tool:`, {
                            state: part.state,
                            toolCallId: part.toolCallId,
                            input: part.input,
                            output: part.output,
                            result: part.result
                        });
                    }
                });
            }
        });
    }, [messages, status, error]);

    // Watch messages for readSheet tool outputs and persist table data
    useEffect(() => {
        try {
            for (const m of messages) {
                const parts = m.parts || [];
                for (const part of parts) {
                    if (!part.type?.startsWith('tool-')) continue;
                    const toolName = part.type.replace('tool-', '');
                    const toolPart = part as any;
                    if (toolName === 'readSheet' && toolPart.state === 'output-available') {
                        const sheetData = toolPart.output as any[][];
                        if (!sheetData) continue;
                        const currentJson = persistentTableData ? JSON.stringify(persistentTableData) : null;
                        const newJson = JSON.stringify(sheetData);
                        if (currentJson !== newJson) {
                            setPersistentTableData(sheetData);
                        }
                        return;
                    }
                }
            }
        } catch (e) {
            console.error('Error while extracting readSheet output from messages:', e);
        }
    }, [messages, persistentTableData]);

    const scrollRef = useRef<HTMLDivElement>(null);

    // No need to sync input from hook anymore as we manage it locally

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (initialMessages.length > 0 && !persistentTableData) {
            let foundData = false;
            for (const msg of initialMessages) {
                if (msg.role === 'assistant' && msg.content) {
                    const spreadsheetMatch = msg.content.match(/<!-- SPREADSHEET_DATA:(.+?) -->/);
                    if (spreadsheetMatch) {
                        try {
                            const data = JSON.parse(spreadsheetMatch[1]);
                            if (Array.isArray(data) && data.length > 0) {
                                setPersistentTableData(data);
                                setTableData(data);
                                foundData = true;
                                break;
                            }
                        } catch (e) {
                            console.error('Failed to parse stored spreadsheet data:', e);
                        }
                    }
                }
            }
            if (!foundData && threadId) {
                const cachedData = getCachedSpreadsheetData(threadId);
                if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
                    setPersistentTableData(cachedData);
                    setTableData(cachedData);
                }
            }
        }
    }, [initialMessages, threadId]);

    const allMessages = useMemo(() => {
        const initialOnly = initialMessages.filter((m: any) => !messages.find((msg: any) => msg.id === m.id));
        return [...initialOnly, ...messages];
    }, [initialMessages, messages]);

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
                {messages.length === 0 && initialMessages.length === 0 ? (
                    <WelcomeScreen onExampleClick={(text) => {
                        setLocalInput(text);
                        sendMessage({ role: 'user', parts: [{ type: 'text', text }] });
                    }} />
                ) : (
                    <>
                        {persistentTableData && messages.length === 0 && initialMessages.length > 0 && (
                            <div className="mb-4 p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-lg">
                                <div className="text-slate-600 mb-3 font-semibold">Spreadsheet Data:</div>
                                {renderTablePreview(persistentTableData)}
                                <button
                                    onClick={() => {
                                        setTableData(persistentTableData);
                                        setIsTableOpen(true);
                                    }}
                                    className="mt-3 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white border border-green-600 rounded-xl hover:from-green-600 hover:to-emerald-600 flex items-center gap-2 shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] font-medium"
                                >
                                    <span className="text-sm">View Full Table</span>
                                </button>
                            </div>
                        )}
                        {allMessages.map((m: any) => {
                            if (!m || !m.role) return null;
                            
                            const textParts = m.parts?.filter((p: any) => p.type === 'text') || [];
                            const toolParts = m.parts?.filter((p: any) => p.type?.startsWith('tool-')) || [];
                            
                            let messageContent = '';
                            let storedSpreadsheetData: any[][] | null = null;
                            
                            if (typeof m.content === 'string' && m.content) {
                                const spreadsheetMatch = m.content.match(/<!-- SPREADSHEET_DATA:(.+?) -->/);
                                if (spreadsheetMatch) {
                                    try {
                                        storedSpreadsheetData = JSON.parse(spreadsheetMatch[1]);
                                        messageContent = m.content.replace(/<!-- SPREADSHEET_DATA:.+? -->/g, '').trim();
                                    } catch (e) {
                                        messageContent = m.content;
                                    }
                                } else {
                                    messageContent = m.content;
                                }
                            }
                            
                            const hasTextContent = textParts.length > 0 || messageContent.length > 0;
                            const hasToolContent = toolParts.length > 0;
                            const hasContent = hasTextContent || hasToolContent || storedSpreadsheetData;
                            
                            if (!hasContent && m.role === 'assistant') {
                                return null;
                            }
                            
                            return (
                            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                                <div
                                    className={`max-w-[80%] p-4 rounded-2xl shadow-lg ${m.role === 'user'
                                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                                        : 'bg-white text-slate-800 border-2 border-slate-200'
                                        }`}
                                >
                                    {(textParts.length > 0 || messageContent) && (
                                        <div className="whitespace-pre-wrap mb-2">
                                            {textParts.length > 0 ? (
                                                textParts.map((part: any, idx: number) => (
                                                    <span key={idx}>{part.text}</span>
                                                ))
                                            ) : (
                                                <span>{messageContent}</span>
                                            )}
                                        </div>
                                    )}
                                    {storedSpreadsheetData && (
                                        <div className="mt-3 text-sm">
                                            <div className="text-slate-600 mb-3 font-semibold">Spreadsheet Data:</div>
                                            {renderTablePreview(storedSpreadsheetData)}
                                            <button
                                                onClick={() => {
                                                    setTableData(storedSpreadsheetData);
                                                    setIsTableOpen(true);
                                                }}
                                                className="mt-3 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white border border-green-600 rounded-xl hover:from-green-600 hover:to-emerald-600 flex items-center gap-2 shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] font-medium"
                                            >
                                                <span className="text-sm">View Full Table</span>
                                            </button>
                                        </div>
                                    )}
                                    <div className="space-y-2">
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
                                                const output = toolInvocation.output;
                                                const input = toolInvocation.input;
                                                console.log('askForConfirmation tool:', { output, input, state: toolInvocation.state, outputType: typeof output });
                                                
                                                const userResponse = output && (typeof output === 'string' ? output : (output?.output || output?.result));
                                                const isConfirmed = userResponse === 'Yes' || userResponse === true;
                                                const isCancelled = userResponse === 'No' || userResponse === false;
                                                
                                                const hasError = output && (output?.error || (typeof output === 'string' && output.toLowerCase().includes('error')));
                                                const shouldShowConfirmation = input && !isConfirmed && !isCancelled && !hasError;
                                                
                                                if (shouldShowConfirmation) {
                                                    const action = input?.action || output?.action || 'this action';
                                                    const description = input?.message || output?.message || 'Are you sure you want to proceed?';
                                                    
                                                    return (
                                                        <div key={toolCallId} className="mt-3 first:mt-0">
                                                            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl shadow-sm">
                                                                <div className="flex items-start gap-3 mb-4">
                                                                    <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                                                                        <AlertTriangle size={20} className="text-amber-600" strokeWidth={2.5} />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className="font-bold text-base text-slate-800 mb-1">Confirmation Required</h4>
                                                                        <p className="text-slate-700 text-sm mb-2">{description}</p>
                                                                        <div className="text-xs text-slate-600 bg-white/80 px-2.5 py-1.5 rounded-md border border-amber-200">
                                                                            <span className="font-semibold">Action:</span> <span className="font-mono">{action}</span>
                                                                        </div>
                                                                        {output?.error && (
                                                                            <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                                                                {output.error}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        onClick={async () => {
                                                                            try {
                                                                                console.log('Adding tool result Yes for toolCallId:', toolCallId, 'Tool invocation:', toolInvocation);
                                                                                const toolName = toolInvocation.input?.toolName;
                                                                                const toolParamsJson = toolInvocation.input?.toolParamsJson;
                                                                                console.log('Will execute tool:', toolName, 'with params:', toolParamsJson);
                                                                                
                                                                                console.log('Before addToolResult - status:', status, 'toolCallId:', toolCallId);
                                                                                try {
                                                                                    await addToolResult({ toolCallId, result: 'Yes' } as any);
                                                                                    console.log('addToolResult called successfully');
                                                                                    console.log('After addToolResult - status:', status);
                                                                                    
                                                                                    const toolParams = JSON.parse(toolParamsJson || '{}');
                                                                                    let followUpText = '';
                                                                                    if (toolName === 'updateCell') {
                                                                                        followUpText = `I confirm. Please proceed with updating cell ${toolParams.cell} to ${toolParams.value}.`;
                                                                                    } else if (toolName === 'updateRange') {
                                                                                        followUpText = `I confirm. Please proceed with updating range ${toolParams.range}.`;
                                                                                    } else if (toolName === 'updateCells') {
                                                                                        followUpText = `I confirm. Please proceed with updating the cells.`;
                                                                                    } else if (toolName === 'deleteThread') {
                                                                                        followUpText = `I confirm. Please proceed with deleting the thread.`;
                                                                                    }
                                                                                    if (followUpText && sendMessage) {
                                                                                        setTimeout(() => {
                                                                                            sendMessage({ role: 'user', parts: [{ type: 'text', text: followUpText }] });
                                                                                        }, 100);
                                                                                    }
                                                                                } catch (err) {
                                                                                    console.error('addToolResult failed:', err);
                                                                                }
                                                                            } catch (error) {
                                                                                console.error('Error adding tool result:', error);
                                                                            }
                                                                        }}
                                                                        disabled={status === 'streaming' || status === 'submitted'}
                                                                    >
                                                                        <CheckCircle2 size={16} />
                                                                        Confirm
                                                                    </button>
                                                                    <button
                                                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        onClick={async () => {
                                                                            try {
                                                                                await addToolResult({ toolCallId, result: 'No' } as any);
                                                                            } catch (error) {
                                                                                console.error('Error adding tool result:', error);
                                                                            }
                                                                        }}
                                                                        disabled={status === 'streaming' || status === 'submitted'}
                                                                    >
                                                                        <XCircle size={16} />
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                
                                                if (isConfirmed || isCancelled) {
                                                    return (
                                                        <div key={toolCallId} className="mt-2 first:mt-0">
                                                            <div className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg text-sm">
                                                                {isConfirmed ? (
                                                                    <>
                                                                        <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
                                                                        <span className="text-green-700 font-medium">Action confirmed</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <XCircle size={16} className="text-red-600 flex-shrink-0" />
                                                                        <span className="text-red-700 font-medium">Action cancelled</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }
                                            if (toolInvocation.state === 'input-available') {
                                                const action = toolInvocation.input.action || 'this action';
                                                const description = toolInvocation.input.message || 'Are you sure you want to proceed?';
                                                
                                                return (
                                                    <div key={toolCallId} className="mt-3 p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl shadow-lg">
                                                        <div className="flex items-start gap-3 mb-4">
                                                            <div className="p-2 bg-amber-100 rounded-lg">
                                                                <AlertTriangle size={24} className="text-amber-600" strokeWidth={2.5} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h4 className="font-bold text-lg text-slate-800 mb-1">Confirmation Required</h4>
                                                                <p className="text-slate-700 font-medium mb-2">{description}</p>
                                                                <div className="text-sm text-slate-600 bg-white/60 px-3 py-2 rounded-lg border border-amber-200">
                                                                    <span className="font-semibold">Action:</span> {action}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <button
                                                                className="flex-1 px-5 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 shadow-md hover:shadow-lg transition-all transform hover:scale-105 active:scale-95 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                onClick={async () => {
                                                                    try {
                                                                        await addToolResult({ toolCallId, result: 'Yes' } as any);
                                                                    } catch (error) {
                                                                        console.error('Error adding tool result:', error);
                                                                    }
                                                                }}
                                                                disabled={status === 'streaming' || status === 'submitted'}
                                                            >
                                                                <CheckCircle2 size={18} />
                                                                Confirm
                                                            </button>
                                                            <button
                                                                className="flex-1 px-5 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg transition-all transform hover:scale-105 active:scale-95 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                onClick={async () => {
                                                                    try {
                                                                        await addToolResult({ toolCallId, result: 'No' } as any);
                                                                    } catch (error) {
                                                                        console.error('Error adding tool result:', error);
                                                                    }
                                                                }}
                                                                disabled={status === 'streaming' || status === 'submitted'}
                                                            >
                                                                <XCircle size={18} />
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        }
                                        if (toolName === 'updateCell') {
                                            if (toolInvocation.state === 'output-available') {
                                                const output = toolInvocation.output;
                                                if (output.success) {
                                                    return (
                                                        <div key={toolCallId} className="mt-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                                                            <div className="flex items-center gap-2 text-green-700 font-medium">
                                                                <CheckCircle2 size={18} />
                                                                <span>Cell {output.cell} updated to: {String(output.value)}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                } else if (output.requiresConfirmation) {
                                                    return (
                                                        <div key={toolCallId} className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl">
                                                            <div className="flex items-center gap-2 text-amber-700 font-medium">
                                                                <AlertTriangle size={18} />
                                                                <span>{output.error || "Confirmation required before executing this action."}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <div key={toolCallId} className="mt-3 p-3 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl">
                                                            <div className="flex items-center gap-2 text-red-700 font-medium">
                                                                <XCircle size={18} />
                                                                <span>Error: {output.error || "Failed to update cell"}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            }
                                            return <div key={toolCallId} className="mt-2 text-xs text-slate-500 italic">Updating cell...</div>;
                                        }
                                        if (toolName === 'updateRange') {
                                            if (toolInvocation.state === 'output-available') {
                                                const output = toolInvocation.output;
                                                if (output.success) {
                                                    return (
                                                        <div key={toolCallId} className="mt-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                                                            <div className="flex items-center gap-2 text-green-700 font-medium">
                                                                <CheckCircle2 size={18} />
                                                                <span>Range {output.range} updated successfully ({output.cellsUpdated} cells)</span>
                                                            </div>
                                                        </div>
                                                    );
                                                } else if (output.requiresConfirmation) {
                                                    return (
                                                        <div key={toolCallId} className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl">
                                                            <div className="flex items-center gap-2 text-amber-700 font-medium">
                                                                <AlertTriangle size={18} />
                                                                <span>{output.error || "Confirmation required before executing this action."}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <div key={toolCallId} className="mt-3 p-3 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl">
                                                            <div className="flex items-center gap-2 text-red-700 font-medium">
                                                                <XCircle size={18} />
                                                                <span>Error: {output.error || "Failed to update range"}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            }
                                            return <div key={toolCallId} className="mt-2 text-xs text-slate-500 italic">Updating range...</div>;
                                        }
                                        if (toolName === 'updateCells') {
                                            if (toolInvocation.state === 'output-available') {
                                                const output = toolInvocation.output;
                                                if (output.success) {
                                                    return (
                                                        <div key={toolCallId} className="mt-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                                                            <div className="flex items-center gap-2 text-green-700 font-medium">
                                                                <CheckCircle2 size={18} />
                                                                <span>Updated {output.cellsUpdated} cell(s) successfully</span>
                                                            </div>
                                                            {output.updates && output.updates.length > 0 && (
                                                                <div className="mt-2 text-sm text-green-600">
                                                                    {output.updates.map((u: any, idx: number) => (
                                                                        <div key={idx} className="font-mono text-xs">
                                                                            {u.cell}: {String(u.value)}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                } else if (output.requiresConfirmation) {
                                                    return (
                                                        <div key={toolCallId} className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl">
                                                            <div className="flex items-center gap-2 text-amber-700 font-medium">
                                                                <AlertTriangle size={18} />
                                                                <span>{output.error || "Confirmation required before executing this action."}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <div key={toolCallId} className="mt-3 p-3 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl">
                                                            <div className="flex items-center gap-2 text-red-700 font-medium">
                                                                <XCircle size={18} />
                                                                <span>Error: {output.error || "Failed to update cells"}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            }
                                            return <div key={toolCallId} className="mt-2 text-xs text-slate-500 italic">Updating cells...</div>;
                                        }
                                        if (toolName === 'deleteThread') {
                                            if (toolInvocation.state === 'output-available') {
                                                const output = toolInvocation.output;
                                                if (output.success) {
                                                    return (
                                                        <div key={toolCallId} className="mt-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                                                            <div className="flex items-center gap-2 text-green-700 font-medium">
                                                                <CheckCircle2 size={18} />
                                                                <span>Thread deleted successfully</span>
                                                            </div>
                                                        </div>
                                                    );
                                                } else if (output.requiresConfirmation) {
                                                    return (
                                                        <div key={toolCallId} className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl">
                                                            <div className="flex items-center gap-2 text-amber-700 font-medium">
                                                                <AlertTriangle size={18} />
                                                                <span>{output.error || "Confirmation required before deleting this thread."}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <div key={toolCallId} className="mt-3 p-3 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl">
                                                            <div className="flex items-center gap-2 text-red-700 font-medium">
                                                                <XCircle size={18} />
                                                                <span>Error: {output.error || "Failed to delete thread"}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            }
                                            return <div key={toolCallId} className="mt-2 text-xs text-slate-500 italic">Deleting thread...</div>;
                                        }
                                        return null;
                                    })}
                                    </div>
                                </div>
                            </div>
                            );
                        })}
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

            <div className="p-3 md:p-5 border-t-2 border-slate-200 bg-gradient-to-b from-white to-slate-50/50 shadow-2xl relative z-10 backdrop-blur-sm">
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
                    className="flex gap-2 md:gap-3"
                    noValidate
                >
                    <input
                        type="text"
                        className="flex-1 p-3 md:p-4 border-2 border-slate-300 bg-white text-slate-900 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-500 placeholder:text-slate-400 shadow-inner font-medium transition-all"
                        value={localInput}
                        onChange={(e) => setLocalInput(e.target.value)}
                        placeholder="Type a message..."
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="px-4 py-3 md:px-8 md:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 disabled:transform-none"
                        disabled={status === 'streaming' || !localInput || !localInput.trim()}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}

