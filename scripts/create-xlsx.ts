import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const data = [
    ["Email", "Name", "Amount", "Status"],
    ["alice@example.com", "Alice", 120, "Paid"],
    ["bob@example.com", "Bob", 80, "Pending"],
    ["charlie@example.com", "Charlie", 200, "Paid"],
    ["dave@example.com", "Dave", 50, "Failed"]
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

const dir = path.join(process.cwd(), "data");
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

XLSX.writeFile(wb, path.join(dir, "example.xlsx"));
console.log("Created data/example.xlsx");
