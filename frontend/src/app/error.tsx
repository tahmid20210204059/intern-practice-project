'use client';
import Link from 'next/link';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div role="alert" className="w-full max-w-sm rounded-lg bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-500">An unexpected error occurred. You can try again or reload the page.</p>
        {error.digest && <p className="mt-2 text-xs text-slate-400">Reference: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={reset} className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark">
            Try again
          </button>
          <Link href="/" className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}