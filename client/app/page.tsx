import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Header } from '../components/Header';

export const metadata: Metadata = {
  title: 'Home',
};

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex min-[calc(100vh-64px)] flex-col items-center justify-center p-8 text-center bg-transparent">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white transition-colors">
            GrowEasy
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium transition-colors">
            AI-powered CRM CSV importer to seamlessly map your leads into structured data.
          </p>
          
          <div className="pt-4">
            <Link
              href="/import"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-white transition-all bg-indigo-600 rounded-xl shadow-sm hover:bg-indigo-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Start Import
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
