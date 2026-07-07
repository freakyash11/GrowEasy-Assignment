'use client';

import React, { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { CheckCircle2, RotateCcw, AlertCircle, XCircle, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

export interface SkippedRecordData {
  skipped: boolean;
  reason: string;
  rawRow: Record<string, string>;
}

export interface FailedRecordData {
  row: Record<string, string>;
  error: string;
}

export interface ImportResultData {
  success: Record<string, string>[];
  skipped: SkippedRecordData[];
  failed: FailedRecordData[];
  totalProcessed: number;
}

interface CsvImportResultsProps {
  result: ImportResultData;
  onReset: () => void;
  onRetry?: (failedRows: Record<string, string>[]) => void;
  isRetrying?: boolean;
}

export function CsvImportResults({ result, onReset, onRetry, isRetrying = false }: CsvImportResultsProps) {
  const [activeTab, setActiveTab] = useState<'success' | 'skipped' | 'failed'>('success');
  const { success, skipped, failed, totalProcessed } = result;

  const successColumns = useMemo<ColumnDef<any>[]>(() => {
    if (success.length === 0) return [];
    const keys = Object.keys(success[0]);
    return keys.map((key, index) => ({
      id: `${key}_${index}`,
      accessorKey: key,
      header: key.replace(/_/g, ' '),
      cell: (info) => {
        const val = info.getValue() as string;
        return (
          <div className="truncate max-w-[200px]" title={val}>
            {val || <span className="text-slate-300 italic">Empty</span>}
          </div>
        );
      },
    }));
  }, [success]);

  const skippedColumns = useMemo<ColumnDef<any>[]>(() => {
    return [
      {
        accessorKey: 'reason',
        header: 'Skip Reason',
        cell: (info) => (
          <div className="font-medium text-red-600 max-w-[300px] whitespace-normal">
            {info.getValue() as string}
          </div>
        ),
      },
      {
        accessorKey: 'rawRow',
        header: 'Raw Row Data',
        cell: (info) => {
          const val = info.getValue();
          const displayStr = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
          return (
            <div className="truncate max-w-[400px] text-slate-500 font-mono text-xs" title={displayStr}>
              {displayStr}
            </div>
          );
        },
      },
    ];
  }, []);

  const failedColumns = useMemo(() => {
    return [
      {
        header: 'Error Reason',
        accessorFn: (row: any) => row.error,
        id: 'error_reason',
      },
      {
        header: 'Raw Row JSON',
        accessorFn: (row: any) => JSON.stringify(row.row),
        id: 'raw_row_json',
      }
    ];
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
      
      {/* ── Summary Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Processed</p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">{totalProcessed}</p>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-900/50 transition-colors">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium text-green-700 dark:text-green-400">Successfully Parsed</p>
          </div>
          <p className="text-2xl font-semibold text-green-700 dark:text-green-300 mt-1">{success.length}</p>
        </div>
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-900/50 transition-colors">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Skipped (Invalid)</p>
          </div>
          <p className="text-2xl font-semibold text-amber-700 dark:text-amber-300 mt-1">{skipped.length}</p>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50 transition-colors">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Failed Batches</p>
          </div>
          <p className="text-2xl font-semibold text-red-700 dark:text-red-300 mt-1">{failed.length}</p>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col transition-colors">
        
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 transition-colors">
          <button
            onClick={() => setActiveTab('success')}
            className={cn("flex-1 py-3 px-4 text-sm font-medium transition-colors border-b-2", activeTab === 'success' ? "bg-white dark:bg-slate-900 border-indigo-600 text-indigo-700 dark:text-indigo-400" : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200")}
          >
            Success ({success.length})
          </button>
          <button
            onClick={() => setActiveTab('skipped')}
            className={cn("flex-1 py-3 px-4 text-sm font-medium transition-colors border-b-2", activeTab === 'skipped' ? "bg-white dark:bg-slate-900 border-indigo-600 text-indigo-700 dark:text-indigo-400" : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200")}
          >
            Skipped ({skipped.length})
          </button>
          <button
            onClick={() => setActiveTab('failed')}
            className={cn("flex-1 py-3 px-4 text-sm font-medium transition-colors border-b-2", activeTab === 'failed' ? "bg-white dark:bg-slate-900 border-indigo-600 text-indigo-700 dark:text-indigo-400" : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200")}
          >
            Failed ({failed.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-[400px]">
          {activeTab === 'success' && (
            <DataTable columns={successColumns} data={success} emptyMessage="No successful records found." />
          )}
          {activeTab === 'skipped' && (
            <DataTable columns={skippedColumns} data={skipped} emptyMessage="No records were skipped." />
          )}
          {activeTab === 'failed' && (
            failed.length > 0 ? (
              <DataTable columns={failedColumns} data={failed} emptyMessage="No failed batches found." />
            ) : (
              <div className="p-12 text-center text-slate-500">No failed batches!</div>
            )
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-between items-center">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
          Start New Import
        </button>
        
        {failed.length > 0 && onRetry && (
          <button
            onClick={() => onRetry(failed.map(f => f.row))}
            disabled={isRetrying}
            className="inline-flex items-center justify-center min-w-[160px] gap-2 px-6 py-2.5 text-sm font-medium text-white transition-all bg-red-600 border border-transparent rounded-lg shadow-sm hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Retry Failed Rows
              </>
            )}
          </button>
        )}
      </div>

    </div>
  );
}
