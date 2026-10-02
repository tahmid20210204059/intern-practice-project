import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Signup from '@/app/(auth)/signup/page';
import { apiCall } from '@/lib/http/client';
import { clearSession, getAccessToken, getStoredUser } from '@/lib/auth';
import { deferred, fail, ok, renderWithClient } from '@/test/utils';

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: nav.push }) }));
vi.mock('@/lib/http/client', () => ({ apiCall: vi.fn(), apiUpload: vi.fn() }));
const apiCallMock = vi.mocked(apiCall);

const session = { access_token: 'tok', user: { id: '1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'user' } };

async function fill(user: ReturnType<typeof userEvent.setup>, values: { name?: string; email?: string; password?: string; confirm?: string }) {
  if (values.name) await user.type(screen.getByPlaceholderText('Full Name'), values.name);
  if (values.email) await user.type(screen.getByPlaceholderText('Email'), values.email);
  if (values.password) await user.type(screen.getByPlaceholderText('Password'), values.password);
  if (values.confirm) await user.type(screen.getByPlaceholderText('Confirm Password'), values.confirm);
}

const valid = { name: '  Ada Lovelace  ', email: 'ada@example.com', password: 'Password1', confirm: 'Password1' };

beforeEach(() => {
  clearSession();
});

describe('Signup page', () => {
  it('shows required-field errors without calling the API', async () => {
    const user = userEvent.setup();
    renderWithClient(<Signup />);

    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(await screen.findByText('Full name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
    expect(apiCallMock).not.toHaveBeenCalled();
  });

  it('shows the password strength error instead of the hint', async () => {
    const user = userEvent.setup();
    renderWithClient(<Signup />);

    await fill(user, { name: 'Ada', email: 'ada@example.com', password: 'short', confirm: 'short' });
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(screen.queryByText('Min 8 characters, with uppercase, lowercase, and a number.')).not.toBeInTheDocument();
    expect(apiCallMock).not.toHaveBeenCalled();
  });

  it('shows a mismatch error on the confirmation field', async () => {
    const user = userEvent.setup();
    renderWithClient(<Signup />);

    await fill(user, { name: 'Ada', email: 'ada@example.com', password: 'Password1', confirm: 'Password2' });
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(apiCallMock).not.toHaveBeenCalled();
  });

  it('disables the button while the request is pending', async () => {
    const user = userEvent.setup();
    const pending = deferred<any>();
    apiCallMock.mockReturnValue(pending.promise);
    renderWithClient(<Signup />);

    await fill(user, valid);
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(await screen.findByRole('button', { name: 'Creating...' })).toBeDisabled();

    pending.resolve(ok(session));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/feed'));
  });

  it('sends trimmed data without the confirmation, stores the session and redirects', async () => {
    const user = userEvent.setup();
    apiCallMock.mockResolvedValue(ok(session));
    renderWithClient(<Signup />);

    await fill(user, valid);
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/feed'));
    const [path, options] = apiCallMock.mock.calls[0];
    expect(path).toBe('/auth/signup');
    expect(JSON.parse(options?.body as string)).toEqual({ name: 'Ada Lovelace', email: 'ada@example.com', password: 'Password1' });
    expect(getAccessToken()).toBe('tok');
    expect(getStoredUser()).toEqual(session.user);
  });

  it('shows a friendly message for an already registered email', async () => {
    const user = userEvent.setup();
    apiCallMock.mockResolvedValue(fail('Email already registered', 409));
    renderWithClient(<Signup />);

    await fill(user, valid);
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(await screen.findByText('This email is already registered. Please use a different email address.')).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sign Up' })).toBeEnabled();
  });

  it('shows a generic message for unknown server errors', async () => {
    const user = userEvent.setup();
    apiCallMock.mockResolvedValue(fail('Something exploded', 500));
    renderWithClient(<Signup />);

    await fill(user, valid);
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(await screen.findByText('Signup failed. Please check your details and try again.')).toBeInTheDocument();
  });

  it('toggles visibility for both password fields', async () => {
    const user = userEvent.setup();
    renderWithClient(<Signup />);

    await user.click(screen.getByRole('button', { name: 'Show password' }));

    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'text');
    expect(screen.getByPlaceholderText('Confirm Password')).toHaveAttribute('type', 'text');
  });
});
