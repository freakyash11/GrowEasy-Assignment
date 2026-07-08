'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { CheckCircle2, RotateCcw, AlertCircle, XCircle, AlertTriangle, ArrowLeft, RefreshCw, Search, X } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { success, skipped, failed, totalProcessed } = result;

  // Debounce the search query by 150 ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toLowerCase());
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Client-side filtered success records
  const filteredSuccess = useMemo(() => {
    if (!debouncedQuery) return success;
    return success.filter((record) => {
      const email = (record['email'] ?? '').toLowerCase();
      const mobile = (record['mobile_without_country_code'] ?? '').toLowerCase();
      return email.includes(debouncedQuery) || mobile.includes(debouncedQuery);
    });
  }, [success, debouncedQuery]);

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
        
        {/* Tab Headers + Search Bar */}
        <div className="flex flex-wrap items-stretch border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 transition-colors gap-y-0">
          {/* Tabs (left) */}
          <div className="flex flex-1 min-w-0">
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

          {/* Search bar — only visible on the Success tab */}
          {activeTab === 'success' && (
            <div className="flex items-center gap-2 px-3 py-2 border-b-2 border-transparent">
              {/* Showing X of Y label */}
              {debouncedQuery && (
                <span className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {filteredSuccess.length} / {success.length}
                </span>
              )}
              {/* Input wrapper */}
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter email or phone number..."
                  className="pl-8 pr-7 py-1.5 w-56 text-xs rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2 flex items-center justify-center w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors"
                  >
                    <X className="w-2.5 h-2.5 text-slate-600 dark:text-slate-300" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="overflow-hidden flex flex-col">
          {activeTab === 'success' && (
            <DataTable
              columns={successColumns}
              data={filteredSuccess}
              emptyMessage={
                debouncedQuery
                  ? 'No leads match your search.'
                  : 'No successful records found.'
              }
            />
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
