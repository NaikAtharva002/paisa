import React, { useState } from 'react';
import { store } from '../../lib/storage';
import { parseStatementFile, ParsedCsvRow, MAX_IMPORT_FILE_SIZE_BYTES } from '../../lib/csvParser';
import { formatINR } from '../../lib/calculations';
import { addNotification } from '../../lib/notifications';
import { Upload, AlertTriangle, CheckCircle, FileText, History, RotateCcw } from 'lucide-react';

interface CsvImportModalProps {
  onSuccess: (count: number) => void;
  onClose: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ onSuccess, onClose }) => {
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('statement_import.csv');
  const [fileFormat, setFileFormat] = useState<'csv' | 'json'>('csv');
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [parsedResult, setParsedResult] = useState<{
    validRows: ParsedCsvRow[];
    duplicatesCount: number;
    errors: string[];
  } | null>(null);

  const existingTxs = store.getTransactions();
  const profile = store.getProfile();
  const importHistory = store.getImportHistory();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
      alert('File size exceeds the 5MB safety limit. Please upload a smaller statement extract.');
      return;
    }

    const format = file.name.endsWith('.json') ? 'json' : 'csv';
    setFileName(file.name);
    setFileFormat(format);

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      setCsvText(content);
      const userRules = store.getUserCategoryRules();
      const res = parseStatementFile(content, format, existingTxs, profile.user_id, userRules);
      setParsedResult(res);
    };
    reader.readAsText(file);
  };

  const handleParseManual = () => {
    if (!csvText.trim()) return;
    const format = csvText.trim().startsWith('{') || csvText.trim().startsWith('[') ? 'json' : 'csv';
    setFileFormat(format);
    const userRules = store.getUserCategoryRules();
    const res = parseStatementFile(csvText, format, existingTxs, profile.user_id, userRules);
    setParsedResult(res);
  };

  const handleImport = (skipDuplicates: boolean) => {
    if (!parsedResult) return;

    const rowsToImport = skipDuplicates
      ? parsedResult.validRows.filter(r => !r.is_duplicate)
      : parsedResult.validRows;

    if (rowsToImport.length === 0) {
      alert('No valid rows to import.');
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
    const addedTxs = store.getTransactions(profile.user_id).slice(0, count);
    const txIds = addedTxs.map(t => t.id);

    store.recordImport({
      file_name: fileName,
      file_format: fileFormat,
      total_detected: parsedResult.validRows.length,
      imported_count: count,
      duplicates_skipped: skipDuplicates ? parsedResult.duplicatesCount : 0,
      failed_count: parsedResult.errors.length,
      transaction_ids: txIds,
    });

    addNotification({
      title: '📥 Statement Imported',
      body: `Successfully imported ${count} transactions from ${fileName} (${skipDuplicates ? parsedResult.duplicatesCount : 0} duplicates skipped).`,
      type: 'system',
    });

    onSuccess(count);
  };

  const handleRollback = (importId: string) => {
    if (confirm('Roll back this import batch? All transactions from this file will be safely removed.')) {
      store.rollbackImport(importId);
    }
  };

  const sampleCsvExample = `Date,Merchant,Amount,Payment Method,Ref ID
2026-10-28,Swiggy,450,UPI,UPI-987123
2026-10-28,Blinkit,600,UPI,UPI-987124
2026-10-27,Uber Ride,280,UPI,UPI-987125`;

  return (
    <div className="space-y-4 text-[#181D26]">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-[#EDE8E0] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'upload'
              ? 'bg-[#181D26] text-white shadow-xs'
              : 'text-[#5E687D] hover:text-[#181D26] hover:bg-slate-100'
          }`}
        >
          <Upload className="w-3.5 h-3.5 inline mr-1.5" />
          Import Statement
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-[#181D26] text-white shadow-xs'
              : 'text-[#5E687D] hover:text-[#181D26] hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5 inline mr-1.5" />
          Import History ({importHistory.length})
        </button>
      </div>

      {activeTab === 'history' ? (
        <div className="space-y-2.5 max-h-72 overflow-y-auto">
          {importHistory.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No statement import history recorded yet.
            </div>
          ) : (
            importHistory.map(item => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0] flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-[#181D26] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#D4952B]" />
                    <span>{item.file_name}</span>
                    <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-white border border-[#EDE8E0] text-slate-500">
                      {item.file_format}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {new Date(item.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} •{' '}
                    <strong className="text-[#2E8B57]">{item.imported_count} imported</strong>
                    {item.duplicates_skipped > 0 && ` • ${item.duplicates_skipped} duplicates skipped`}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRollback(item.id)}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-[#EDE8E0] hover:border-[#E06D53] hover:text-[#E06D53] text-[11px] font-bold text-slate-600 transition-all flex items-center gap-1 shrink-0"
                  title="Roll back all transactions created by this import batch"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Rollback</span>
                </button>
              </div>
            ))
          )}
        </div>
      ) : !parsedResult ? (
        <>
          {/* File drag/drop box */}
          <div className="border-2 border-dashed border-[#DFD7C7] hover:border-[#D4952B] bg-[#FAF8F5] rounded-2xl p-6 text-center transition-colors">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#EDE8E0] flex items-center justify-center text-[#D4952B] mx-auto mb-2 shadow-xs">
              <Upload className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-[#181D26]">
              Upload bank statement (CSV or JSON)
            </div>
            <p className="text-[11px] text-[#7F899F] mt-1">
              Supports HDFC, ICICI, SBI, Cred, or standard CSV/JSON statements (Max 5MB)
            </p>
            <input
              type="file"
              accept=".csv,.json"
              onChange={handleFileUpload}
              className="mt-3 block w-full text-xs text-[#7F899F] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#181D26] file:text-white hover:file:bg-[#2A3140] cursor-pointer"
            />
          </div>

          <div className="text-center text-[11px] tracking-wider text-[#7F899F] font-bold uppercase">— OR PASTE STATEMENT TEXT DIRECTLY —</div>

          {/* Textarea paste option */}
          <div>
            <textarea
              rows={4}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder={sampleCsvExample}
              className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-mono text-[#181D26] placeholder-[#9AA4B2] focus:outline-hidden focus:border-[#181D26] focus:bg-white transition-colors"
            />
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCsvText(sampleCsvExample)}
                className="text-[11px] text-[#2E8B57] font-semibold hover:underline"
              >
                Insert sample test CSV
              </button>
              <button
                type="button"
                onClick={handleParseManual}
                disabled={!csvText.trim()}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                Inspect & Validate Rows
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Preview Parsed Rows & Duplicate Report */
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0]">
            <div>
              <div className="text-xs font-bold text-[#181D26]">
                Found {parsedResult.validRows.length} valid transactions
              </div>
              <div className="text-[11px] text-[#7F899F] mt-0.5">
                {parsedResult.duplicatesCount > 0 ? (
                  <span className="text-[#D4952B] font-semibold">
                    ⚠️ {parsedResult.duplicatesCount} suspected duplicates detected
                  </span>
                ) : (
                  <span className="text-[#2E8B57] font-semibold">
                    ✓ Clean dataset: zero duplicate conflicts found
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setParsedResult(null)}
              className="text-xs text-[#7F899F] hover:text-[#181D26] underline font-medium"
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
                    ? 'border-[#EBD7AF] bg-[#FCF8EE] text-[#8C5D17]'
                    : 'border-[#EDE8E0] bg-[#FAF8F5] text-[#181D26]'
                }`}
              >
                <div>
                  <div className="font-semibold text-[#181D26] flex items-center gap-1.5">
                    <span>{row.merchant}</span>
                    {row.is_duplicate && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FDECC8] text-[#8C5D17] border border-[#F3C465] font-bold">
                        Duplicate
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#7F899F] mt-0.5">
                    {row.date} • {row.payment_method}
                    {row.duplicate_reason && ` — ${row.duplicate_reason}`}
                  </div>
                </div>
                <div className="font-bold font-mono-num text-sm text-[#181D26]">
                  {formatINR(row.amount)}
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-[#EDE8E0] flex flex-col sm:flex-row items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs w-full sm:w-auto"
            >
              Cancel
            </button>
            {parsedResult.duplicatesCount > 0 && (
              <button
                type="button"
                onClick={() => handleImport(false)}
                className="btn-secondary text-xs w-full sm:w-auto"
              >
                Import All (Include Duplicates)
              </button>
            )}
            <button
              type="button"
              onClick={() => handleImport(true)}
              className="btn-primary text-xs w-full sm:w-auto"
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
