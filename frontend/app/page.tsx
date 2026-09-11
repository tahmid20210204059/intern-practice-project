'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      if (!getToken()) return;
      const res = await apiCall('/users/me');
      if (res.success) {
        router.push(res.data.role === 'admin' ? '/dashboard/admin' : '/dashboard/user');
      }
    };
    check();
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Dev Community</h1>
        <p style={styles.subtitle}>Connect. Share. Grow together.</p>
        <div style={styles.buttons}>
          <a href="/login" style={styles.loginBtn}>Log In</a>
          <a href="/signup" style={styles.signupBtn}>Sign Up</a>
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa', fontFamily: 'system-ui, sans-serif' },
  card: { textAlign: 'center' },
  title: { fontSize: '2.2rem', color: '#1a1a2e', margin: 0 },
  subtitle: { color: '#666', marginTop: '0.5rem' },
  buttons: { display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' },
  loginBtn: { padding: '0.7rem 1.8rem', border: '2px solid #4338ca', color: '#4338ca', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 },
  signupBtn: { padding: '0.7rem 1.8rem', background: '#4338ca', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 },
};