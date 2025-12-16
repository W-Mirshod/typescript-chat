import * as XLSX from 'xlsx';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), 'data/example.xlsx');

export function getSheetData(range?: string) {
    const wb = XLSX.readFile(FILE_PATH);
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
}

export function updateCell(cell: string, value: string | number) {
    const wb = XLSX.readFile(FILE_PATH);
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];

    // Decode cell address
    // cell could be "B2"
    // We update the cell object
    // Need to handle type of value

    // Check if cell exists, if not create it?
    // XLSX utils:
    XLSX.utils.sheet_add_aoa(ws, [[value]], { origin: cell });

    XLSX.writeFile(wb, FILE_PATH);
    return { success: true, cell, value };
}
