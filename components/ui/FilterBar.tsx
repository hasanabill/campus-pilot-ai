type FilterBarProps = {
  children: React.ReactNode;
};

export default function FilterBar({ children }: FilterBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3">
      {children}
    </div>
  );
}
