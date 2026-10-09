'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall } from '@/lib/http/client';
import Navbar from '@/components/layout/Navbar';
import ChangelogView from '@/features/changelog/components/ChangelogView';

export default function ChangelogPage() {
  const router = useRouter();
  const [viewer, setViewer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      const res = await apiCall('/users/me');
      if (!res.success) {
        router.push('/login');
        return;
      }
      setViewer(res.data);
      setLoading(false);
    };
    load();
  }, []);
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">Loading...</p>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-white">
      <Navbar name={viewer.name} role={viewer.role} avatarUrl={viewer.avatarUrl} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Changelog</h1>
          <p className="mt-1 text-sm text-slate-500">The last pull request merged into main, synced from GitHub and stored in our database.</p>
        </div>
        <ChangelogView />
      </main>
    </div>
  );
}
