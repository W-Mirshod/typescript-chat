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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onMouseUp={handleMouseUp}>
            <div className="bg-white rounded-2xl shadow-2xl w-[95%] h-[90%] md:w-3/4 md:h-3/4 flex flex-col border-2 border-slate-200 overflow-hidden">
                <div className="flex justify-between items-center p-3 md:p-5 border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                    <h3 className="font-bold text-xl text-slate-800">Table View</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-lg transition-all">
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-3 md:p-5 select-none bg-slate-50/50">
                    <table className="border-collapse w-full shadow-inner rounded-lg overflow-hidden">
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
                                                className={`border-2 p-3 min-w-[80px] cursor-cell transition-colors font-medium ${isSelected ? 'bg-gradient-to-br from-blue-200 to-indigo-200 border-blue-500 text-blue-900' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
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
                <div className="p-3 md:p-5 border-t-2 border-slate-200 flex flex-col md:flex-row justify-end gap-3 bg-gradient-to-r from-white to-slate-50">
                    <div className="mr-auto text-sm text-slate-600 flex items-center font-semibold mb-2 md:mb-0">
                        {getSelectionReference() ? (
                            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                                Selected: <span className="font-mono">{getSelectionReference()}</span>
                            </span>
                        ) : (
                            <span className="text-slate-500">Select a range...</span>
                        )}
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button onClick={onClose} className="px-5 py-2.5 text-slate-700 hover:bg-slate-100 rounded-xl font-medium transition-all border-2 border-slate-200 hover:border-slate-300">Cancel</button>
                        <button
                            onClick={handleInsert}
                            disabled={!selection.start}
                            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 disabled:transform-none"
                        >
                            <Check size={18} strokeWidth={2.5} /> Insert Mention
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
