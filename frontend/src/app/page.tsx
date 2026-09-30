'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall } from '@/lib/http/client';

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
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-slate-900">
          Dev<span className="text-brand">Community</span>
        </h1>
        <p className="mt-3 text-slate-500">Connect. Share. Grow together.</p>
        <div className="mt-8 flex justify-center gap-4">
          <a href="/login" className="rounded-lg border-2 border-brand px-6 py-2.5 font-semibold text-brand transition hover:bg-brand/10">Log In</a>
          <a href="/signup" className="rounded-lg bg-brand px-6 py-2.5 font-semibold text-white transition hover:bg-brand-dark">Sign Up</a>
        </div>
      </div>
    </div>
  );
}
