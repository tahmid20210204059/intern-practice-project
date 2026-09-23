interface DeleteConfirmPopoverProps {
  label: string;
  isPending: boolean;
  error: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmPopover({
  label,
  isPending,
  error,
  onConfirm,
  onCancel,
}: DeleteConfirmPopoverProps) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
      <span className="text-xs text-red-700">Delete this {label}?</span>
      <button
        type="button"
        onClick={onConfirm}
        disabled={isPending}
        className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        {isPending ? 'Deleting...' : 'Delete'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isPending}
        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-white disabled:opacity-60"
      >
        Cancel
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}
