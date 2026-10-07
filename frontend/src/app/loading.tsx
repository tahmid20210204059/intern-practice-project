export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50" role="status" aria-live="polite">
      <p className="text-sm font-medium text-slate-500">Loading...</p>
    </div>
  );
}