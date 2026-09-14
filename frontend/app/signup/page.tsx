'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall } from '@/lib/api';
import { saveSession } from '@/lib/auth';
import { getPasswordError, isValidEmail } from '@/lib/validators';
import { Eye, EyeOff } from "lucide-react";

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const validateSignup = () => {
    if (!name.trim()) return 'Full name is required.';
    if (!email.trim()) return 'Email is required.';
    if (!isValidEmail(email)) return 'Please enter a valid email address.';
    const passwordError = getPasswordError(password);
    if (passwordError) return passwordError;
    if (password !== confirmPassword) return 'Password and confirm password do not match.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateSignup();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);
    const res = await apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
    });
    setLoading(false);

    if (res.success) {
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      saveSession(res.data.access_token, res.data.user);
      router.push('/dashboard/user');
      return;
    }

    const message = typeof res?.message === 'string' ? res.message : '';
    if (message.toLowerCase().includes('already registered')) {
      setError('This email is already registered. Please use a different email address.');
    } else if (message.toLowerCase().includes('password')) {
      setError(message);
    } else if (message.toLowerCase().includes('email')) {
      setError('Email is invalid or already registered. Please check it and try again.');
    } else {
      setError('Signup failed. Please check your details and try again.');
    }

    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100"
      >
        <h1 className="text-xl font-bold text-slate-900">Create Account</h1>
        <p className="mt-1 text-sm text-slate-500">Join the Dev Community</p>

        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <input
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="off"
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />

        <div className="relative mt-3">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-slate-400">Min 8 characters, with uppercase, lowercase, and a number.</p>

        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Creating...' : 'Sign Up'}
        </button>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <a href="/login" className="font-semibold text-indigo-600 hover:underline">
            Log in
          </a>
        </p>
      </form>
    </div>
  );
}