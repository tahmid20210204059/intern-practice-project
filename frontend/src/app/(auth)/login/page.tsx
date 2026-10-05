'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { apiCall } from '@/lib/http/client';
import { saveSession } from '@/lib/auth';
import { loginSchema, LoginFormValues } from '@/features/auth/schemas/auth';

interface LoginResponseData {
  access_token: string;
  user: { id: string; name: string; email: string; role: 'user' | 'admin' };
}

function friendlyServerError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('too many')) return message;
  if (lower.includes('credentials') || lower.includes('invalid')) {
    return 'Email or password is incorrect. Please check both fields and try again.';
  }
  if (lower.includes('email')) return 'This email is not registered. Please sign up first.';
  if (lower.includes('password')) return 'Password is incorrect. Please check your password and try again.';
  return 'Login failed. Please check your email and password and try again.';
}

export default function Login() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    setSessionExpired(new URLSearchParams(window.location.search).get('reason') === 'expired');
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const res = await apiCall<LoginResponseData>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      if (!res.success) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (data) => {
      saveSession(data.access_token, data.user);
      router.push('/feed');
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.reset();
    setSessionExpired(false);
    loginMutation.mutate(values);
  };

  const isPending = loginMutation.isPending;
  const serverError = loginMutation.isError ? friendlyServerError((loginMutation.error as Error).message) : '';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        autoComplete="off"
        className="w-full max-w-sm rounded-lg bg-white p-8  "
      >
        <h1 className="text-xl font-bold text-slate-900">Welcome Back</h1>
        <p className="mt-1 text-sm text-slate-500">Log in to your account</p>

        {sessionExpired && !serverError && (
          <p role="status" aria-live="polite" className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Your session has expired. Please log in again to continue.
          </p>
        )}

        {serverError && (
          <p role="alert" aria-live="polite" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {serverError}
          </p>
        )}

        <div className="mt-4">
          <input
            type="email"
            placeholder="Email"
            autoComplete="username"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          {errors.email && (
            <p id="email-error" role="alert" className="mt-1 text-xs text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="relative mt-3">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
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
        {errors.password && (
          <p id="password-error" role="alert" className="mt-1 text-xs text-red-600">
            {errors.password.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="mt-5 w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? 'Logging in...' : 'Log In'}
        </button>

        <p className="mt-5 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <a href="/signup" className="font-semibold text-brand hover:underline">
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
}