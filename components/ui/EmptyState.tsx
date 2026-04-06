type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-center">
      <p className="text-sm font-medium text-zinc-900">{title}</p>
      {description ? <p className="mt-1 text-sm text-zinc-600">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
