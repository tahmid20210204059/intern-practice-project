import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PostForm from '@/features/posts/components/PostForm';
import { apiUpload } from '@/lib/http/client';
import { deferred, fail, ok } from '@/test/utils';

vi.mock('@/lib/http/client', () => ({ apiCall: vi.fn(), apiUpload: vi.fn() }));
const apiUploadMock = vi.mocked(apiUpload);

function setup(props: Partial<React.ComponentProps<typeof PostForm>> = {}, userOptions = {}) {
  const onSubmit = vi.fn();
  const user = userEvent.setup(userOptions);
  const view = render(<PostForm onSubmit={onSubmit} isSubmitting={false} submitLabel="Publish" {...props} />);
  const fileInput = view.container.querySelector('input[type="file"]') as HTMLInputElement;
  return { user, onSubmit, fileInput, ...view };
}

const title = () => screen.getByPlaceholderText('Give your post a title');
const body = () => screen.getByPlaceholderText('Share something with the community...');
const image = () => new File(['x'], 'photo.png', { type: 'image/png' });

describe('PostForm', () => {
  it('shows validation errors for empty and whitespace-only fields', async () => {
    const { user, onSubmit } = setup();
    await user.type(title(), '   ');
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Body is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed values', async () => {
    const { user, onSubmit } = setup();
    await user.type(title(), '  Hello  ');
    await user.type(body(), '  World  ');
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Hello', body: 'World', imageUrl: '' });
  });

  it('prefills default values', () => {
    setup({ defaultValues: { title: 'Existing', body: 'Content', imageUrl: '' } });
    expect(title()).toHaveValue('Existing');
    expect(body()).toHaveValue('Content');
  });

  it('disables submission while saving', async () => {
    const { user, onSubmit } = setup({ isSubmitting: true, defaultValues: { title: 'T', body: 'B', imageUrl: '' } });
    const button = screen.getByRole('button', { name: 'Saving...' });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the server error banner', () => {
    setup({ error: 'Failed to create post' });
    expect(screen.getByText('Failed to create post')).toBeInTheDocument();
  });

  it('calls onCancel', async () => {
    const onCancel = vi.fn();
    const { user } = setup({ onCancel });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('blocks submission while an image uploads, then shows a removable preview', async () => {
    const pending = deferred<any>();
    apiUploadMock.mockReturnValue(pending.promise);
    const { user, onSubmit, fileInput } = setup({ defaultValues: { title: 'T', body: 'B', imageUrl: '' } });

    await user.upload(fileInput, image());

    expect(await screen.findByRole('button', { name: 'Uploading...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();

    pending.resolve(ok({ url: 'https://cdn.test/a.png' }));
    expect(await screen.findByAltText('Post attachment')).toHaveAttribute('src', 'https://cdn.test/a.png');

    await user.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ title: 'T', body: 'B', imageUrl: 'https://cdn.test/a.png' }));

    await user.click(screen.getByRole('button', { name: 'Remove image' }));
    expect(screen.queryByAltText('Post attachment')).not.toBeInTheDocument();
  });

  it('shows an error when the upload fails', async () => {
    apiUploadMock.mockResolvedValue(fail('Cloudinary down'));
    const { user, fileInput } = setup();
    await user.upload(fileInput, image());
    expect(await screen.findByText('Cloudinary down')).toBeInTheDocument();
    expect(screen.queryByAltText('Post attachment')).not.toBeInTheDocument();
  });

  it('rejects non-image files and oversized images before uploading', async () => {
    const { user, fileInput } = setup({}, { applyAccept: false });

    await user.upload(fileInput, new File(['x'], 'notes.txt', { type: 'text/plain' }));
    expect(await screen.findByText('Please select an image file.')).toBeInTheDocument();

    await user.upload(fileInput, new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' }));
    expect(await screen.findByText('Image must be smaller than 5MB.')).toBeInTheDocument();
    expect(apiUploadMock).not.toHaveBeenCalled();
  });
});
