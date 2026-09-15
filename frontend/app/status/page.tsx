'use client';
import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/lib/api';

interface HealthData {
  status: string;
  database: string;
}

export default function StatusPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await apiCall<HealthData>('/health');
      if (!res.success) throw new Error(res.message);
      return res.data;
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
        <h1 className="text-xl font-bold text-slate-900">System Status</h1>

        {isLoading && <p className="mt-4 text-sm text-slate-500">Checking status...</p>}

        {isError && (
          <div className="mt-4">
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              Backend unavailable: {(error as Error).message}
            </p>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {isFetching ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        )}

        {data && (
          <div className="mt-4 space-y-2">
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">API: {data.status}</p>
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                data.database === 'connected' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              Database: {data.database}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}