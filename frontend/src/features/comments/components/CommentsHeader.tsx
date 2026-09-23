interface CommentsHeaderProps {
  count: number;
}

export default function CommentsHeader({ count }: CommentsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-semibold text-slate-900">
        Comments <span className="text-slate-400">({count})</span>
      </h2>
    </div>
  );
}