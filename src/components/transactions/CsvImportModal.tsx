import React, { useState } from 'react';
import { store } from '../../lib/storage';
import { parseTransactionsCsv, ParsedCsvRow } from '../../lib/csvParser';
import { formatINR } from '../../lib/calculations';
import { Upload, AlertTriangle, CheckCircle, FileText, X } from 'lucide-react';

interface CsvImportModalProps {
  onSuccess: (count: number) => void;
  onClose: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ onSuccess, onClose }) => {
  const [csvText, setCsvText] = useState('');
  const [parsedResult, setParsedResult] = useState<{
    validRows: ParsedCsvRow[];
    duplicatesCount: number;
    errors: string[];
  } | null>(null);

  const existingTxs = store.getTransactions();
  const profile = store.getProfile();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      setCsvText(content);
      const res = parseTransactionsCsv(content, existingTxs, profile.user_id);
      setParsedResult(res);
    };
    reader.readAsText(file);
  };

  const handleParseManual = () => {
    if (!csvText.trim()) return;
    const res = parseTransactionsCsv(csvText, existingTxs, profile.user_id);
    setParsedResult(res);
  };

  const handleImport = (skipDuplicates: boolean) => {
    if (!parsedResult) return;

    const rowsToImport = skipDuplicates
      ? parsedResult.validRows.filter(r => !r.is_duplicate)
      : parsedResult.validRows;

    if (rowsToImport.length === 0) {
      alert('No rows to import.');
      return;
    }

    const payload = rowsToImport.map(r => ({
      user_id: profile.user_id,
      transaction_date: r.date,
      merchant: r.merchant,
      description: r.description,
      amount: r.amount,
      transaction_type: r.type,
      category_id: r.category_id,
      payment_method: r.payment_method,
      external_transaction_id: r.external_transaction_id,
      is_credit_card_payment: r.is_credit_card_payment,
      notes: r.is_duplicate ? `Imported override (Previously flagged duplicate)` : undefined,
    }));

    const count = store.addTransactionsBulk(payload);
    onSuccess(count);
  };

  const sampleCsvExample = `Date,Merchant,Amount,Payment Method,Ref ID
2026-10-28,Swiggy,450,UPI,UPI-987123
2026-10-28,Blinkit,600,UPI,UPI-987124
2026-10-27,Uber Ride,280,UPI,UPI-987125`;

  return (
    <div className="space-y-4">
      
      {!parsedResult ? (
        <>
          {/* File drag/drop box */}
          <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-6 text-center transition-colors">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <div className="text-xs font-semibold text-slate-200">
              Upload bank statement or expense CSV
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Supports HDFC, ICICI, SBI, Cred, or standard CSV format
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="mt-3 block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
            />
          </div>

          <div className="text-center text-xs text-slate-400 font-semibold">— OR PASTE CSV DIRECTLY —</div>

          {/* Textarea paste option */}
          <div>
            <textarea
              rows={4}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder={sampleCsvExample}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCsvText(sampleCsvExample)}
                className="text-[11px] text-emerald-400 hover:underline"
              >
                Insert sample test CSV
              </button>
              <button
                type="button"
                onClick={handleParseManual}
                disabled={!csvText.trim()}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-200 transition-colors"
              >
                Inspect & Validate Rows
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Preview Parsed Rows & Duplicate Report */
        <div className="space-y-3">
          
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <div className="text-xs font-bold text-slate-200">
                Found {parsedResult.validRows.length} valid transactions
              </div>
              <div className="text-[11px] text-slate-400">
                {parsedResult.duplicatesCount > 0 ? (
                  <span className="text-amber-400 font-medium">
                    ⚠️ {parsedResult.duplicatesCount} suspected duplicates detected
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium">
                    ✓ Clean dataset: zero duplicate conflicts found
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setParsedResult(null)}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Upload different file
            </button>
          </div>

          {/* Preview rows list */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
            {parsedResult.validRows.map(row => (
              <div
                key={row.rowNumber}
                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                  row.is_duplicate
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                    : 'border-slate-800 bg-slate-900/60 text-slate-300'
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                    <span>{row.merchant}</span>
                    {row.is_duplicate && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Duplicate
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {row.date} • {row.payment_method}
                    {row.duplicate_reason && ` — ${row.duplicate_reason}`}
                  </div>
                </div>
                <div className="font-bold font-mono-num text-sm text-slate-100">
                  {formatINR(row.amount)}
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            {parsedResult.duplicatesCount > 0 && (
              <button
                type="button"
                onClick={() => handleImport(false)}
                className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Import All (Include Duplicates)
              </button>
            )}
            <button
              type="button"
              onClick={() => handleImport(true)}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
            >
              {parsedResult.duplicatesCount > 0
                ? `Import ${parsedResult.validRows.length - parsedResult.duplicatesCount} Unique Items`
                : `Import All ${parsedResult.validRows.length} Items`}
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
