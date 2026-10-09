'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Home, ScrollText, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { apiCall } from '@/lib/http/client';
import { clearSession } from '@/lib/auth';
import { FEED_QUERY_KEY, useHasNewPosts, useMarkFeedSeen } from '@/features/posts/queries/posts';
import NotificationBell from '@/features/notifications/components/NotificationBell';
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
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasNewPosts = useHasNewPosts();
  const markFeedSeen = useMarkFeedSeen();
  const isFeedActive = pathname === '/feed';
  const isSearchActive = pathname === '/search';
  const isChangelogActive = pathname === '/changelog';
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);
  const handleLogout = async () => {
    await apiCall('/auth/logout', { method: 'POST' });
    clearSession();
    queryClient.clear();
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
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-3.5 sm:px-6">
        <Link href={dashboardHref} className="shrink-0 text-sm font-bold tracking-tight text-slate-900 sm:text-base">
          Dev<span className="text-brand">Community</span>
        </Link>
        <nav className="flex items-center gap-1 sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:gap-4">
          <Link
            href="/feed"
            onClick={handleFeedNavClick}
            aria-label="Feed"
            className={`relative inline-flex border-b-2 p-2 ${isFeedActive ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            <Home size={18} />
            {hasNewPosts && <span aria-label="New posts available" className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />}
          </Link>
          <Link
            href="/search"
            aria-label="Search"
            className={`inline-flex border-b-2 p-2 ${isSearchActive ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            <Search size={18} />
          </Link>
          <Link
            href="/changelog"
            aria-label="Changelog"
            className={`inline-flex border-b-2 p-2 ${isChangelogActive ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            <ScrollText size={18} />
          </Link>
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <NotificationBell />
          <div ref={menuRef} className="relative">
            <button type="button" onClick={() => setOpen((value) => !value)} aria-label="Open profile menu" className="flex items-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="h-8 w-8 rounded-full object-cover ring-2 ring-white" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
            </button>
            {open && <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg">
              <Link href="/profile/me" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900">Profile</Link>
              <Link href={dashboardHref} onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900">{role === 'admin' ? 'Admin Panel' : 'Dashboard'}</Link>
              <button type="button" onClick={handleLogout} className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">Logout</button>
            </div>}
          </div>
        </div>
      </div>
    </header>
  );
}