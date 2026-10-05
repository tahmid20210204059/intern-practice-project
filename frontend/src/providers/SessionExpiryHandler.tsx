'use client';
import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { SESSION_EXPIRED_EVENT } from '@/lib/auth';

const PUBLIC_PATHS = ['/', '/login', '/signup', '/status'];

export default function SessionExpiryHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const pathRef = useRef(pathname);
  const handledRef = useRef(false);

  useEffect(() => {
    pathRef.current = pathname;
    if (pathname === '/login' || pathname === '/signup') handledRef.current = false;
  }, [pathname]);

  useEffect(() => {
    const onExpired = () => {
      if (handledRef.current) return;
      if (PUBLIC_PATHS.includes(pathRef.current)) return;
      handledRef.current = true;
      setTimeout(() => {
        router.replace('/login?reason=expired');
        queryClient.clear();
      }, 50);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [queryClient, router]);

  return null;
}