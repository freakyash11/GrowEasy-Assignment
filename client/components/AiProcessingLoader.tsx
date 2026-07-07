'use client';

import React, { useEffect, useState } from 'react';

const BATCH_SIZE = 20;
const AVG_SECONDS_PER_BATCH = 3;

const STATUS_TEXTS = [
  'Mapping fields...',
  'Validating records...',
  'Analyzing context...',
  'Extracting entities...',
  'Almost done...',
];

interface AiProcessingLoaderProps {
  rowCount: number;
}

export function AiProcessingLoader({ rowCount }: AiProcessingLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);

  const estimatedTotalSeconds = Math.max(1, Math.ceil(rowCount / BATCH_SIZE) * AVG_SECONDS_PER_BATCH);
  const estimatedTotalMs = estimatedTotalSeconds * 1000;

  useEffect(() => {
    const startTime = Date.now();

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      let calculatedProgress = (elapsed / estimatedTotalMs) * 100;
      
      if (calculatedProgress > 95) {
        calculatedProgress = 95;
      }
      
      setProgress(calculatedProgress);
    }, 500);

    const textInterval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % STATUS_TEXTS.length);
    }, 3000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(textInterval);
    };
  }, [estimatedTotalMs]);

  return (
    <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-slate-700">
          Processing {rowCount} records with AI...
        </span>
        <span className="text-xs font-semibold text-indigo-600">
          {Math.round(progress)}%
        </span>
      </div>
      
      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="mt-2 text-xs text-slate-500 italic transition-opacity duration-300">
        {STATUS_TEXTS[statusIndex]}
      </div>
    </div>
  );
}
