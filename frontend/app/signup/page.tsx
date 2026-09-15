'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { apiCall } from '@/lib/api';
import { saveSession } from '@/lib/auth';
import { signupSchema, SignupFormValues } from '@/lib/schemas';

interface SignupResponseData {
  access_token: string;
  user: { id: string; name: string; email: string; role: 'user' | 'admin' };
}

function friendlyServerError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('already registered')) {
    return 'This email is already registered. Please use a different email address.';
  }
  if (lower.includes('password')) return message;
  if (lower.includes('email')) return 'Email is invalid or already registered. Please check it and try again.';
  return 'Signup failed. Please check your details and try again.';
}

export default function Signup() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) });

  const signupMutation = useMutation({
    mutationFn: async (values: SignupFormValues) => {
      const res = await apiCall<SignupResponseData>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name: values.name.trim(), email: values.email.trim(), password: values.password }),
      });
      if (!res.success) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (data) => {
      saveSession(data.access_token, data.user);
      router.push('/dashboard/user');
    },
  });

  const onSubmit = (values: SignupFormValues) => {
    signupMutation.reset();
    signupMutation.mutate(values);
  };

  const isPending = signupMutation.isPending;
  const serverError = signupMutation.isError ? friendlyServerError((signupMutation.error as Error).message) : '';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        autoComplete="off"
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100"
      >
        <h1 className="text-xl font-bold text-slate-900">Create Account</h1>
        <p className="mt-1 text-sm text-slate-500">Join the Dev Community</p>

        {serverError && (
          <p role="alert" aria-live="polite" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {serverError}
          </p>
        )}

        <div className="mt-4">
          <input
            placeholder="Full Name"
            autoComplete="off"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
            {...register('name')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          {errors.name && (
            <p id="name-error" role="alert" className="mt-1 text-xs text-red-600">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="mt-3">
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
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
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
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
        {errors.password ? (
          <p id="password-error" role="alert" className="mt-1 text-xs text-red-600">
            {errors.password.message}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-slate-400">Min 8 characters, with uppercase, lowercase, and a number.</p>
        )}

        <div className="mt-3">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm Password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
            {...register('confirmPassword')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          {errors.confirmPassword && (
            <p id="confirm-password-error" role="alert" className="mt-1 text-xs text-red-600">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-5 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {isPending ? 'Creating...' : 'Sign Up'}
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