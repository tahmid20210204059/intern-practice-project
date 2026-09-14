'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/auth';
import NotificationBell from './NotificationBell';

interface NavbarProps {
  name: string;
  role: 'user' | 'admin';
  avatarUrl?: string;
}

export default function Navbar({ name, role, avatarUrl }: NavbarProps) {
  const router = useRouter();
  const dashboardHref = role === 'admin' ? '/dashboard/admin' : '/dashboard/user';

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <Link href={dashboardHref} className="text-lg font-bold text-slate-900">
          Dev<span className="text-indigo-600">Community</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
          <Link href={dashboardHref} className="hover:text-indigo-600">Dashboard</Link>
          <Link href="/profile/me" className="hover:text-indigo-600">My Profile</Link>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
            {role}
          </span>
          <NotificationBell />
          <Link href="/profile/me" className="flex items-center gap-2">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="h-8 w-8 rounded-full object-cover ring-2 ring-white" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </Link>
          <button onClick={handleLogout} className="rounded-lg bg-red-50 px-3 py-1.5 text-red-600 transition hover:bg-red-100">
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}