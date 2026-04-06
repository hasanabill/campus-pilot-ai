type TableColumn<T> = {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};

type EntityTableProps<T> = {
  columns: Array<TableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  minWidthClassName?: string;
};

export default function EntityTable<T>({
  columns,
  rows,
  rowKey,
  minWidthClassName = "min-w-[720px]",
}: EntityTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className={`w-full text-left text-sm ${minWidthClassName}`}>
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-600">
            {columns.map((column) => (
              <th key={column.key} className={`px-3 py-2 ${column.className ?? ""}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-zinc-100 last:border-b-0">
              {columns.map((column) => (
                <td key={column.key} className={`px-3 py-2 align-top ${column.className ?? ""}`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
