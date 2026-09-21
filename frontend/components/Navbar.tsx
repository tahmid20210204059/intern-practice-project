'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { apiCall } from '@/lib/api';
import { clearSession } from '@/lib/auth';
import { FEED_QUERY_KEY, useHasNewPosts, useMarkFeedSeen } from '@/lib/posts';
import NotificationBell from './NotificationBell';

interface NavbarProps {
  name: string;
  role: 'user' | 'admin';
  avatarUrl?: string;
}

export default function Navbar({ name, role, avatarUrl }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const dashboardHref = role === 'admin' ? '/dashboard/admin' : '/dashboard/user';
  const hasNewPosts = useHasNewPosts();
  const markFeedSeen = useMarkFeedSeen();

  const isDashboardActive = pathname === dashboardHref;
  const isFeedActive = pathname === '/feed';

  const handleLogout = async () => {
    await apiCall('/auth/logout', { method: 'POST' });
    clearSession();
    router.push('/login');
  };

  const handleFeedNavClick = () => {
    markFeedSeen();
    queryClient.resetQueries({ queryKey: FEED_QUERY_KEY });
    if (pathname === '/feed') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <Link href={dashboardHref} className="text-base font-semibold tracking-tight text-slate-900">
          Dev<span className="text-indigo-600">Community</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
          <Link
            href={dashboardHref}
            className={`hidden sm:inline ${isDashboardActive ? 'font-semibold text-indigo-600' : 'hover:text-indigo-600'}`}
          >
            Dashboard
          </Link>
          <Link
            href="/feed"
            onClick={handleFeedNavClick}
            className={`relative hidden sm:inline-block ${isFeedActive ? 'font-semibold text-indigo-600' : 'hover:text-indigo-600'}`}
          >
            Feed
            {hasNewPosts && (
              <span
                aria-label="New posts available"
                className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
              />
            )}
          </Link>
          <span
            className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium sm:inline-flex ${
              role === 'admin' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-indigo-200 bg-indigo-50 text-indigo-700'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${role === 'admin' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
            {role === 'admin' ? 'Admin' : 'User'}
          </span>
          <NotificationBell />
          <Link href="/profile/me" className="flex items-center gap-2">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="h-8 w-8 rounded-full object-cover ring-2 ring-white" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}