'use client';

import React, { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ParsedCsvData } from './CsvUpload';
import { ArrowLeft, CheckCircle2, Database } from 'lucide-react';
import { AiProcessingLoader } from './AiProcessingLoader';
import { DataTable } from './DataTable';

interface CsvPreviewTableProps {
  data: ParsedCsvData;
  onConfirm: () => void;
  onCancel: () => void;
  isImporting: boolean;
}

export function CsvPreviewTable({ data, onConfirm, onCancel, isImporting }: CsvPreviewTableProps) {
  const columns = useMemo<ColumnDef<Record<string, string>>[]>(() => {
    return data.headers.map((header, index) => ({
      id: header ? `${header}_${index}` : `col_${index}`,
      accessorFn: (row) => row[header],
      header: header || '(Empty Header)',
      cell: (info) => {
        const val = info.getValue() as string;
        return (
          <div className="truncate max-w-[200px]" title={val}>
            {val || <span className="text-slate-300 italic">Empty</span>}
          </div>
        );
      },
    }));
  }, [data.headers]);

  return (
    <div className="w-full bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
      <div className="w-full p-6 flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            Data Preview
          </h3>
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-full border border-slate-200 dark:border-slate-700">
            {data.rowCount} row{data.rowCount !== 1 ? 's' : ''} detected
          </span>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <DataTable columns={columns} data={data.rows} emptyMessage="No rows to display." />
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
        {isImporting && (
          <div className="mb-4">
            <AiProcessingLoader rowCount={data.rowCount} />
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={isImporting}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isImporting || data.rows.length === 0}
            className="inline-flex items-center justify-center min-w-[140px] gap-2 px-5 py-2.5 text-sm font-medium text-white transition-all bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isImporting ? (
              <>Processing...</>
            ) : (
              <>
                Confirm Import
                <CheckCircle2 className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
