import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import DataTable, { Pagination } from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { content, contentKeys, CONTENT_STATUS } from '../../lib/catalog';

const TABS = [
  { key: '', label: 'All' },
  { key: 'PUBLISHED', label: 'Published' },
  { key: 'DRAFT', label: 'Drafts' },
  { key: 'ARCHIVED', label: 'Archived' },
];

export default function PostList() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '', q: '', category: '' });

  const list = useQuery({
    queryKey: contentKeys.posts(filters),
    queryFn: () => content.listPosts(filters),
    placeholderData: (prev) => prev,
  });

  const categories = useQuery({
    queryKey: contentKeys.blogCategories(),
    queryFn: content.blogCategories,
  });

  const setFilter = (patch) => setFilters((f) => ({ ...f, ...patch, page: 1 }));

  const columns = [
    {
      key: 'title',
      header: 'Article',
      render: (p) => (
        <div className="min-w-[220px]">
          <span className="font-medium text-strong">{p.title}</span>
          <span className="block text-[11.5px] text-muted">/{p.slug}</span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (p) => <span className="text-muted">{p.category?.name ?? '—'}</span>,
    },
    {
      key: 'readingMinutes',
      header: 'Length',
      render: (p) => (
        <span className="whitespace-nowrap text-muted tabular">
          {p.readingMinutes ? `${p.readingMinutes} min` : '—'}
        </span>
      ),
    },
    {
      key: 'publishedAt',
      header: 'Published',
      render: (p) => (
        <span className="whitespace-nowrap text-muted">
          {p.publishedAt
            ? new Date(p.publishedAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })
            : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => {
        const s = CONTENT_STATUS[p.status] ?? { label: p.status, tone: 'neutral' };
        return <Badge tone={s.tone}>{s.label}</Badge>;
      },
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px]">Blog</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            {list.data?.pagination.total ?? '—'} article
            {list.data?.pagination.total === 1 ? '' : 's'}.
          </p>
        </div>
        <Button icon={Plus} onClick={() => navigate('/posts/new')}>
          Write an article
        </Button>
      </header>

      <div className="mb-3 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button
            key={t.key || 'all'}
            type="button"
            onClick={() => setFilter({ status: t.key })}
            className="whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-medium transition"
            style={
              filters.status === t.key
                ? { borderColor: 'var(--color-brand)', color: 'var(--color-brand)' }
                : { borderColor: 'transparent', color: 'var(--text-muted)' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card mb-3 flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            className="input pl-9"
            placeholder="Search by title…"
            value={filters.q}
            onChange={(e) => setFilter({ q: e.target.value })}
            aria-label="Search articles"
          />
        </div>
        <select
          className="input w-auto min-w-0"
          value={filters.category}
          onChange={(e) => setFilter({ category: e.target.value })}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {(categories.data?.items ?? []).map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name} ({c.postCount})
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={list.data?.items ?? []}
        loading={list.isLoading}
        error={list.error}
        onRowClick={(p) => navigate(`/posts/${p.id}`)}
        empty={
          filters.q || filters.status
            ? 'No articles match those filters.'
            : 'No articles yet. Write the first one.'
        }
      />

      <Pagination
        pagination={list.data?.pagination}
        onChange={(page) => setFilters((f) => ({ ...f, page }))}
      />
    </div>
  );
}
