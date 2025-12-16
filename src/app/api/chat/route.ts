import { streamText, convertToCoreMessages, tool } from "ai";
import { createAzure } from "@ai-sdk/azure";
import { saveMessage, getThread, createThread, deleteThread } from "@/lib/db-queries";
import { getSheetData, updateCell } from "@/lib/xlsx";
import { z } from "zod";

export const maxDuration = 30;

// Initialize Azure OpenAI provider
const azureProvider = createAzure({
    apiKey: process.env.AZURE_OPENAI_API_KEY!,
    resourceName: process.env.AZURE_OPENAI_RESOURCE_NAME!,
});

export async function POST(req: Request) {
    const { messages, threadId } = await req.json();

    const coreMessages = convertToCoreMessages(messages);

    // Save user message
    const userMessage = messages[messages.length - 1];
    if (threadId && userMessage) {
        // Check if thread exists, create if not
        const thread = getThread(threadId);
        if (!thread) {
            const title = String(userMessage.content).slice(0, 30) || "New Chat";
            createThread(threadId, title);
        }

        saveMessage({
            id: userMessage.id,
            threadId,
            role: 'user',
            content: userMessage.content,
        });
    }

    const result = await streamText({
        model: azureProvider(process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o"),
        messages: coreMessages,
        tools: {
            getWeather: tool({
                description: 'Get the weather for a location',
                parameters: z.object({
                    location: z.string(),
                }),
                execute: async ({ location }: { location: string }) => {
                    // Mock weather
                    return { location, temperature: 72, condition: "Sunny" };
                },
            } as any),
            askForConfirmation: tool({
                description: 'Ask the user for confirmation before performing a dangerous action (e.g. updating data, deleting threads).',
                parameters: z.object({
                    message: z.string().describe('The question to ask the user'),
                }),
                execute: async ({ message }: { message: string }) => {
                    return { message };
                },
            } as any),
            readSheet: tool({
                description: 'Read the contents of the Excel sheet. Can read specific range.',
                parameters: z.object({
                    range: z.string().optional().describe('Range to read, e.g. "A1:B5" or "Sheet1!A1"'),
                }),
                execute: async ({ range }: { range?: string }) => {
                    return getSheetData(range);
                },
            } as any),
            updateCell: tool({
                description: 'Update a cell in the Excel sheet. DANGEROUS: Requires confirmation first.',
                parameters: z.object({
                    cell: z.string().describe('Cell address, e.g. "B2"'),
                    value: z.union([z.string(), z.number()]).describe('New value'),
                }),
                execute: async ({ cell, value }: { cell: string, value: string | number }) => {
                    return updateCell(cell, value);
                },
            } as any),
            deleteThread: tool({
                description: 'Delete the current thread. DANGEROUS: Requires confirmation first.',
                parameters: z.object({}),
                execute: async () => {
                    if (threadId) {
                        deleteThread(threadId);
                        return { success: true };
                    }
                    return { success: false, error: "No thread ID" };
                },
            } as any),
        },
        system: `You are a helpful assistant. You have access to a spreadsheet. 
        When asked to modify the spreadsheet (updateCell) or delete data (deleteThread), you MUST FIRST use the 'askForConfirmation' tool to ask the user if they are sure. 
        Only after the user explicitly confirms (you will see a tool result "Yes"), should you proceed to call the dangerous tool.`,
        onFinish: async ({ response }) => {
            if (threadId) {
                // Save assistant message
                // Note: Response messages can be multiple (text, tool calls). 
                // For simplicity we save the text content. 
                // In a real app we might need to handle tool calls storing.
                const textContent = response.messages.find(m => m.role === 'assistant')?.content;
                if (textContent && typeof textContent === 'string') { // check if it is string, it can be array content
                    // Generate an ID for the assistant message
                    const id = crypto.randomUUID();
                    saveMessage({
                        id,
                        threadId,
                        role: 'assistant',
                        content: textContent,
                    });
                }
            }
        },
    });

    return (result as any).toDataStreamResponse();
}
