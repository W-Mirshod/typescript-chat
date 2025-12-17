import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const FILE_PATH = path.join(process.cwd(), 'data/example.xlsx');

function ensureFileExists() {
    try {
        const dir = path.dirname(FILE_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        }
        
        if (!fs.existsSync(FILE_PATH)) {
            const defaultData = [
                ["Email", "Name", "Amount", "Status"],
                ["alice@example.com", "Alice", 120, "Paid"],
                ["bob@example.com", "Bob", 80, "Pending"],
                ["charlie@example.com", "Charlie", 200, "Paid"],
                ["dave@example.com", "Dave", 50, "Failed"]
            ];
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(defaultData);
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
            // Use XLSX.write with buffer instead of XLSX.writeFile to avoid file locking issues
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            fs.writeFileSync(FILE_PATH, buffer);
            
            if (!fs.existsSync(FILE_PATH)) {
                throw new Error(`Failed to create file at ${FILE_PATH}`);
            }
            console.log(`Created missing file: ${FILE_PATH}`);
        }
        
        if (!fs.existsSync(FILE_PATH)) {
            throw new Error(`File does not exist at ${FILE_PATH} after ensureFileExists`);
        }
        
        const stats = fs.statSync(FILE_PATH);
        console.log(`File verified: ${FILE_PATH}, size: ${stats.size}, readable: ${fs.constants.R_OK}`);
    } catch (error: any) {
        console.error(`Error in ensureFileExists: ${error.message}`);
        console.error(`File path: ${FILE_PATH}`);
        console.error(`Current working directory: ${process.cwd()}`);
        throw error;
    }
}

export function getSheetData(range?: string) {
    try {
        ensureFileExists();
        
        if (!fs.existsSync(FILE_PATH)) {
            throw new Error(`File does not exist: ${FILE_PATH}`);
        }
        
        let wb;
        try {
            const fileBuffer = fs.readFileSync(FILE_PATH);
            wb = XLSX.read(fileBuffer, { type: 'buffer' });
        } catch (readError: any) {
            throw new Error(`Failed to read file ${FILE_PATH}: ${readError.message}`);
        }
        const sheetName = wb.SheetNames[0]; // operate on first sheet for simplicity
        const ws = wb.Sheets[sheetName];

    if (range) {
        // Parse range mentions like "@Sheet1!A1:B2" or "Sheet1!A1:B2" or plain "A1:B2"
        let parsedRange = range;
        
        // Remove @ prefix if present
        if (parsedRange.startsWith('@')) {
            parsedRange = parsedRange.substring(1);
        }
        
        // Extract sheet name and range if format is "Sheet1!A1:B2"
        const sheetRangeMatch = parsedRange.match(/^([^!]+)!(.+)$/);
        if (sheetRangeMatch) {
            // Sheet name is provided (for future extensibility)
            // Currently we only use the first sheet, but we parse it for consistency
            parsedRange = sheetRangeMatch[2]; // Extract just the range part (A1:B2)
        }
        
        // XLSX utils handle A1:B2 format
        return XLSX.utils.sheet_to_json(ws, { header: 1, range: parsedRange }); // array of arrays
    }

    return XLSX.utils.sheet_to_json(ws, { header: 1 });
    } catch (error: any) {
        console.error(`Error in getSheetData: ${error.message}`);
        console.error(`File path: ${FILE_PATH}`);
        throw error;
    }
}

export function updateCell(cell: string, value: string | number) {
    try {
        ensureFileExists();
        
        if (!fs.existsSync(FILE_PATH)) {
            throw new Error(`File does not exist: ${FILE_PATH}`);
        }
        
        try {
            fs.accessSync(FILE_PATH, fs.constants.R_OK | fs.constants.W_OK);
        } catch (accessError: any) {
            throw new Error(`File is not accessible (permissions?): ${FILE_PATH}, error: ${accessError.message}`);
        }
        
        let wb;
        try {
            const fileBuffer = fs.readFileSync(FILE_PATH);
            wb = XLSX.read(fileBuffer, { type: 'buffer' });
        } catch (readError: any) {
            throw new Error(`Failed to read file ${FILE_PATH}: ${readError.message}`);
        }
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];

        XLSX.utils.sheet_add_aoa(ws, [[value]], { origin: cell });

        // Use XLSX.write with buffer instead of XLSX.writeFile to avoid file locking issues
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        fs.writeFileSync(FILE_PATH, buffer);
        return { success: true, cell, value };
    } catch (error: any) {
        console.error(`Error in updateCell: ${error.message}`);
        console.error(`File path: ${FILE_PATH}`);
        console.error(`Error stack: ${error.stack}`);
        throw error;
    }
}

export function updateRange(range: string, values: any[][]) {
    try {
        ensureFileExists();
        
        if (!fs.existsSync(FILE_PATH)) {
            throw new Error(`File does not exist: ${FILE_PATH}`);
        }
        
        let wb;
        try {
            const fileBuffer = fs.readFileSync(FILE_PATH);
            wb = XLSX.read(fileBuffer, { type: 'buffer' });
        } catch (readError: any) {
            throw new Error(`Failed to read file ${FILE_PATH}: ${readError.message}`);
        }
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];

    let parsedRange = range;
    
    if (parsedRange.startsWith('@')) {
        parsedRange = parsedRange.substring(1);
    }
    
    const sheetRangeMatch = parsedRange.match(/^([^!]+)!(.+)$/);
    if (sheetRangeMatch) {
        parsedRange = sheetRangeMatch[2];
    }
    
    const startCell = parsedRange.split(':')[0];
    
    XLSX.utils.sheet_add_aoa(ws, values, { origin: startCell });

    // Use XLSX.write with buffer instead of XLSX.writeFile to avoid file locking issues
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    fs.writeFileSync(FILE_PATH, buffer);
    return { success: true, range: parsedRange, cellsUpdated: values.length * (values[0]?.length || 0) };
    } catch (error: any) {
        console.error(`Error in updateRange: ${error.message}`);
        console.error(`File path: ${FILE_PATH}`);
        throw error;
    }
}

export function updateCells(updates: Array<{cell: string, value: any}>) {
    try {
        ensureFileExists();
        
        if (!fs.existsSync(FILE_PATH)) {
            throw new Error(`File does not exist: ${FILE_PATH}`);
        }
        
        let wb;
        try {
            const fileBuffer = fs.readFileSync(FILE_PATH);
            wb = XLSX.read(fileBuffer, { type: 'buffer' });
        } catch (readError: any) {
            throw new Error(`Failed to read file ${FILE_PATH}: ${readError.message}`);
        }
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];

    updates.forEach(({ cell, value }) => {
        XLSX.utils.sheet_add_aoa(ws, [[value]], { origin: cell });
    });

    // Use XLSX.write with buffer instead of XLSX.writeFile to avoid file locking issues
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    fs.writeFileSync(FILE_PATH, buffer);
    return { success: true, cellsUpdated: updates.length, updates };
    } catch (error: any) {
        console.error(`Error in updateCells: ${error.message}`);
        console.error(`File path: ${FILE_PATH}`);
        throw error;
    }
}
