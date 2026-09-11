'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall } from '@/lib/api';
import { getToken, logout } from '@/lib/auth';

export default function AdminDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const router = useRouter();

  const loadUsers = async () => {
    const res = await apiCall('/users');
    if (res.success) setUsers(res.data);
  };

  useEffect(() => {
    const load = async () => {
      if (!getToken()) {
        router.push('/login');
        return;
      }
      const me = await apiCall('/users/me');
      if (!me.success) {
        logout();
        router.push('/login');
        return;
      }
      if (me.data.role !== 'admin') {
        router.push('/dashboard/user');
        return;
      }
      setProfile(me.data);
      await loadUsers();
      setLoading(false);
    };
    load();
  }, []);

  const handleRoleChange = async (id: string, role: string) => {
    setActionMsg('');
    const res = await apiCall(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    if (res.success) {
      setActionMsg(`Updated successfully.`);
      loadUsers();
    } else {
      setActionMsg(res.message || 'Action failed');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading) return <div style={styles.center}>Loading...</div>;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h2 style={styles.headerTitle}>Dev Community — Admin Panel</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={styles.adminName}>{profile.name}</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <main style={styles.main}>
        {actionMsg && <p style={styles.actionMsg}>{actionMsg}</p>}
        <div style={styles.tableCard}>
          <h3 style={{ marginTop: 0 }}>All Users ({users.length})</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td style={styles.td}>{u.name}</td>
                  <td style={styles.td}>{u.email}</td>
                  <td style={styles.td}>
                    <span style={u.role === 'admin' ? styles.adminBadge : styles.userBadge}>{u.role}</span>
                  </td>
                  <td style={styles.td}>
                    {u.role === 'admin' ? (
                      <button style={styles.demoteBtn} onClick={() => handleRoleChange(u._id, 'user')}>
                        Demote
                      </button>
                    ) : (
                      <button style={styles.promoteBtn} onClick={() => handleRoleChange(u._id, 'admin')}>
                        Promote
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

const styles: any = {
  page: { minHeight: '100vh', background: '#f5f6fa', fontFamily: 'system-ui, sans-serif' },
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: '#1a1a2e' },
  headerTitle: { margin: 0, color: '#fff' },
  adminName: { color: '#fff', fontSize: '0.9rem' },
  logoutBtn: { padding: '0.5rem 1.1rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  main: { padding: '2rem' },
  actionMsg: { background: '#e0e7ff', color: '#4338ca', padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  tableCard: { background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '0.6rem', borderBottom: '2px solid #eee', color: '#666', fontSize: '0.85rem' },
  td: { padding: '0.6rem', borderBottom: '1px solid #f0f0f0', fontSize: '0.9rem' },
  adminBadge: { background: '#dcfce7', color: '#16a34a', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 },
  userBadge: { background: '#e0e7ff', color: '#4338ca', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 },
  promoteBtn: { padding: '0.35rem 0.8rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' },
  demoteBtn: { padding: '0.35rem 0.8rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' },
};