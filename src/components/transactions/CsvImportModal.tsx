import React, { useState } from 'react';
import { store } from '../../lib/storage';
import {
  parseStatementFileAsync,
  parseTransactionsCsv,
  ParsedCsvRow,
  MAX_IMPORT_FILE_SIZE_BYTES,
  StatementParseResult,
} from '../../lib/csvParser';
import { formatINR } from '../../lib/calculations';
import { addNotification } from '../../lib/notifications';
import {
  Upload,
  AlertTriangle,
  CheckCircle,
  FileText,
  History,
  RotateCcw,
  Lock,
  FileSpreadsheet,
  FileCheck,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';

interface CsvImportModalProps {
  onSuccess: (count: number) => void;
  onClose: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ onSuccess, onClose }) => {
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('statement_import.csv');
  const [fileFormat, setFileFormat] = useState<'csv' | 'json' | 'xlsx' | 'pdf'>('csv');
  const [pdfPassword, setPdfPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [parsedResult, setParsedResult] = useState<StatementParseResult | null>(null);

  const existingTxs = store.getTransactions();
  const profile = store.getProfile();
  const importHistory = store.getImportHistory();

  const detectFormat = (name: string): 'csv' | 'json' | 'xlsx' | 'pdf' => {
    const lower = name.toLowerCase();
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'xlsx';
    if (lower.endsWith('.pdf')) return 'pdf';
    if (lower.endsWith('.json')) return 'json';
    return 'csv';
  };

  const processFile = async (file: File, password?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const format = detectFormat(file.name);
      setFileFormat(format);
      setFileName(file.name);
      setSelectedFile(file);

      const userRules = store.getUserCategoryRules();
      const res = await parseStatementFileAsync(
        file,
        password,
        existingTxs,
        profile.user_id,
        userRules
      );

      if (res.requiresPassword) {
        setNeedsPassword(true);
        setParsedResult(null);
        setErrorMessage('This PDF statement is password protected. Enter your password below to decrypt locally.');
      } else {
        setNeedsPassword(false);
        setParsedResult(res);
        if (res.validRows.length === 0 && res.errors.length > 0) {
          setErrorMessage(res.errors[0]);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse statement.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
      alert('File size exceeds the 10MB safety limit. Please upload a smaller statement extract.');
      return;
    }

    processFile(file);
  };

  const handleUnlockPdf = () => {
    if (!selectedFile) return;
    if (!pdfPassword.trim()) {
      alert('Please enter your statement password.');
      return;
    }
    processFile(selectedFile, pdfPassword.trim());
  };

  const handleParseManual = () => {
    if (!rawText.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setFileFormat('csv');
      setFileName('manual_pasted_statement.csv');
      const userRules = store.getUserCategoryRules();
      const res = parseTransactionsCsv(rawText, existingTxs, profile.user_id, userRules);
      setParsedResult(res);
      if (res.validRows.length === 0 && res.errors.length > 0) {
        setErrorMessage(res.errors[0]);
      }
    } finally {
      setIsLoading(false);
    }
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

  const getFormatBadge = (fmt: string) => {
    switch (fmt) {
      case 'xlsx':
      case 'excel':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF7EE] text-[#2E8B57] border border-[#CDE5D7]">EXCEL (.xlsx)</span>;
      case 'pdf':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]">PDF STATEMENT</span>;
      case 'json':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#3B82F6] border border-[#BFDBFE]">JSON</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FCF8EE] text-[#D4952B] border border-[#EBD7AF]">CSV</span>;
    }
  };

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
          Import Bank Statement
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
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
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
                    <span className="truncate max-w-[200px] sm:max-w-xs">{item.file_name}</span>
                    {getFormatBadge(item.file_format)}
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
      ) : !parsedResult && !needsPassword ? (
        <>
          {/* File drag/drop box */}
          <div className="border-2 border-dashed border-[#DFD7C7] hover:border-[#D4952B] bg-[#FAF8F5] rounded-3xl p-6 sm:p-8 text-center transition-all">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#EBF7EE] text-[#2E8B57] border border-[#CDE5D7] flex items-center justify-center shadow-xs" title="Excel (.xlsx, .xls)">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] flex items-center justify-center shadow-xs" title="PDF Statements">
                <FileText className="w-4 h-4" />
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#FCF8EE] text-[#D4952B] border border-[#EBD7AF] flex items-center justify-center shadow-xs" title="CSV Statements">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>

            <div className="text-sm font-extrabold text-[#181D26]">
              Upload Bank Statement
            </div>
            <p className="text-xs text-[#7F899F] mt-1 max-w-md mx-auto">
              Supports <strong>Excel (.xlsx, .xls)</strong>, <strong>PDF statements</strong>, <strong>CSV</strong>, or <strong>JSON</strong> from HDFC, SBI, ICICI, Axis, Kotak, Cred, and all major Indian banks (Max 10MB)
            </p>

            {isLoading ? (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-[#D4952B]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Decrypting & analyzing statement on-device...</span>
              </div>
            ) : (
              <input
                type="file"
                accept=".xlsx,.xls,.pdf,.csv,.json"
                onChange={handleFileUpload}
                className="mt-4 block w-full text-xs text-[#7F899F] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#181D26] file:text-white hover:file:bg-[#2A3140] cursor-pointer"
              />
            )}

            {errorMessage && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <div className="text-center text-[10px] tracking-wider text-[#7F899F] font-bold uppercase">— OR PASTE STATEMENT TEXT DIRECTLY —</div>

          {/* Textarea paste option */}
          <div>
            <textarea
              rows={3}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={sampleCsvExample}
              className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] text-xs font-mono text-[#181D26] placeholder-[#9AA4B2] focus:outline-hidden focus:border-[#181D26] focus:bg-white transition-colors"
            />
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setRawText(sampleCsvExample)}
                className="text-[11px] text-[#2E8B57] font-semibold hover:underline"
              >
                Insert sample test CSV
              </button>
              <button
                type="button"
                onClick={handleParseManual}
                disabled={!rawText.trim() || isLoading}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                Inspect & Validate Rows
              </button>
            </div>
          </div>
        </>
      ) : needsPassword ? (
        /* Password Prompt for Protected PDFs */
        <div className="p-6 rounded-3xl bg-[#FCF8EE] border border-[#EBD7AF] space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#EBD7AF] flex items-center justify-center text-[#D4952B] shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[#181D26]">Password Protected PDF Statement</h4>
              <p className="text-xs text-[#7F899F]">
                File: <strong className="text-[#181D26]">{fileName}</strong>
              </p>
            </div>
          </div>

          <p className="text-xs text-[#7F899F] leading-relaxed">
            Many Indian banks encrypt monthly statements. Your statement will be decrypted <strong>100% locally in your browser</strong> — passwords never leave your device.
            <br />
            <span className="text-[11px] text-[#8C5D17] font-medium mt-1 inline-block">
              💡 Common bank password formulas: Date of Birth in DDMMYYYY format, or first 4 letters of name + DDMM, or PAN card number.
            </span>
          </p>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[#181D26]">Statement Password</label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={pdfPassword}
                onChange={e => setPdfPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUnlockPdf()}
                placeholder="Enter statement password (e.g. 24081995)"
                className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#EDE8E0] text-xs font-mono text-[#181D26] focus:outline-hidden focus:border-[#D4952B]"
                autoFocus
              />
              <button
                type="button"
                onClick={handleUnlockPdf}
                disabled={isLoading}
                className="btn-primary text-xs px-4 py-2 shrink-0 flex items-center gap-1.5"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                <span>Unlock & Parse</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setNeedsPassword(false);
                setSelectedFile(null);
                setPdfPassword('');
                setErrorMessage(null);
              }}
              className="text-xs text-[#7F899F] hover:text-[#181D26] underline font-medium"
            >
              Choose a different file
            </button>
          </div>
        </div>
      ) : parsedResult ? (
        /* Preview Parsed Rows & Duplicate Report */
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EDE8E0]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-[#181D26]">
                  Found {parsedResult.validRows.length} transactions in {fileName}
                </span>
                {getFormatBadge(fileFormat)}
              </div>
              <div className="text-[11px] text-[#7F899F] mt-0.5">
                {parsedResult.duplicatesCount > 0 ? (
                  <span className="text-[#D4952B] font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 inline" />
                    {parsedResult.duplicatesCount} suspected duplicates detected
                  </span>
                ) : (
                  <span className="text-[#2E8B57] font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 inline" />
                    Clean dataset: zero duplicate conflicts found
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setParsedResult(null);
                setSelectedFile(null);
                setNeedsPassword(false);
                setPdfPassword('');
                setErrorMessage(null);
              }}
              className="text-xs text-[#7F899F] hover:text-[#181D26] underline font-medium self-start sm:self-auto"
            >
              Upload different file
            </button>
          </div>

          {/* Preview rows list */}
          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
            {parsedResult.validRows.map(row => (
              <div
                key={row.rowNumber}
                className={`p-2.5 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
                  row.is_duplicate
                    ? 'border-[#EBD7AF] bg-[#FCF8EE] text-[#8C5D17]'
                    : 'border-[#EDE8E0] bg-white text-[#181D26]'
                }`}
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      row.type === 'income'
                        ? 'bg-[#EBF7EE] text-[#2E8B57]'
                        : 'bg-[#FAF8F5] text-[#181D26]'
                    }`}
                  >
                    {row.type === 'income' ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-[#7F899F]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[#181D26] flex items-center gap-1.5 truncate">
                      <span className="truncate">{row.merchant}</span>
                      {row.is_duplicate && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#FDECC8] text-[#8C5D17] border border-[#F3C465] font-bold shrink-0">
                          Duplicate
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#7F899F] mt-0.5 truncate">
                      {row.date} • {row.payment_method} • <span className="capitalize">{row.category_id}</span>
                      {row.duplicate_reason && ` — ${row.duplicate_reason}`}
                    </div>
                  </div>
                </div>

                <div
                  className={`font-black font-mono-num text-xs sm:text-sm shrink-0 ${
                    row.type === 'income' ? 'text-[#2E8B57]' : 'text-[#181D26]'
                  }`}
                >
                  {row.type === 'income' ? '+' : '-'}
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
      ) : null}
    </div>
  );
};
