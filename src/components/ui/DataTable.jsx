/*
 * The shared table.
 *
 * Every list screen uses this so they behave identically — the alternative is
 * ten hand-rolled tables that each handle loading, emptiness and selection a
 * little differently.
 *
 * Columns are declared as objects rather than JSX children so the same
 * definition can drive a CSV export later without re-deriving the headers.
 */

import { Skeleton } from './Skeleton';

export default function DataTable({
  columns,
  rows,
  rowKey = (r) => r.id,
  loading = false,
  error = null,
  empty = 'Nothing here yet.',
  selectable = false,
  selected = [],
  onSelectedChange,
  onRowClick,
}) {
  const allSelected = rows.length > 0 && selected.length === rows.length;
  // Distinct from "all" so the header checkbox can show a partial state rather
  // than implying everything is selected.
  const someSelected = selected.length > 0 && !allSelected;

  const toggleAll = () =>
    onSelectedChange?.(allSelected ? [] : rows.map((r) => rowKey(r)));

  const toggleOne = (key) =>
    onSelectedChange?.(
      selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key],
    );

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-[14px] font-medium text-[var(--color-danger)]">
          {error.message ?? 'Could not load this list.'}
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* The wrapper scrolls, not the page, so a wide table stays usable on a
          phone without the whole layout sliding sideways. */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left" aria-busy={loading || undefined}>
          <thead>
            <tr style={{ background: 'var(--surface-sunken)' }}>
              {selectable && (
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => el && (el.indeterminate = someSelected)}
                    onChange={toggleAll}
                    aria-label="Select all rows"
                    className="size-3.5 accent-[var(--color-brand)]"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wider text-muted ${col.className ?? ''}`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading && (
              Array.from({ length: 6 }, (_, row) => (
                <tr key={`skeleton-${row}`} className="border-t">
                  {selectable && (
                    <td className="px-3 py-3"><Skeleton className="size-3.5" /></td>
                  )}
                  {columns.map((column, columnIndex) => (
                    <td key={column.key} className="px-3 py-3">
                      <Skeleton className={`h-4 ${columnIndex === 0 ? 'w-3/4' : columnIndex % 2 ? 'w-1/2' : 'w-2/3'}`} />
                    </td>
                  ))}
                </tr>
              ))
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-3 py-12 text-center text-[13px] text-muted"
                >
                  {empty}
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((row) => {
                const key = rowKey(row);
                const isSelected = selected.includes(key);
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`border-t transition ${onRowClick ? 'cursor-pointer' : ''}`}
                    style={isSelected ? { background: 'var(--surface-hover)' } : undefined}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '';
                    }}
                  >
                    {selectable && (
                      <td
                        className="px-3 py-2.5"
                        // Clicking the checkbox must not also open the row.
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(key)}
                          aria-label="Select row"
                          className="size-3.5 accent-[var(--color-brand)]"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-2.5 align-middle text-[13px] ${col.cellClassName ?? ''}`}
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Page-count footer, kept with the table so every list paginates the same way. */
export function Pagination({ pagination, onChange }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages, total } = pagination;

  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <p className="text-[12.5px] text-muted tabular">
        Page {page} of {pages} · {total} item{total === 1 ? '' : 's'}
      </p>
      <div className="flex gap-1.5">
        <button
          type="button"
          className="btn btn-outline px-3 py-1.5 text-[13px]"
          disabled={!pagination.hasPrev}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn-outline px-3 py-1.5 text-[13px]"
          disabled={!pagination.hasNext}
          onClick={() => onChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
