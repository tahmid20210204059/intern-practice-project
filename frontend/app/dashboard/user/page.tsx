'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiCall } from '@/lib/api';
import { getToken } from '@/lib/auth';
import Navbar from '@/components/Navbar';

export default function UserDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      if (!getToken()) {
        router.push('/login');
        return;
      }
      const res = await apiCall('/users/me');
      if (!res.success) {
        setError(res.message || 'Could not load your dashboard.');
        setLoading(false);
        return;
      }
      if (res.data.role === 'admin') {
        router.push('/dashboard/admin');
        return;
      }
      setProfile(res.data);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar name={profile.name} role={profile.role} avatarUrl={profile.avatarUrl} />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-white shadow-sm">
          <h1 className="text-2xl font-bold">Welcome back, {profile.name.split(' ')[0]}</h1>
          <p className="mt-1 text-indigo-100">
            Keep your profile up to date so other developers can find and connect with you.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <p className="text-sm font-medium text-slate-500">Skills listed</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{profile.skills?.length || 0}</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <p className="text-sm font-medium text-slate-500">Experience entries</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{profile.experiences?.length || 0}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Your Profile</h2>
          <p className="mt-1 text-sm text-slate-500">View or edit your skills, experience, and details.</p>
          <Link
            href="/profile/me"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Go to My Profile
          </Link>
        </div>
      </main>
    </div>
  );
}