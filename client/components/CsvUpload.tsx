'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileType, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export interface ParsedCsvData {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

interface CsvUploadProps {
  onUploadSuccess: (data: ParsedCsvData) => void;
}

export function CsvUpload({ onUploadSuccess }: CsvUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setError('Please upload a valid .csv file.');
      return;
    }

    setFile(selectedFile);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/csv/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload CSV');
      }

      const json = await res.json();
      if (json.success && json.data) {
        toast.success('File uploaded successfully!');
        onUploadSuccess(json.data);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err: any) {
      const errMsg = err.message || 'An unexpected error occurred during upload.';
      setError(errMsg);
      toast.error(errMsg);
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
    disabled: isUploading,
  });

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Upload CSV</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Upload your leads data to extract and import to the CRM.</p>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center w-full p-10 border-2 border-dashed rounded-xl cursor-pointer transition-colors duration-200 ease-in-out",
          isDragActive 
            ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20" 
            : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800",
          isUploading && "pointer-events-none opacity-60"
        )}
      >
        <input {...getInputProps()} />
        
        {isUploading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-indigo-500 dark:text-indigo-400 animate-spin" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Uploading and parsing file...</p>
          </div>
        ) : file ? (
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700">
              <FileType className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{file.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-base font-medium text-slate-700 dark:text-slate-300">
                <span className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">Click to upload</span> or drag and drop
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Only .csv files are supported</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg text-red-700 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}
