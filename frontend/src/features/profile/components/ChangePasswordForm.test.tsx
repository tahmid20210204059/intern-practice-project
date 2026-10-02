import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChangePasswordForm from '@/features/profile/components/ChangePasswordForm';
import { apiCall } from '@/lib/http/client';
import { deferred, fail, ok } from '@/test/utils';

vi.mock('@/lib/http/client', () => ({ apiCall: vi.fn(), apiUpload: vi.fn() }));
const apiCallMock = vi.mocked(apiCall);

function setup() {
  const user = userEvent.setup();
  const view = render(<ChangePasswordForm />);
  const inputs = Array.from(view.container.querySelectorAll('input')) as HTMLInputElement[];
  return { user, inputs, current: inputs[0], next: inputs[1], confirm: inputs[2] };
}

const submit = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Update Password' }));

describe('ChangePasswordForm', () => {
  it('requires the current password first', async () => {
    const { user } = setup();
    await submit(user);
    expect(await screen.findByText('Current password is required.')).toBeInTheDocument();
    expect(apiCallMock).not.toHaveBeenCalled();
  });

  it('requires a new password', async () => {
    const { user, current } = setup();
    await user.type(current, 'OldPass1');
    await submit(user);
    expect(await screen.findByText('New password is required.')).toBeInTheDocument();
  });

  it('rejects a weak new password', async () => {
    const { user, current, next, confirm } = setup();
    await user.type(current, 'OldPass1');
    await user.type(next, 'weak');
    await user.type(confirm, 'weak');
    await submit(user);
    expect(await screen.findByText(/^New password must be at least 8 characters/)).toBeInTheDocument();
    expect(apiCallMock).not.toHaveBeenCalled();
  });

  it('rejects mismatched confirmation', async () => {
    const { user, current, next, confirm } = setup();
    await user.type(current, 'OldPass1');
    await user.type(next, 'NewPass1');
    await user.type(confirm, 'NewPass2');
    await submit(user);
    expect(await screen.findByText('New password and confirm password do not match.')).toBeInTheDocument();
    expect(apiCallMock).not.toHaveBeenCalled();
  });

  it('rejects reusing the current password', async () => {
    const { user, current, next, confirm } = setup();
    await user.type(current, 'SamePass1');
    await user.type(next, 'SamePass1');
    await user.type(confirm, 'SamePass1');
    await submit(user);
    expect(await screen.findByText('New password must be different from your current password.')).toBeInTheDocument();
    expect(apiCallMock).not.toHaveBeenCalled();
  });

  it('disables the button while saving, then shows success and clears the fields', async () => {
    const pending = deferred<any>();
    apiCallMock.mockReturnValue(pending.promise);
    const { user, current, next, confirm } = setup();
    await user.type(current, 'OldPass1');
    await user.type(next, 'NewPass1');
    await user.type(confirm, 'NewPass1');
    await submit(user);

    expect(await screen.findByRole('button', { name: 'Updating...' })).toBeDisabled();
    const [path, options] = apiCallMock.mock.calls[0];
    expect(path).toBe('/users/me/password');
    expect(options?.method).toBe('PATCH');
    expect(JSON.parse(options?.body as string)).toEqual({ currentPassword: 'OldPass1', newPassword: 'NewPass1', confirmNewPassword: 'NewPass1' });

    pending.resolve(ok({ message: 'Password updated successfully' }));
    expect(await screen.findByText('Password updated successfully.')).toBeInTheDocument();
    await waitFor(() => expect(current.value).toBe(''));
    expect(next.value).toBe('');
    expect(confirm.value).toBe('');
    expect(screen.getByRole('button', { name: 'Update Password' })).toBeEnabled();
  });

  it('shows the server error and keeps the typed values', async () => {
    apiCallMock.mockResolvedValue(fail('Current password is incorrect'));
    const { user, current, next, confirm } = setup();
    await user.type(current, 'OldPass1');
    await user.type(next, 'NewPass1');
    await user.type(confirm, 'NewPass1');
    await submit(user);

    expect(await screen.findByText('Current password is incorrect')).toBeInTheDocument();
    expect(current.value).toBe('OldPass1');
    expect(screen.queryByText('Password updated successfully.')).not.toBeInTheDocument();
  });

  it('toggles visibility of the password fields', async () => {
    const { user, current, next, confirm } = setup();
    const toggles = screen.getAllByRole('button', { name: 'Show password' });

    await user.click(toggles[0]);
    expect(current).toHaveAttribute('type', 'text');
    expect(next).toHaveAttribute('type', 'password');

    await user.click(toggles[1]);
    expect(next).toHaveAttribute('type', 'text');
    expect(confirm).toHaveAttribute('type', 'text');
  });
});
