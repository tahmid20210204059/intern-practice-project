'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall } from '@/lib/api';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const res = await apiCall('/users/me');
      if (res.success) {
        router.push('/feed');
      }
    };
    check();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 px-6">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          Dev<span className="text-indigo-600">Community</span>
        </h1>
        <p className="mt-3 text-slate-500">Connect. Share. Grow together.</p>
        <div className="mt-8 flex justify-center gap-4">
          <a href="/login" className="rounded-lg border-2 border-indigo-600 px-6 py-2.5 font-semibold text-indigo-600 transition hover:bg-indigo-50">Log In</a>
          <a href="/signup" className="rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white transition hover:bg-indigo-700">Sign Up</a>
        </div>
      </div>
    </div>
  );
}