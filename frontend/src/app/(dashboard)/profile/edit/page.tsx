'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { apiCall } from '@/lib/http/client';
import Navbar from '@/components/layout/Navbar';
import PortfolioProjectsForm from '@/features/profile/components/PortfolioProjectsForm';

export default function EditProfilePage() {
  const [viewer, setViewer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
    <div className="min-h-screen bg-slate-50">
      <Navbar name={viewer.name} role={viewer.role} avatarUrl={viewer.avatarUrl} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/profile/me" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={15} />
          Back to profile
        </Link>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Portfolio Projects</h1>
          <p className="mt-1 text-sm text-slate-500">Add, edit, and remove the projects on your profile.</p>
        </div>
        <PortfolioProjectsForm />
      </main>
    </div>
  );
}
