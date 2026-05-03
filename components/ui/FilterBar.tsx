type FilterBarProps = {
  children: React.ReactNode;
};

export default function FilterBar({ children }: FilterBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      {children}
    </div>
  );
}
