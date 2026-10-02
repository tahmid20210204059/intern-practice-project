import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReactionButton from '@/features/reactions/components/ReactionButton';
import { usePost } from '@/features/posts/queries/posts';
import { apiCall } from '@/lib/http/client';
import { deferred, fail, mockApi, ok, renderWithClient } from '@/test/utils';

vi.mock('@/lib/http/client', () => ({ apiCall: vi.fn(), apiUpload: vi.fn() }));
const apiCallMock = vi.mocked(apiCall);

let serverCount = 3;
let serverReaction: string | null = null;
let postGate: ReturnType<typeof deferred<any>>;

function Harness() {
  const { data } = usePost('p1');
  return <ReactionButton targetType="post" targetId="p1" count={data?.likeCount ?? 0} />;
}

const countButton = (count: number) => screen.findByRole('button', { name: `${count} reactions, view who reacted` });

async function renderReady() {
  const view = renderWithClient(<Harness />);
  await countButton(serverCount);
  await waitFor(() => expect(screen.getByRole('button', { name: /like/i, pressed: serverReaction !== null })).toBeEnabled());
  return view;
}

beforeEach(() => {
  serverCount = 3;
  serverReaction = null;
  postGate = deferred<any>();
  mockApi(apiCallMock, (path, options) => {
    if (path.startsWith('/reactions/me')) return Promise.resolve(ok(serverReaction));
    if (path === '/posts/p1') return Promise.resolve(ok({ _id: 'p1', title: 'T', body: 'B', likeCount: serverCount }));
    if (path === '/reactions' && options?.method === 'POST') return postGate.promise;
    return Promise.reject(new Error(`unexpected ${path}`));
  });
});

describe('ReactionButton interaction', () => {
  it('increments optimistically, blocks repeat clicks while pending and keeps the server-confirmed state', async () => {
    const user = userEvent.setup();
    await renderReady();

    await user.click(screen.getByRole('button', { name: /^like$/i }));

    await countButton(4);
    expect(screen.getByRole('button', { name: /like/i, pressed: true })).toBeDisabled();

    serverCount = 4;
    serverReaction = 'like';
    postGate.resolve(ok({ action: 'added', type: 'like' }));

    await waitFor(() => expect(screen.getByRole('button', { name: /like/i, pressed: true })).toBeEnabled());
    await countButton(4);
    const posts = apiCallMock.mock.calls.filter(([path, options]) => path === '/reactions' && options?.method === 'POST');
    expect(posts).toHaveLength(1);
    expect(JSON.parse(posts[0][1]?.body as string)).toEqual({ targetType: 'post', targetId: 'p1', type: 'like' });
  });

  it('decrements optimistically when removing an existing reaction', async () => {
    const user = userEvent.setup();
    serverReaction = 'like';
    await renderReady();

    await user.click(screen.getByRole('button', { name: /like/i, pressed: true }));

    await countButton(2);
    serverCount = 2;
    serverReaction = null;
    postGate.resolve(ok({ action: 'removed', type: null }));

    await waitFor(() => expect(screen.getByRole('button', { name: /^like$/i, pressed: false })).toBeEnabled());
    await countButton(2);
  });

  it('rolls back the count and reaction and shows an error when the request fails', async () => {
    const user = userEvent.setup();
    await renderReady();

    await user.click(screen.getByRole('button', { name: /^like$/i }));
    await countButton(4);

    postGate.resolve(fail('Boom', 500));

    expect(await screen.findByRole('alert')).toHaveTextContent('Boom');
    await countButton(3);
    expect(screen.getByRole('button', { name: /^like$/i, pressed: false })).toBeEnabled();
  });
});
