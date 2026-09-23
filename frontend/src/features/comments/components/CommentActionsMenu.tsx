interface CommentActionsMenuProps {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  label: string;
}

export default function CommentActionsMenu({
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  label,
}: CommentActionsMenuProps) {
  if (!canEdit && !canDelete) return null;

  return (
    <div className="flex shrink-0 items-center gap-1">
      {canEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="rounded px-1.5 py-0.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
        >
          Edit
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="rounded px-1.5 py-0.5 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
        >
          Delete {label}
        </button>
      )}
    </div>
  );
}
