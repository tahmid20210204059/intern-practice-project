'use client';
import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { REACTIONS } from '@/features/reactions/constants';
import { useReactionsList } from '@/features/reactions/queries/reactions';
import type { ReactionTargetType, ReactionType } from '@/features/reactions/types';

interface ReactorsModalProps {
  targetType: ReactionTargetType;
  targetId: string;
  onClose: () => void;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ReactorsModal({ targetType, targetId, onClose }: ReactorsModalProps) {
  const { data, isLoading, isError, error, refetch, isRefetching } = useReactionsList(targetType, targetId, true);
  const [activeTab, setActiveTab] = useState<ReactionType | 'all'>('all');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const counts = useMemo(() => {
    const result: Partial<Record<ReactionType, number>> = {};
    for (const item of data ?? []) {
      result[item.type] = (result[item.type] ?? 0) + 1;
    }
    return result;
  }, [data]);

  const totalCount = data?.length ?? 0;
  // REACTIONS is already ordered like, love, care, haha, wow, sad, angry (matches backend enum order)
  const visibleTabs = REACTIONS.filter((r) => (counts[r.type] ?? 0) > 0);

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (activeTab === 'all') return list; // backend already sorts by type order, then recency within type
    return list.filter((item) => item.type === activeTab);
  }, [data, activeTab]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Reactions</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 py-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
              activeTab === 'all' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            All {totalCount}
          </button>
          {visibleTabs.map((reaction) => (
            <button
              key={reaction.type}
              type="button"
              onClick={() => setActiveTab(reaction.type)}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
                activeTab === reaction.type ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <span>{reaction.emoji}</span>
              {counts[reaction.type] ?? 0}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {isLoading && <p className="px-3 py-6 text-center text-sm text-slate-400">Loading...</p>}

          {isError && !isLoading && (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-red-600">{(error as Error)?.message || 'Failed to load reactions.'}</p>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isRefetching}
                className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isRefetching ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-slate-400">No reactions yet.</p>
          )}

          {!isLoading && !isError && filtered.length > 0 && (
            <ul className="space-y-1">
              {filtered.map((item) => {
                const meta = REACTIONS.find((r) => r.type === item.type);
                return (
                  <li key={item._id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                    <div className="relative shrink-0">
                      {item.user?.avatarUrl ? (
                        <img
                          src={item.user.avatarUrl}
                          alt={item.user.name}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                          {item.user?.name?.charAt(0).toUpperCase() ?? '?'}
                        </span>
                      )}
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] shadow ring-1 ring-slate-100">
                        {meta?.emoji}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{item.user?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-slate-400">{timeAgo(item.createdAt)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}