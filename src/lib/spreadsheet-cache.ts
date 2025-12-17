const spreadsheetCache = new Map<string, any[][]>();

export function cacheSpreadsheetData(threadId: string, data: any[][]) {
    spreadsheetCache.set(threadId, data);
}

export function getCachedSpreadsheetData(threadId: string): any[][] | null {
    return spreadsheetCache.get(threadId) || null;
}


