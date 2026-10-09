import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Copy, ImageOff, Loader2, Plus, Search, X } from 'lucide-react';
import DataTable, { Pagination } from '../../components/ui/DataTable';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Select from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import { products, categories, keys, flattenCategories, formatPaise } from '../../lib/catalog';

const STATUSES = ['', 'PUBLISHED', 'DRAFT', 'ARCHIVED'];

export default function ProductList() {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();

  const [filters, setFilters] = useState({
    page: 1, limit: 20, q: '', type: '', status: '', category: '', orderby: 'menu_order',
  });
  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [duplicateResult, setDuplicateResult] = useState(null);

  const list = useQuery({
    queryKey: keys.products(filters),
    queryFn: () => products.list(filters),
    // Keeps the previous page on screen while the next one loads, instead of
    // flashing an empty table on every filter change.
    placeholderData: (prev) => prev,
  });

  const cats = useQuery({ queryKey: keys.categories(), queryFn: categories.list });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['products'] });

  const duplicate = useMutation({
    mutationFn: products.duplicate,
    onSuccess: async ({ product }) => {
      await invalidate();
      setDuplicateResult(product);
      toast.success(`Draft copy created: ${product.title}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const bulk = useMutation({
    mutationFn: ({ ids, action }) => products.bulk(ids, action),
    onSuccess: ({ updated }) => {
      invalidate();
      setSelected([]);
      toast.success(`${updated} product${updated === 1 ? '' : 's'} updated.`);
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: products.remove,
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      toast.success('Product deleted.');
    },
    // The API refuses to delete a product that has been ordered. Surfacing that
    // message verbatim is more useful than a generic failure.
    onError: (e) => {
      setConfirm(null);
      toast.error(e.message);
    },
  });

  const setFilter = (patch) => setFilters((f) => ({ ...f, ...patch, page: 1 }));

  const columns = [
    {
      key: 'image',
      header: '',
      width: '48px',
      render: (p) =>
        p.image?.url ? (
          <img
            src={p.image.url}
            alt=""
            className="size-9 rounded object-cover"
            style={{ background: 'var(--surface-sunken)' }}
            loading="lazy"
          />
        ) : (
          <div
            className="grid size-9 place-items-center rounded"
            style={{ background: 'var(--surface-sunken)' }}
            // Products with no image are common in the imported data; the
            // placeholder makes that visible rather than leaving a gap.
            title="No image"
          >
            <ImageOff className="size-4 text-muted" aria-hidden="true" />
          </div>
        ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (p) => (
        <div className="min-w-[180px]">
          <span className="font-medium text-strong">{p.title}</span>
          <span className="block text-[11.5px] text-muted">/{p.slug}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (p) => (
        <Badge tone={p.type === 'PACKAGE' ? 'brand' : 'neutral'}>
          {p.type === 'PACKAGE' ? 'Package' : 'Test'}
        </Badge>
      ),
    },
    {
      key: 'categories',
      header: 'Categories',
      render: (p) => (
        <span className="text-muted">
          {p.categories.map((c) => c.name).join(', ') || '—'}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      cellClassName: 'tabular whitespace-nowrap',
      render: (p) => (
        <div>
          <span className="font-medium text-strong">{formatPaise(p.price.sale)}</span>
          {p.price.onSale && (
            <span className="ml-1.5 text-[12px] text-muted line-through">
              {formatPaise(p.price.regular)}
            </span>
          )}
          {p.price.discountLabel && (
            <span className="ml-1.5 text-[11px] font-semibold text-[var(--color-accent)]">
              {p.price.discountLabel}
            </span>
          )}
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    {
      key: 'actions',
      header: '',
      width: '96px',
      render: (p) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <IconButton
            icon={Copy}
            label={`Duplicate ${p.title} as draft`}
            loading={duplicate.isPending && duplicate.variables === p.id}
            disabled={duplicate.isPending}
            onClick={() => {
              setDuplicateResult(null);
              duplicate.mutate(p.id);
            }}
          />
        </div>
      ),
    },
  ];

  const categoryOptions = flattenCategories(cats.data?.items);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px]">Tests &amp; packages</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            {list.data?.pagination.total ?? '—'} in the catalogue.
          </p>
        </div>
        <Button icon={Plus} onClick={() => navigate('/products/new')}>
          New product
        </Button>
      </header>

      <div className="card mb-3 flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            className="input pl-9"
            placeholder="Search by name or parameter…"
            value={filters.q}
            onChange={(e) => setFilter({ q: e.target.value })}
            aria-label="Search products"
          />
        </div>

        <Select
          className="w-auto min-w-[130px]"
          value={filters.type}
          onChange={(e) => setFilter({ type: e.target.value })}
          aria-label="Filter by type"
          options={[
            { value: '', label: 'All types' },
            { value: 'TEST', label: 'Tests' },
            { value: 'PACKAGE', label: 'Packages' },
          ]}
        />

        <Select
          className="w-auto min-w-[140px]"
          value={filters.status}
          onChange={(e) => setFilter({ status: e.target.value })}
          aria-label="Filter by status"
          options={STATUSES.map((s) => ({
            value: s,
            label: s ? s.charAt(0) + s.slice(1).toLowerCase() : 'All statuses',
            tone: s === 'PUBLISHED' ? 'success' : s === 'DRAFT' ? 'warning' : s === 'ARCHIVED' ? 'neutral' : undefined,
          }))}
        />

        <Select
          className="w-auto min-w-[160px] max-w-[200px]"
          value={filters.category}
          onChange={(e) => setFilter({ category: e.target.value })}
          aria-label="Filter by category"
          options={[
            { value: '', label: 'All categories' },
            ...categoryOptions.map((c) => ({ value: c.path, label: c.label })),
          ]}
        />

        <Select
          className="w-auto min-w-[150px]"
          value={filters.orderby}
          onChange={(e) => setFilter({ orderby: e.target.value })}
          aria-label="Sort"
          options={[
            { value: 'menu_order', label: 'Custom order' },
            { value: 'date', label: 'Newest' },
            { value: 'title', label: 'A–Z' },
            { value: 'price', label: 'Price: low to high' },
            { value: 'price-desc', label: 'Price: high to low' },
          ]}
        />
      </div>

      {duplicate.isPending && (
        <p className="mb-3 flex items-center gap-2 text-[13px] text-muted" role="status" aria-live="polite">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Creating a draft copy…
        </p>
      )}

      {duplicateResult && (
        <div className="card mb-3 flex flex-wrap items-center gap-3 p-3" role="status" aria-live="polite">
          <CheckCircle2 className="size-4 shrink-0 text-[var(--color-success)]" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-[13px] text-strong">
            Draft copy created: <strong>{duplicateResult.title}</strong>
            {(filters.q || filters.type || filters.status || filters.category) && (
              <span className="ml-1 text-muted">It may be hidden by the current filters.</span>
            )}
          </p>
          <Button variant="outline" className="px-2.5 py-1.5 text-[12.5px]" onClick={() => navigate(`/products/${duplicateResult.id}`)}>
            Open draft
          </Button>
          <button type="button" aria-label="Dismiss draft confirmation" onClick={() => setDuplicateResult(null)} className="rounded p-1 text-muted hover:bg-[var(--surface-hover)]">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {selected.length > 0 && (
        <div
          className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
          style={{ background: 'var(--surface-sunken)' }}
        >
          <span className="text-[13px] font-medium text-strong">
            {selected.length} selected
          </span>
          <div className="flex-1" />
          {['publish', 'draft', 'archive'].map((action) => (
            <Button
              key={action}
              variant="outline"
              className="px-2.5 py-1.5 text-[12.5px]"
              loading={bulk.isPending}
              onClick={() => bulk.mutate({ ids: selected, action })}
            >
              {action.charAt(0).toUpperCase() + action.slice(1)}
            </Button>
          ))}
          <Button
            variant="ghost"
            className="px-2.5 py-1.5 text-[12.5px]"
            onClick={() => setSelected([])}
          >
            Clear
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={list.data?.items ?? []}
        loading={list.isLoading}
        error={list.error}
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        onRowClick={(p) => navigate(`/products/${p.id}`)}
        empty={
          filters.q || filters.type || filters.status || filters.category
            ? 'No products match those filters.'
            : 'No products yet.'
        }
      />

      <Pagination
        pagination={list.data?.pagination}
        onChange={(page) => setFilters((f) => ({ ...f, page }))}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete this product?"
        message={`"${confirm?.title}" will be removed permanently. Archive it instead if you only want it off the site.`}
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
