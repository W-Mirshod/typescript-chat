import { streamText, tool, convertToModelMessages } from "ai";
import { createAzure } from "@ai-sdk/azure";
import { saveMessage, getThread, createThread, deleteThread } from "@/lib/db-queries";
import { getSheetData, updateCell, updateRange, updateCells } from "@/lib/xlsx";
import { storeConfirmation, getConfirmation, clearConfirmation, approveConfirmation } from "@/lib/confirmations";
import { cacheSpreadsheetData, getCachedSpreadsheetData } from "@/lib/spreadsheet-cache";
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
        const { messages, threadId: providedThreadId } = await req.json();

        let threadId = providedThreadId;
        
        if (!threadId) {
            // Fallback: Use the ID of the FIRST message if available. 
            // Using the last message ID (messages[messages.length-1]) causes the threadId to change 
            // with every new message, breaking session persistence for confirmations.
            const firstMessage = messages[0];
            if (firstMessage?.id) {
                threadId = firstMessage.id;
            } else {
                threadId = typeof crypto !== 'undefined' && 'randomUUID' in crypto 
                    ? crypto.randomUUID() 
                    : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
            console.log("Generated fallback threadId:", threadId);
        }

        console.log("Processing chat request. Thread:", threadId);

        console.log("Messages received:", JSON.stringify(messages));

        // Check if user is confirming a pending action via text
        const lastUserMessage = messages[messages.length - 1];
        if (lastUserMessage?.role === 'user' && threadId) {
            const textParts = lastUserMessage.parts?.filter((p: any) => p.type === 'text') || [];
            const content = textParts.map((p: any) => p.text).join('').toLowerCase();
            
            const isConfirming = content.includes('confirm') || 
                                content.includes('yes') || 
                                content.includes('proceed') ||
                                content.includes('go ahead');
            
            if (isConfirming) {
                // Mark pending confirmations as approved
                const toolNames = ['updateCell', 'updateRange', 'updateCells', 'deleteThread'];
                for (const toolName of toolNames) {
                    const confirmation = getConfirmation(threadId, toolName);
                    if (confirmation) {
                        approveConfirmation(threadId, toolName);
                        console.log(`Approved confirmation for ${toolName} via text`);
                        break;
                    }
                }
            }
        }

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

            // Check if user is confirming or declining
            const isConfirming = content.toLowerCase().includes('confirm') || 
                                content.toLowerCase().includes('yes') || 
                                content.toLowerCase().includes('proceed') ||
                                content.toLowerCase().includes('go ahead');
            const isDeclining = content.toLowerCase().includes('decline') || 
                               content.toLowerCase().includes('cancel') || 
                               content.toLowerCase().includes('no') ||
                               (content.toLowerCase().includes('don\'t') && content.toLowerCase().includes('proceed'));

            if (isDeclining) {
                clearConfirmation(threadId, 'updateCell');
                clearConfirmation(threadId, 'updateRange');
                clearConfirmation(threadId, 'updateCells');
                clearConfirmation(threadId, 'deleteThread');
            }

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
            ...({ maxSteps: 10 } as any),
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
                    description: 'Ask the user for confirmation before performing a dangerous action (e.g. updating data, deleting threads). You MUST provide the action description and the tool name that will be called after confirmation.',
                    inputSchema: z.object({
                        message: z.string().describe('The question to ask the user'),
                        action: z.string().describe('Short action name, e.g. "Update cell A1" or "Delete thread"'),
                        toolName: z.string().describe('The tool name that will be called after confirmation (e.g. "updateCell" or "deleteThread")'),
                        toolParamsJson: z.string().describe('JSON string of parameters for the tool that will be called after confirmation. For updateCell: {"cell":"A1","value":100}. For deleteThread: "{}"'),
                    }),
                    execute: async ({ message, action, toolName, toolParamsJson }) => {
                        let toolParams: Record<string, any> = {};
                        try {
                            toolParams = JSON.parse(toolParamsJson || '{}');
                        } catch (e) {
                            console.error('Failed to parse toolParamsJson:', e);
                        }
                        if (!threadId) {
                            console.error('askForConfirmation: threadId is undefined');
                            return { 
                                message,
                                action,
                                requiresConfirmation: true,
                                toolName,
                                error: "Thread ID is missing. Confirmation cannot be stored.",
                            };
                        }
                        storeConfirmation(threadId, action, message, toolName, toolParams);
                        console.log(`Stored confirmation for ${toolName} with params:`, toolParams);
                        return { 
                            message,
                            action,
                            requiresConfirmation: true,
                            toolName,
                        };
                    },
                }),
                readSheet: tool({
                    description: 'Read the contents of the Excel sheet. Can read specific range.',
                    inputSchema: z.object({
                        range: z.string().optional().describe('Range to read, e.g. "A1:B5" or "Sheet1!A1"'),
                    }),
                    execute: async ({ range }) => {
                        const data = getSheetData(range);
                        if (threadId && Array.isArray(data) && data.length > 0) {
                            cacheSpreadsheetData(threadId, data);
                        }
                        return data;
                    },
                }),
                updateCell: tool({
                    description: 'Update a cell in the Excel sheet. DANGEROUS: Requires confirmation first via askForConfirmation.',
                    inputSchema: z.object({
                        cell: z.string().describe('Cell address, e.g. "B2"'),
                        value: z.union([z.string(), z.number()]).describe('New value'),
                    }),
                    execute: async ({ cell, value }) => {
                        try {
                            console.log(`[updateCell] Execution started for cell=${cell}, value=${value}`);
                            if (!threadId) {
                                console.error('[updateCell] threadId is undefined');
                                return { success: false, error: "No thread ID" };
                            }
                            
                            const confirmation = getConfirmation(threadId, 'updateCell');
                            console.log(`[updateCell] Checking confirmation. Found:`, JSON.stringify(confirmation, null, 2));
                            
                            if (!confirmation) {
                                return { 
                                    success: false, 
                                    error: "Confirmation required. Please use askForConfirmation first.",
                                    requiresConfirmation: true 
                                };
                            }
                            
                            if (!confirmation.approved) {
                                console.log('[updateCell] Confirmation not approved');
                                return { 
                                    success: false, 
                                    error: "Confirmation not yet approved. Waiting for user confirmation.",
                                    requiresConfirmation: true 
                                };
                            }
                            
                            // Loose equality check for value to handle string/number differences
                            if (confirmation.toolParams.cell !== cell || String(confirmation.toolParams.value) !== String(value)) {
                                console.log('[updateCell] Confirmation params mismatch:', { 
                                    stored: confirmation.toolParams, 
                                    requested: { cell, value } 
                                });
                                return { 
                                    success: false, 
                                    error: "Confirmation parameters do not match. Please request confirmation again.",
                                    requiresConfirmation: true 
                                };
                            }
                            
                            clearConfirmation(threadId, 'updateCell');
                            console.log('[updateCell] Calling lib updateCell...');
                            const result = updateCell(cell, value);
                            console.log('[updateCell] executed successfully:', result);
                            return { ...result, confirmed: true };
                        } catch (error: any) {
                            console.error('[updateCell] Error executing tool:', error);
                            return { success: false, error: `Internal error: ${error.message}` };
                        }
                    },
                }),
                updateRange: tool({
                    description: 'Update a range of cells in the Excel sheet. DANGEROUS: Requires confirmation first via askForConfirmation.',
                    inputSchema: z.object({
                        range: z.string().describe('Cell range, e.g. "A1:B5" or "Sheet1!A1:B5"'),
                        values: z.array(z.array(z.union([z.string(), z.number()]))).describe('2D array of values to write to the range'),
                    }),
                    execute: async ({ range, values }) => {
                        if (!threadId) {
                            console.error('updateRange: threadId is undefined');
                            return { success: false, error: "No thread ID" };
                        }
                        
                        const confirmation = getConfirmation(threadId, 'updateRange');
                        console.log(`Checking confirmation for updateRange. Found:`, confirmation);
                        if (!confirmation) {
                            return { 
                                success: false, 
                                error: "Confirmation required. Please use askForConfirmation first.",
                                requiresConfirmation: true 
                            };
                        }
                        
                        if (!confirmation.approved) {
                            return { 
                                success: false, 
                                error: "Confirmation not yet approved. Waiting for user confirmation.",
                                requiresConfirmation: true 
                            };
                        }
                        
                        const storedParams = confirmation.toolParams;
                        if (storedParams.range !== range || JSON.stringify(storedParams.values) !== JSON.stringify(values)) {
                            console.log('Confirmation params mismatch:', { 
                                stored: storedParams, 
                                requested: { range, values } 
                            });
                            return { 
                                success: false, 
                                error: "Confirmation parameters do not match. Please request confirmation again.",
                                requiresConfirmation: true 
                            };
                        }
                        
                        clearConfirmation(threadId, 'updateRange');
                        const result = updateRange(range, values);
                        console.log('updateRange executed successfully:', result);
                        return { ...result, confirmed: true };
                    },
                }),
                updateCells: tool({
                    description: 'Update multiple cells in the Excel sheet. DANGEROUS: Requires confirmation first via askForConfirmation.',
                    inputSchema: z.object({
                        updates: z.array(z.object({
                            cell: z.string().describe('Cell address, e.g. "A1"'),
                            value: z.union([z.string(), z.number()]).describe('New value for the cell'),
                        })).describe('Array of cell-value pairs to update'),
                    }),
                    execute: async ({ updates }) => {
                        if (!threadId) {
                            console.error('updateCells: threadId is undefined');
                            return { success: false, error: "No thread ID" };
                        }
                        
                        const confirmation = getConfirmation(threadId, 'updateCells');
                        console.log(`Checking confirmation for updateCells. Found:`, confirmation);
                        if (!confirmation) {
                            return { 
                                success: false, 
                                error: "Confirmation required. Please use askForConfirmation first.",
                                requiresConfirmation: true 
                            };
                        }
                        
                        if (!confirmation.approved) {
                            return { 
                                success: false, 
                                error: "Confirmation not yet approved. Waiting for user confirmation.",
                                requiresConfirmation: true 
                            };
                        }
                        
                        const storedParams = confirmation.toolParams;
                        if (JSON.stringify(storedParams.updates) !== JSON.stringify(updates)) {
                            console.log('Confirmation params mismatch:', { 
                                stored: storedParams, 
                                requested: { updates } 
                            });
                            return { 
                                success: false, 
                                error: "Confirmation parameters do not match. Please request confirmation again.",
                                requiresConfirmation: true 
                            };
                        }
                        
                        clearConfirmation(threadId, 'updateCells');
                        const result = updateCells(updates);
                        console.log('updateCells executed successfully:', result);
                        return { ...result, confirmed: true };
                    },
                }),
                deleteThread: tool({
                    description: 'Delete the current thread. DANGEROUS: Requires confirmation first via askForConfirmation.',
                    inputSchema: z.object({}),
                    execute: async () => {
                        if (!threadId) {
                            return { success: false, error: "No thread ID" };
                        }
                        
                        const confirmation = getConfirmation(threadId, 'deleteThread');
                        if (!confirmation) {
                            return { 
                                success: false, 
                                error: "Confirmation required. Please use askForConfirmation first.",
                                requiresConfirmation: true 
                            };
                        }
                        
                        if (!confirmation.approved) {
                            return { 
                                success: false, 
                                error: "Confirmation not yet approved. Waiting for user confirmation.",
                                requiresConfirmation: true 
                            };
                        }
                        
                        clearConfirmation(threadId, 'deleteThread');
                        deleteThread(threadId);
                        return { success: true, confirmed: true };
                    },
                }),
            },
            system: `You are a helpful assistant. You have access to a spreadsheet.

        WHEN ASKED TO ANALYZE, READ, OR VIEW SPREADSHEET DATA:
        - IMMEDIATELY use the readSheet tool to get the data
        - Provide direct analysis and insights based on the data
        - Do NOT ask questions or seek clarification - just provide the analysis
        - Show the data and explain what you find

        WHEN ASKED TO MODIFY DATA OR PERFORM DANGEROUS ACTIONS:
        IMPORTANT: Before asking for confirmation for any dangerous action, you MUST FIRST explain to the user what you're about to do and why. This shows transparency and safety awareness.
        
        When asked to modify the spreadsheet (updateCell, updateRange, updateCells) or delete data (deleteThread), follow this pattern:
        
        1. FIRST: Write a clear message explaining:
           - What action you're about to perform
           - What data will be affected
           - Any potential consequences (e.g., "This will overwrite existing data in cell A1")
           - Your intent/reasoning
        
        2. THEN: Use the 'askForConfirmation' tool with:
           - message: A clear question asking for confirmation
           - action: A short action description (e.g. "Update cell A1 to 100", "Update range A1:B5", "Update multiple cells")
           - toolName: The name of the dangerous tool ("updateCell", "updateRange", "updateCells", or "deleteThread")
           - toolParamsJson: A JSON string of the exact parameters that will be passed to the dangerous tool. 
             * For updateCell: '{"cell":"A1","value":100}'
             * For updateRange: '{"range":"A1:B5","values":[[1,2],[3,4]]}'
             * For updateCells: '{"updates":[{"cell":"A1","value":"X"},{"cell":"B2","value":100}]}'
             * For deleteThread: '{}'
        
        3. Only after the user explicitly confirms (by clicking "Yes" in the confirmation UI), proceed to call the dangerous tool with the EXACT same parameters you stored in the confirmation.
        
        4. If the user declines, acknowledge the cancellation and do not proceed with the action.
        
        Example response flow:
        User: "Write 'Test' to cell A1"
        Assistant: "I'm about to write 'Test' into cell A1. This will overwrite any existing data in that cell. Should I proceed?"
        [Then call askForConfirmation tool with toolName="updateCell", toolParamsJson='{"cell":"A1","value":"Test"}']
        
        CRITICAL INSTRUCTIONS FOR AFTER CONFIRMATION:
        When askForConfirmation tool receives result "Yes" or result is "Yes", OR when the user responds with confirming text like "I confirm", "Yes", "Proceed", "Go ahead":
        1. The user has CONFIRMED - you have permission to proceed
        2. You MUST IMMEDIATELY call the dangerous tool (specified in toolName parameter from the askForConfirmation input)
        3. Parse toolParamsJson from the askForConfirmation input and call the tool with EXACT parameters
        4. Do NOT stop, do NOT ask again, do NOT wait - EXECUTE NOW
        5. After execution, inform user: "Done! [what was done]" (e.g., "Done! Cell A1 updated to 'Test'")
        
        IMPORTANT: When you see tool result "Yes" for askForConfirmation OR when the user sends a message with confirmation text (like "I confirm. Please proceed..."), this is your signal to IMMEDIATELY execute. 
        The conversation flow MUST continue: askForConfirmation → "Yes" result OR user confirmation text → IMMEDIATELY call updateCell/updateRange/updateCells/deleteThread → Report result.
        Do not end the conversation after askForConfirmation - you MUST continue to execute the action.
        
        When askForConfirmation tool receives result "No" OR the user declines with text like "cancel", "decline", "no":
        1. The user has DECLINED - do NOT proceed with the action
        2. Acknowledge the cancellation: "Action cancelled. No changes were made."
        3. Do NOT call the dangerous tool
        4. End the conversation flow here`,
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
                        
                        let spreadsheetData = getCachedSpreadsheetData(threadId);
                        if (!spreadsheetData) {
                            for (const msg of response.messages || []) {
                                if (msg.role === 'tool') {
                                    let result: any = msg.content;
                                    if (typeof result === 'string') {
                                        try {
                                            result = JSON.parse(result);
                                        } catch (e) {
                                            continue;
                                        }
                                    }
                                    if (Array.isArray(result)) {
                                        result = result[0];
                                    }
                                    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
                                        spreadsheetData = result;
                                        break;
                                    }
                                }
                            }
                        }
                        if (spreadsheetData && Array.isArray(spreadsheetData) && spreadsheetData.length > 0) {
                            content += `\n\n<!-- SPREADSHEET_DATA:${JSON.stringify(spreadsheetData)} -->`;
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
