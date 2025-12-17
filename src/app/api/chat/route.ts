import { streamText, tool, convertToModelMessages } from "ai";
import { createAzure } from "@ai-sdk/azure";
import { saveMessage, getThread, createThread, deleteThread } from "@/lib/db-queries";
import { getSheetData, updateCell } from "@/lib/xlsx";
import { z } from "zod";

export const maxDuration = 30;

const endpoint = process.env.AZURE_OPENAI_ENDPOINT || '';
const resourceName = endpoint.replace('https://', '').split('.')[0];

const azureProvider = createAzure({
    apiKey: process.env.AZURE_OPENAI_API_KEY!,
    resourceName: resourceName,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION!,
});

export async function POST(req: Request) {
    try {
        const { messages, threadId } = await req.json();

        console.log("Processing chat request. Thread:", threadId);

        console.log("Messages received:", JSON.stringify(messages));

        const modelMessages = convertToModelMessages(messages);
        console.log("Model messages:", JSON.stringify(modelMessages));

        // Save user message
        const userMessage = messages[messages.length - 1];
        if (threadId && userMessage) {
            // Ensure message has an ID; generate one if missing to avoid DB constraint errors
            const messageId = userMessage.id ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`);

            // Extract text content from parts array
            const textParts = userMessage.parts?.filter((p: any) => p.type === 'text') || [];
            const content = textParts.map((p: any) => p.text).join('');

            // Check if thread exists, create if not
            const thread = getThread(threadId);
            if (!thread) {
                const title = content.slice(0, 30) || "New Chat";
                createThread(threadId, title);
            }

            saveMessage({
                id: messageId,
                threadId,
                role: 'user',
                content,
            });
        }

        const result = await streamText({
            model: azureProvider(process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o"),
            messages: modelMessages,
            tools: {
                getWeather: tool({
                    description: 'Get the weather for a location',
                    inputSchema: z.object({
                        location: z.string(),
                    }),
                    execute: async ({ location }) => {
                        return { location, temperature: 72, condition: "Sunny" };
                    },
                }),
                askForConfirmation: tool({
                    description: 'Ask the user for confirmation before performing a dangerous action (e.g. updating data, deleting threads).',
                    inputSchema: z.object({
                        message: z.string().describe('The question to ask the user'),
                    }),
                    execute: async ({ message }) => {
                        return { message };
                    },
                }),
                readSheet: tool({
                    description: 'Read the contents of the Excel sheet. Can read specific range.',
                    inputSchema: z.object({
                        range: z.string().optional().describe('Range to read, e.g. "A1:B5" or "Sheet1!A1"'),
                    }),
                    execute: async ({ range }) => {
                        return getSheetData(range);
                    },
                }),
                updateCell: tool({
                    description: 'Update a cell in the Excel sheet. DANGEROUS: Requires confirmation first.',
                    inputSchema: z.object({
                        cell: z.string().describe('Cell address, e.g. "B2"'),
                        value: z.union([z.string(), z.number()]).describe('New value'),
                    }),
                    execute: async ({ cell, value }) => {
                        return updateCell(cell, value);
                    },
                }),
                deleteThread: tool({
                    description: 'Delete the current thread. DANGEROUS: Requires confirmation first.',
                    inputSchema: z.object({}),
                    execute: async () => {
                        if (threadId) {
                            deleteThread(threadId);
                            return { success: true };
                        }
                        return { success: false, error: "No thread ID" };
                    },
                }),
            },
            system: `You are a helpful assistant. You have access to a spreadsheet. 
        When asked to modify the spreadsheet (updateCell) or delete data (deleteThread), you MUST FIRST use the 'askForConfirmation' tool to ask the user if they are sure. 
        Only after the user explicitly confirms (you will see a tool result "Yes"), should you proceed to call the dangerous tool.`,
            onFinish: async ({ response }) => {
                if (threadId) {
                    const assistantMessage = response.messages.find(m => m.role === 'assistant');
                    if (assistantMessage) {
                        let content = '';
                        if (typeof assistantMessage.content === 'string') {
                            content = assistantMessage.content;
                        } else if (Array.isArray(assistantMessage.content)) {
                            const textParts = assistantMessage.content.filter((p: any) => p.type === 'text');
                            content = textParts.map((p: any) => p.text).join('');
                        }
                        
                        if (content) {
                            const id = crypto.randomUUID();
                            saveMessage({
                                id,
                                threadId,
                                role: 'assistant',
                                content,
                            });
                        }
                    }
                }
            },
        });

        return result.toUIMessageStreamResponse();
    } catch (error: any) {
        console.error("API ROUTE ERROR:", error);
        
        let errorMessage = "Internal Server Error";
        let errorDetails = String(error);
        
        if (error?.message?.includes("API version not supported") || error?.responseBody?.includes("API version not supported")) {
            errorMessage = "API version not supported";
            const currentVersion = process.env.AZURE_OPENAI_API_VERSION;
            errorDetails = `Your Azure OpenAI resource doesn't support API version '${currentVersion}'. Update AZURE_OPENAI_API_VERSION environment variable and restart with: docker compose restart`;
        }
        
        return new Response(JSON.stringify({ error: errorMessage, details: errorDetails }), { status: 500 });
    }
}
