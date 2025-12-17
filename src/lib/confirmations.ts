type PendingConfirmation = {
    action: string;
    description: string;
    toolName: string;
    toolParams: Record<string, any>;
    timestamp: number;
    approved?: boolean;
};

const pendingConfirmations = new Map<string, PendingConfirmation>();

export function storeConfirmation(
    threadId: string,
    action: string,
    description: string,
    toolName: string,
    toolParams: Record<string, any>
) {
    const key = `${threadId}:${toolName}`;
    pendingConfirmations.set(key, {
        action,
        description,
        toolName,
        toolParams,
        timestamp: Date.now(),
    });
    return key;
}

export function getConfirmation(threadId: string, toolName: string): PendingConfirmation | null {
    const key = `${threadId}:${toolName}`;
    const confirmation = pendingConfirmations.get(key);
    if (!confirmation) return null;
    
    const age = Date.now() - confirmation.timestamp;
    if (age > 5 * 60 * 1000) {
        pendingConfirmations.delete(key);
        return null;
    }
    
    return confirmation;
}

export function clearConfirmation(threadId: string, toolName: string): boolean {
    const key = `${threadId}:${toolName}`;
    return pendingConfirmations.delete(key);
}

export function clearAllConfirmations(threadId: string) {
    const keysToDelete: string[] = [];
    for (const key of pendingConfirmations.keys()) {
        if (key.startsWith(`${threadId}:`)) {
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach(key => pendingConfirmations.delete(key));
}

export function approveConfirmation(threadId: string, toolName: string): boolean {
    const key = `${threadId}:${toolName}`;
    const confirmation = pendingConfirmations.get(key);
    if (!confirmation) return false;
    
    confirmation.approved = true;
    pendingConfirmations.set(key, confirmation);
    return true;
}
