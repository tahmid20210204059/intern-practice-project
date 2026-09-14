'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall } from '@/lib/api';
import { getToken } from '@/lib/auth';
import Navbar from '@/components/Navbar';

export default function AdminDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
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
    setActionMsg(null);
    const res = await apiCall(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    if (res.success) {
      setActionMsg({ type: 'success', text: 'Role updated successfully.' });
      loadUsers();
    } else {
      setActionMsg({ type: 'error', text: res.message || 'Action failed.' });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar name={profile.name} role={profile.role} avatarUrl={profile.avatarUrl} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
        <p className="mt-1 text-sm text-slate-500">Manage community members and their roles.</p>

        {actionMsg && (
          <p
            className={`mt-4 rounded-lg px-4 py-2 text-sm ${
              actionMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {actionMsg.text}
          </p>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="font-semibold text-slate-900">All Users</h2>
            <span className="text-sm text-slate-500">{users.length} total</span>
          </div>

          {users.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-slate-400">No users found.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium uppercase text-slate-400">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u._id}
                    onClick={() => router.push(`/profile/${u._id}`)}
                    className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="px-6 py-3 font-medium text-slate-900">{u.name}</td>
                    <td className="px-6 py-3 text-slate-600">{u.email}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          u.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {u.role === 'admin' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRoleChange(u._id, 'user');
                          }}
                          className="rounded-lg bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                        >
                          Demote
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRoleChange(u._id, 'admin');
                          }}
                          className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          Promote
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}