import { useState, useRef, useEffect } from "react";
import { X, Check } from "lucide-react";

interface TableDialogProps {
    isOpen: boolean;
    onClose: () => void;
    data: any[][];
    onInsertReference: (ref: string) => void;
}

export function TableDialog({ isOpen, onClose, data, onInsertReference }: TableDialogProps) {
    const [selection, setSelection] = useState<{ start: { r: number, c: number } | null, end: { r: number, c: number } | null }>({ start: null, end: null });
    const [isSelecting, setIsSelecting] = useState(false);

    if (!isOpen) return null;

    const handleMouseDown = (r: number, c: number) => {
        setSelection({ start: { r, c }, end: { r, c } });
        setIsSelecting(true);
    };

    const handleMouseEnter = (r: number, c: number) => {
        if (isSelecting && selection.start) {
            setSelection(prev => ({ ...prev, end: { r, c } }));
        }
    };

    const handleMouseUp = () => {
        setIsSelecting(false);
    };

    // Convert row/col to A1 notation (handles columns beyond Z: AA, AB, etc.)
    const toA1 = (r: number, c: number) => {
        // Convert column index to Excel column letters (0 -> A, 25 -> Z, 26 -> AA, etc.)
        let colLetter = '';
        let colNum = c;
        
        while (colNum >= 0) {
            colLetter = String.fromCharCode(65 + (colNum % 26)) + colLetter;
            colNum = Math.floor(colNum / 26) - 1;
        }
        
        return `${colLetter}${r + 1}`;
    };

    const getSelectionReference = () => {
        if (!selection.start || !selection.end) return "";
        const start = toA1(Math.min(selection.start.r, selection.end.r), Math.min(selection.start.c, selection.end.c));
        const end = toA1(Math.max(selection.start.r, selection.end.r), Math.max(selection.start.c, selection.end.c));
        if (start === end) return `@Sheet1!${start}`;
        return `@Sheet1!${start}:${end}`;
    };

    const handleInsert = () => {
        const ref = getSelectionReference();
        if (ref) {
            onInsertReference(ref);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onMouseUp={handleMouseUp}>
            <div className="bg-white rounded-lg shadow-xl w-3/4 h-3/4 flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="font-semibold text-lg">Table View</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-black"><X /></button>
                </div>
                <div className="flex-1 overflow-auto p-4 select-none">
                    <table className="border-collapse w-full">
                        <tbody>
                            {data.map((row, r) => (
                                <tr key={r}>
                                    {row.map((cell: any, c: number) => {
                                        const isSelected = selection.start && selection.end &&
                                            r >= Math.min(selection.start.r, selection.end.r) &&
                                            r <= Math.max(selection.start.r, selection.end.r) &&
                                            c >= Math.min(selection.start.c, selection.end.c) &&
                                            c <= Math.max(selection.start.c, selection.end.c);

                                        return (
                                            <td
                                                key={c}
                                                className={`border p-2 min-w-[80px] cursor-cell ${isSelected ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-300'}`}
                                                onMouseDown={() => handleMouseDown(r, c)}
                                                onMouseEnter={() => handleMouseEnter(r, c)}
                                            >
                                                {cell}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t flex justify-end gap-2">
                    <div className="mr-auto text-sm text-gray-500 flex items-center">
                        {getSelectionReference() ? `Selected: ${getSelectionReference()}` : "Select a range..."}
                    </div>
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                    <button
                        onClick={handleInsert}
                        disabled={!selection.start}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        <Check size={16} /> Insert Mention
                    </button>
                </div>
            </div>
        </div>
    );
}
