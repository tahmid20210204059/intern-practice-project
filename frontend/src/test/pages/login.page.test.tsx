import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '@/app/(auth)/login/page';
import { apiCall } from '@/lib/http/client';
import { clearSession, getAccessToken, getStoredUser } from '@/lib/auth';
import { deferred, fail, ok, renderWithClient } from '@/test/utils';

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: nav.push }) }));
vi.mock('@/lib/http/client', () => ({ apiCall: vi.fn(), apiUpload: vi.fn() }));
const apiCallMock = vi.mocked(apiCall);

const session = { access_token: 'tok', user: { id: '1', name: 'Ada', email: 'ada@example.com', role: 'user' } };

async function fill(user: ReturnType<typeof userEvent.setup>, email: string, password: string) {
  if (email) await user.type(screen.getByPlaceholderText('Email'), email);
  if (password) await user.type(screen.getByPlaceholderText('Password'), password);
}

beforeEach(() => {
  clearSession();
});

describe('Login page', () => {
  it('shows required-field errors and does not call the API', async () => {
    const user = userEvent.setup();
    renderWithClient(<Login />);

    await user.click(screen.getByRole('button', { name: 'Log In' }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(apiCallMock).not.toHaveBeenCalled();
  });

  it('shows an error for an invalid email format', async () => {
    const user = userEvent.setup();
    renderWithClient(<Login />);

    await fill(user, 'not-an-email', 'Password1');
    await user.click(screen.getByRole('button', { name: 'Log In' }));

    expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
    expect(apiCallMock).not.toHaveBeenCalled();
  });

  it('disables the submit button while the request is pending', async () => {
    const user = userEvent.setup();
    const pending = deferred<any>();
    apiCallMock.mockReturnValue(pending.promise);
    renderWithClient(<Login />);

    await fill(user, 'ada@example.com', 'Password1');
    await user.click(screen.getByRole('button', { name: 'Log In' }));

    expect(await screen.findByRole('button', { name: 'Logging in...' })).toBeDisabled();
    expect(apiCallMock).toHaveBeenCalledTimes(1);

    pending.resolve(ok(session));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/feed'));
  });

  it('stores the session and redirects to the feed on success', async () => {
    const user = userEvent.setup();
    apiCallMock.mockResolvedValue(ok(session));
    renderWithClient(<Login />);

    await fill(user, 'ada@example.com', 'Password1');
    await user.click(screen.getByRole('button', { name: 'Log In' }));

    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/feed'));
    expect(getAccessToken()).toBe('tok');
    expect(getStoredUser()).toEqual(session.user);
    const [path, options] = apiCallMock.mock.calls[0];
    expect(path).toBe('/auth/login');
    expect(options?.method).toBe('POST');
    expect(JSON.parse(options?.body as string)).toEqual({ email: 'ada@example.com', password: 'Password1' });
  });

  it('shows a friendly error and stays on the page for wrong credentials', async () => {
    const user = userEvent.setup();
    apiCallMock.mockResolvedValue(fail('Invalid credentials', 401));
    renderWithClient(<Login />);

    await fill(user, 'ada@example.com', 'WrongPass1');
    await user.click(screen.getByRole('button', { name: 'Log In' }));

    expect(await screen.findByText('Email or password is incorrect. Please check both fields and try again.')).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
    expect(screen.getByRole('button', { name: 'Log In' })).toBeEnabled();
  });

  it('shows a generic error for network failures', async () => {
    const user = userEvent.setup();
    apiCallMock.mockResolvedValue(fail('Network error: could not reach server', 0));
    renderWithClient(<Login />);

    await fill(user, 'ada@example.com', 'Password1');
    await user.click(screen.getByRole('button', { name: 'Log In' }));

    expect(await screen.findByText('Login failed. Please check your email and password and try again.')).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderWithClient(<Login />);
    const input = screen.getByPlaceholderText('Password');

    expect(input).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });
});
