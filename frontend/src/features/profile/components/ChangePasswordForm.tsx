'use client';
import { useState } from 'react';
import { apiCall } from '@/lib/http/client';
import { getPasswordError } from '@/features/profile/utils/validators';

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const validate = () => {
    if (!currentPassword) return 'Current password is required.';
    if (!newPassword) return 'New password is required.';
    const passwordError = getPasswordError(newPassword);
    if (passwordError) return `New ${passwordError.toLowerCase()}`;
    if (newPassword !== confirmNewPassword) return 'New password and confirm password do not match.';
    if (newPassword === currentPassword) return 'New password must be different from your current password.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSaving(true);
    const res = await apiCall('/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
    });
    setSaving(false);
    if (res.success) {
      setSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      setError(res.message || 'Failed to update password.');
    }
  };

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">{success}</p>}

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Current password</label>
        <div className="relative">
          <input
            type={showCurrent ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={() => setShowCurrent((prev) => !prev)}
            aria-label={showCurrent ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showCurrent ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">New password</label>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={() => setShowNew((prev) => !prev)}
            aria-label={showNew ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showNew ? '🙈' : '👁️'}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-400">Min 8 characters, with uppercase, lowercase, and a number.</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Confirm new password</label>
        <input
          type={showNew ? 'text' : 'password'}
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          autoComplete="new-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {saving ? 'Updating...' : 'Update Password'}
      </button>
    </form>
  );
}
