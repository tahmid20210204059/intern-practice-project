import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-brand">404</p>
        <h1 className="mt-2 text-xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500">The page you are looking for does not exist or was moved.</p>
        <Link href="/feed" className="mt-6 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark">
          Back to feed
        </Link>
      </div>
    </div>
  );
}