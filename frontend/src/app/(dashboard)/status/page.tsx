'use client';
import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/lib/http/client';

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
      <div className="w-full max-w-sm rounded-lg bg-white p-8 text-center  ">
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
              className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {isFetching ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        )}

        {data && (
          <div className="mt-4 space-y-2">
            <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">API: {data.status}</p>
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                data.database === 'connected' ? 'bg-brand/10 text-brand' : 'bg-slate-50 text-slate-600'
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
