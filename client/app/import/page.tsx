'use client';

import React, { useState } from 'react';
import { CsvUpload, ParsedCsvData } from '../../components/CsvUpload';
import { CsvPreviewTable } from '../../components/CsvPreviewTable';
import { CsvImportResults, ImportResultData } from '../../components/CsvImportResults';
import { Header } from '../../components/Header';
import { CheckCircle2, ChevronRight, XCircle } from 'lucide-react';
import { toast } from 'sonner';

enum Step {
  Upload = 1,
  Preview = 2,
  Result = 3,
}

export default function ImportPage() {
  const [currentStep, setCurrentStep] = useState<Step>(Step.Upload);
  const [csvData, setCsvData] = useState<ParsedCsvData | null>(null);
  const [importResult, setImportResult] = useState<ImportResultData | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleUploadSuccess = (data: ParsedCsvData) => {
    setCsvData(data);
    setCurrentStep(Step.Preview);
  };

  const handleConfirmImport = async () => {
    if (!csvData || isImporting) return;
    setIsImporting(true);
    setImportError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/csv/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headers: csvData.headers,
          rows: csvData.rows,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Too many requests — please wait a moment and try again.');
        } else if (res.status >= 500) {
          throw new Error('Server error occurred while processing the request. Please try again.');
        } else {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Import failed.');
        }
      }

      const json = await res.json();
      setImportResult({
        success: json.success || [],
        skipped: json.skipped || [],
        failed: json.failed || [],
        totalProcessed: json.totalProcessed || 0,
      });
      toast.success('Import completed successfully!');
      setCurrentStep(Step.Result);
    } catch (err: any) {
      let errorMsg = err.message || 'Failed to import data. Please try again.';
      if (err.name === 'AbortError') {
        errorMsg = 'This is taking longer than expected. The AI service may be under heavy load.';
      } else if (err.message === 'Failed to fetch' || err.message.includes('fetch')) {
        errorMsg = 'Network error: Unable to reach the server. Please check your connection.';
      }
      setImportError(errorMsg);
      toast.error(errorMsg);
    } finally {
      clearTimeout(timeoutId);
      setIsImporting(false);
    }
  };

  const handleCancel = () => {
    setCsvData(null);
    setCurrentStep(Step.Upload);
    setImportError(null);
  };

  const handleRetryFailedRows = async (failedRows: Record<string, string>[]) => {
    if (!csvData) return;
    
    setIsRetrying(true);
    setImportError(null);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    try {
      const res = await fetch(`${apiUrl}/api/csv/import/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headers: csvData.headers,
          rows: failedRows,
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Too many requests — please wait a moment and try again.');
        } else if (res.status >= 500) {
          throw new Error('Server error occurred while retrying. Please try again.');
        } else {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Retry failed.');
        }
      }

      const json = await res.json();
      toast.success(`Retry complete! ${json.success?.length || 0} successfully parsed.`);
      
      // Merge results
      setImportResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          success: [...prev.success, ...(json.success || [])],
          skipped: [...prev.skipped, ...(json.skipped || [])],
          failed: json.failed || [], // Replace failed entirely with the new failed list
        };
      });
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to retry data. Please try again.';
      setImportError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsRetrying(false);
    }
  };

  const resetFlow = () => {
    setCsvData(null);
    setImportResult(null);
    setCurrentStep(Step.Upload);
    setImportError(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors">Import Leads</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400 transition-colors">
            Upload your CSV file, preview the data, and securely import leads into the CRM.
          </p>
        </div>

        {/* Stepper Header */}
        <div className="mb-10 flex items-center gap-2 text-sm font-medium">
          <div className={`flex items-center gap-2 ${currentStep >= Step.Upload ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} transition-colors`}>
            <div className={`flex items-center justify-center w-6 h-6 rounded-full ${currentStep >= Step.Upload ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-slate-100 dark:bg-slate-800'} transition-colors`}>
              1
            </div>
            Upload CSV
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-700" />
          
          <div className={`flex items-center gap-2 ${currentStep >= Step.Preview ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} transition-colors`}>
            <div className={`flex items-center justify-center w-6 h-6 rounded-full ${currentStep >= Step.Preview ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-slate-100 dark:bg-slate-800'} transition-colors`}>
              2
            </div>
            Preview Data
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-700" />

          <div className={`flex items-center gap-2 ${currentStep >= Step.Result ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} transition-colors`}>
            <div className={`flex items-center justify-center w-6 h-6 rounded-full ${currentStep >= Step.Result ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-slate-100 dark:bg-slate-800'} transition-colors`}>
              3
            </div>
            Results
          </div>
        </div>

        {/* Global Error Banner */}
        {importError && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 dark:text-red-200">
                <span className="font-semibold block mb-1">Import Error</span>
                {importError}
              </div>
            </div>
          </div>
        )}

        <div className="w-full relative min-h-[400px]">
          {currentStep === Step.Upload && (
            <CsvUpload onUploadSuccess={handleUploadSuccess} />
          )}

          {currentStep === Step.Preview && csvData && (
            <CsvPreviewTable 
              data={csvData} 
              onConfirm={handleConfirmImport} 
              onCancel={resetFlow} 
              isImporting={isImporting}
            />
          )}

          {currentStep === Step.Result && importResult && (
            <CsvImportResults 
              result={importResult} 
              onReset={resetFlow} 
              onRetry={handleRetryFailedRows}
              isRetrying={isRetrying}
            />
          )}
        </div>
      </main>
    </div>
  );
}
