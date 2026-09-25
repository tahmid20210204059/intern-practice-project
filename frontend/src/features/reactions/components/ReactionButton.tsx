'use client';
import { useEffect, useRef, useState } from 'react';
import { ThumbsUp } from 'lucide-react';
import { REACTIONS, REACTION_META } from '@/features/reactions/constants';
import { useMyReaction } from '@/features/reactions/queries/reactions';
import { useReaction } from '@/features/reactions/mutations/reactions';
import ReactorsModal from '@/features/reactions/components/ReactorsModal';
import type { ReactionTargetType, ReactionType } from '@/features/reactions/types';

interface ReactionButtonProps {
  targetType: ReactionTargetType;
  targetId: string;
  postId?: string;
  count: number;
  size?: 'md' | 'sm';
}

const OPEN_DELAY_MS = 350;
const CLOSE_DELAY_MS = 250;
const LONG_PRESS_MS = 450;
const ERROR_VISIBLE_MS = 4000;

export default function ReactionButton({ targetType, targetId, postId, count, size = 'md' }: ReactionButtonProps) {
  const myQuery = useMyReaction(targetType, targetId);
  const { react, isPending, errorMessage, reset } = useReaction({ targetType, targetId, postId });
  const [trayOpen, setTrayOpen] = useState(false);
  const [showReactors, setShowReactors] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const myReaction = myQuery.data ?? null;
  const ready = myQuery.data !== undefined;
  const disabled = isPending || (!ready && !myQuery.isError);
  const meta = myReaction ? REACTION_META[myReaction] : null;
  const textSize = size === 'sm' ? 'text-xs font-semibold' : 'text-sm font-medium';

  const clearTimer = (ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
    if (ref.current) {
      clearTimeout(ref.current);
      ref.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTimer(openTimer);
      clearTimer(closeTimer);
      clearTimer(pressTimer);
    };
  }, []);

  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(reset, ERROR_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [errorMessage, reset]);

  const scheduleOpen = () => {
    clearTimer(closeTimer);
    clearTimer(openTimer);
    openTimer.current = setTimeout(() => setTrayOpen(true), OPEN_DELAY_MS);
  };

  const scheduleClose = () => {
    clearTimer(openTimer);
    clearTimer(closeTimer);
    closeTimer.current = setTimeout(() => setTrayOpen(false), CLOSE_DELAY_MS);
  };

  const submit = (type: ReactionType) => {
    if (!ready) {
      if (myQuery.isError) void myQuery.refetch();
      return;
    }
    react(type);
  };

  const handleMainClick = () => {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    clearTimer(openTimer);
    setTrayOpen(false);
    submit(myReaction ?? 'like');
  };

  const handlePick = (type: ReactionType) => {
    clearTimer(openTimer);
    setTrayOpen(false);
    submit(type);
  };

  const handleTouchStart = () => {
    longPressed.current = false;
    clearTimer(pressTimer);
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      setTrayOpen(true);
    }, LONG_PRESS_MS);
  };

  const handleTouchEnd = () => {
    clearTimer(pressTimer);
  };

  return (
    <div className="inline-flex items-center gap-2">
      <div
        className="relative"
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocus={(e) => {
          if ((e.target as HTMLElement).matches(':focus-visible')) {
            clearTimer(closeTimer);
            setTrayOpen(true);
          }
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setTrayOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setTrayOpen(false);
        }}
      >
        {trayOpen && (
          <div
            role="group"
            aria-label="Choose a reaction"
            className="absolute bottom-full left-0 z-30 mb-2 flex gap-1 rounded-full bg-white px-2 py-1 shadow-lg ring-1 ring-slate-200"
          >
            {REACTIONS.map((reaction) => (
              <button
                key={reaction.type}
                type="button"
                onClick={() => handlePick(reaction.type)}
                disabled={isPending}
                aria-label={reaction.label}
                aria-pressed={myReaction === reaction.type}
                title={reaction.label}
                className={`rounded-full px-1 text-2xl leading-none transition hover:-translate-y-1 hover:scale-125 disabled:opacity-60 ${
                  myReaction === reaction.type ? 'bg-indigo-50' : ''
                }`}
              >
                {reaction.emoji}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={handleMainClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onContextMenu={(e) => e.preventDefault()}
          disabled={disabled}
          aria-pressed={!!myReaction}
          aria-haspopup="true"
          aria-expanded={trayOpen}
          aria-busy={isPending}
          className={`inline-flex select-none items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 ${textSize} ${
            meta ? meta.textClass : 'text-slate-500'
          }`}
        >
          {meta ? (
            <span className="text-base leading-none">{meta.emoji}</span>
          ) : (
            <ThumbsUp size={size === 'sm' ? 13 : 15} />
          )}
          {meta ? meta.label : 'Like'}
        </button>
      </div>
      <button
        type="button"
        onClick={() => count > 0 && setShowReactors(true)}
        disabled={count === 0}
        aria-label={`${count} reactions, view who reacted`}
        className="tabular-nums text-xs text-slate-500 hover:underline disabled:cursor-default disabled:no-underline"
      >
        {count}
      </button>
      {errorMessage && (
        <span role="alert" className="text-xs text-red-600">
          {errorMessage}
        </span>
      )}
      {showReactors && (
        <ReactorsModal targetType={targetType} targetId={targetId} onClose={() => setShowReactors(false)} />
      )}
    </div>
  );
}