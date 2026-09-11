'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall } from '@/lib/api';
import { getToken, logout } from '@/lib/auth';

export default function UserDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      if (!getToken()) {
        router.push('/login');
        return;
      }
      const res = await apiCall('/users/me');
      if (!res.success) {
        logout();
        router.push('/login');
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

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading) return <div style={styles.center}>Loading...</div>;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h2 style={styles.headerTitle}>Dev Community</h2>
        <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </header>
      <main style={styles.main}>
        <div style={styles.card}>
          <h1 style={styles.name}>{profile.name}</h1>
          <p style={styles.email}>{profile.email}</p>
          <span style={styles.badge}>User</span>

          <div style={styles.section}>
            <h3>Skills</h3>
            <p style={styles.muted}>{profile.skills?.length ? profile.skills.join(', ') : 'No skills added yet.'}</p>
          </div>

          <div style={styles.section}>
            <h3>Experience</h3>
            <p style={styles.muted}>{profile.experiences?.length ? `${profile.experiences.length} entries` : 'No experience added yet.'}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles: any = {
  page: { minHeight: '100vh', background: '#f5f6fa', fontFamily: 'system-ui, sans-serif' },
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  headerTitle: { margin: 0, color: '#1a1a2e' },
  logoutBtn: { padding: '0.5rem 1.1rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  main: { padding: '2rem', display: 'flex', justifyContent: 'center' },
  card: { background: '#fff', padding: '2rem', borderRadius: '12px', width: '480px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  name: { margin: 0, color: '#1a1a2e' },
  email: { color: '#666', margin: '0.25rem 0 1rem' },
  badge: { display: 'inline-block', padding: '0.25rem 0.75rem', background: '#e0e7ff', color: '#4338ca', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 },
  section: { marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' },
  muted: { color: '#888', fontSize: '0.9rem' },
};