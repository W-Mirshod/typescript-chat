import * as XLSX from 'xlsx';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), 'data/example.xlsx');

export function getSheetData(range?: string) {
    const wb = XLSX.readFile(FILE_PATH);
    const sheetName = wb.SheetNames[0]; // operate on first sheet for simplicity
    const ws = wb.Sheets[sheetName];

    if (range) {
        // range could be "A1:B2" or "Sheet1!A1:B2"
        // we'll assume current sheet if no sheet specified, or parse it
        // For simplicity, just decode range on the sheet.
        // But XLSX utils handle A1:B2
        // We'll return JSON data
        return XLSX.utils.sheet_to_json(ws, { header: 1, range }); // array of arrays
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
