'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiCall } from '@/lib/api';
import { saveSession } from '@/lib/auth';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const validateSignup = () => {
    if (!name.trim()) return 'Full name is required.';
    if (!email.trim()) return 'Email is required.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Please enter a valid email address.';
    if (!password.trim()) return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters long.';
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
      saveSession(res.data.access_token, res.data.user);
      router.push('/dashboard/user');
      return;
    }

    const message = typeof res?.message === 'string' ? res.message : '';
    if (message.toLowerCase().includes('already registered')) {
      setError('This email is already registered. Please use a different email address.');
    } else if (message.toLowerCase().includes('email')) {
      setError('Email is invalid or already registered. Please check it and try again.');
    } else {
      setError('Signup failed. Please check your details and try again.');
    }

    setName('');
    setEmail('');
    setPassword('');
  };

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.card} autoComplete="off">
        <h1 style={styles.title}>Create Account</h1>
        <p style={styles.subtitle}>Join the Dev Community</p>
        {error && <p style={styles.error}>{error}</p>}

        <input
          style={styles.input}
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="off"
        />

        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <div style={styles.passwordWrap}>
          <input
            style={styles.passwordInput}
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            style={styles.eyeButton}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Sign Up'}
        </button>
        <p style={styles.linkText}>Already have an account? <a href="/login" style={styles.link}>Log in</a></p>
      </form>
    </div>
  );
}

const styles: any = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa', fontFamily: 'system-ui, sans-serif' },
  card: { background: '#fff', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', width: '340px' },
  title: { margin: 0, fontSize: '1.5rem', color: '#1a1a2e' },
  subtitle: { margin: '0.25rem 0 1.5rem', color: '#666', fontSize: '0.9rem' },
  input: { width: '100%', padding: '0.8rem 0.9rem', marginBottom: '0.9rem', border: '1px solid #dfe3e8', borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box', background: '#fff', color: '#1f2937' },
  passwordWrap: { position: 'relative', marginBottom: '0.9rem' },
  passwordInput: { width: '100%', padding: '0.8rem 2.8rem 0.8rem 0.9rem', border: '1px solid #dfe3e8', borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box', background: '#fff', color: '#1f2937' },
  eyeButton: { position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#4b5563' },
  button: { width: '100%', padding: '0.82rem', background: '#4338ca', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', marginTop: '0.1rem' },
  error: { color: '#dc2626', background: '#fee2e2', padding: '0.65rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' },
  linkText: { textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: '#666' },
  link: { color: '#4338ca', fontWeight: 600, textDecoration: 'none' },
};