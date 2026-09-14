'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { apiCall } from '@/lib/api';
import { saveSession } from '@/lib/auth';
import { isValidEmail } from '@/lib/validators';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const validateLogin = () => {
    if (!email.trim()) return 'Email is required.';
    if (!isValidEmail(email.trim())) return 'Please enter a valid email address.';
    if (!password.trim()) return 'Password is required.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateLogin();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);
    const res = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    });
    setLoading(false);

    if (res.success) {
      setEmail('');
      setPassword('');
      saveSession(res.data.access_token, res.data.user);
      router.push(res.data.user.role === 'admin' ? '/dashboard/admin' : '/dashboard/user');
      return;
    }

    const message = typeof res?.message === 'string' ? res.message : '';
    if (message.toLowerCase().includes('credentials') || message.toLowerCase().includes('invalid')) {
      setError('Email or password is incorrect. Please check both fields and try again.');
    } else if (message.toLowerCase().includes('email')) {
      setError('This email is not registered. Please sign up first.');
    } else if (message.toLowerCase().includes('password')) {
      setError('Password is incorrect. Please check your password and try again.');
    } else {
      setError('Login failed. Please check your email and password and try again.');
    }

    setEmail('');
    setPassword('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100"
      >
        <h1 className="text-xl font-bold text-slate-900">Welcome Back</h1>
        <p className="mt-1 text-sm text-slate-500">Log in to your account</p>

        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />

        <div className="relative mt-3">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>

        <p className="mt-5 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <a href="/signup" className="font-semibold text-indigo-600 hover:underline">
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
}