import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Search } from 'lucide-react';
import DataTable, { Pagination } from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { orders, orderKeys, formatPaise, ORDER_STATUS, PAYMENT_STATUS } from '../../lib/catalog';
import { BASE_URL, getAccessToken } from '../../lib/api';

/*
 * The order queue.
 *
 * Tabs rather than a status dropdown, because the counts are the information:
 * "eleven awaiting payment" is the thing that makes someone click, and a
 * dropdown hides it behind an interaction.
 */
const TABS = [
  { key: '', label: 'All' },
  { key: 'PENDING_PAYMENT', label: 'Awaiting payment' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'SAMPLE_COLLECTED', label: 'Collected' },
  { key: 'IN_LAB', label: 'In the lab' },
  { key: 'REPORT_READY', label: 'Report ready' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '—';

export default function OrderList() {
  const navigate = useNavigate();
  const toast = useToast();

  const [filters, setFilters] = useState({
    page: 1, limit: 20, status: '', q: '', from: '', to: '', collectionType: '',
  });

  const list = useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => orders.list(filters),
    placeholderData: (prev) => prev,
  });

  const counts = useQuery({
    queryKey: orderKeys.counts(),
    queryFn: orders.counts,
    // Cheap, and it is the number people are watching.
    refetchInterval: 60_000,
  });

  const setFilter = (patch) => setFilters((f) => ({ ...f, ...patch, page: 1 }));

  /*
   * The export is a plain authenticated fetch turned into a download, rather
   * than a link: the access token lives in memory, so a bare href would arrive
   * without it and get a 401.
   */
  const download = async () => {
    try {
      const res = await fetch(
        `${BASE_URL}/api/v1${orders.exportUrl({
          status: filters.status, q: filters.q, from: filters.from, to: filters.to,
        })}`,
        { headers: { Authorization: `Bearer ${getAccessToken()}` } },
      );
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arova-orders-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const columns = [
    {
      key: 'orderNumber',
      header: 'Order',
      render: (o) => (
        <div className="min-w-[132px]">
          <span className="font-medium text-strong tabular">{o.orderNumber}</span>
          <span className="block text-[11.5px] text-muted">
            {new Date(o.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </span>
        </div>
      ),
    },
    {
      key: 'contactName',
      header: 'Customer',
      render: (o) => (
        <div className="min-w-[140px]">
          <span className="text-strong">{o.contactName}</span>
          <span className="block text-[11.5px] text-muted tabular">{o.contactPhone}</span>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Booking',
      render: (o) => (
        <span className="whitespace-nowrap text-muted">
          {o.itemCount} test{o.itemCount === 1 ? '' : 's'} · {o.patientCount} patient
          {o.patientCount === 1 ? '' : 's'}
        </span>
      ),
    },
    {
      key: 'collection',
      header: 'Collection',
      render: (o) => (
        <div className="min-w-[120px]">
          <span className="text-strong">{formatDate(o.requestedDate)}</span>
          <span className="block text-[11.5px] text-muted tabular">
            {o.requestedWindow ?? '—'}
          </span>
          <span className="block text-[11px] text-muted">
            {o.collectionType === 'HOME' ? 'Home' : (o.centerName ?? 'Walk-in')}
          </span>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      cellClassName: 'tabular whitespace-nowrap',
      render: (o) => <span className="font-medium text-strong">{formatPaise(o.total)}</span>,
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (o) => {
        const p = PAYMENT_STATUS[o.paymentStatus] ?? { label: o.paymentStatus, tone: 'neutral' };
        return <Badge tone={p.tone}>{p.label}</Badge>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => {
        const s = ORDER_STATUS[o.status] ?? { label: o.status, tone: 'neutral' };
        return <Badge tone={s.tone}>{s.label}</Badge>;
      },
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px]">Orders</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            {list.data?.pagination.total ?? '—'} booking
            {list.data?.pagination.total === 1 ? '' : 's'}.
          </p>
        </div>
        <Button variant="outline" icon={Download} onClick={download}>
          Export CSV
        </Button>
      </header>

      <div className="mb-3 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => {
          const n = t.key ? counts.data?.counts?.[t.key] : counts.data?.counts?.ALL;
          return (
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
              {n > 0 && <span className="ml-1.5 text-[11px] tabular opacity-70">{n}</span>}
            </button>
          );
        })}
      </div>

      <div className="card mb-3 flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            className="input pl-9"
            placeholder="Order number, name, phone or patient…"
            value={filters.q}
            onChange={(e) => setFilter({ q: e.target.value })}
            aria-label="Search orders"
          />
        </div>

        <select
          className="input w-auto min-w-0"
          value={filters.collectionType}
          onChange={(e) => setFilter({ collectionType: e.target.value })}
          aria-label="Filter by collection type"
        >
          <option value="">Home &amp; walk-in</option>
          <option value="HOME">Home collection</option>
          <option value="WALK_IN">Walk-in</option>
        </select>

        {/*
          Filters on the requested collection date — "what are we collecting
          today" is the question this screen exists to answer.

          Wraps rather than sitting on one line: two date inputs plus their
          labels overflow a phone, and a filter bar that pushes the page
          sideways is worse than one that takes an extra row.
        */}
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[12.5px] text-muted">
          <span className="shrink-0">Collecting</span>
          <input
            type="date"
            className="input w-auto min-w-0 flex-1 basis-32"
            value={filters.from}
            onChange={(e) => setFilter({ from: e.target.value })}
            aria-label="Collection date from"
          />
          <span className="shrink-0">to</span>
          <input
            type="date"
            className="input w-auto min-w-0 flex-1 basis-32"
            value={filters.to}
            onChange={(e) => setFilter({ to: e.target.value })}
            aria-label="Collection date to"
          />
        </div>

        {(filters.q || filters.from || filters.to || filters.collectionType) && (
          <Button
            variant="ghost"
            className="px-2.5 py-1.5 text-[12.5px]"
            onClick={() => setFilter({ q: '', from: '', to: '', collectionType: '' })}
          >
            Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={list.data?.items ?? []}
        loading={list.isLoading}
        error={list.error}
        onRowClick={(o) => navigate(`/orders/${o.id}`)}
        empty={
          filters.status || filters.q
            ? 'No orders match those filters.'
            : 'No orders yet. They will appear here as bookings come in.'
        }
      />

      <Pagination
        pagination={list.data?.pagination}
        onChange={(page) => setFilters((f) => ({ ...f, page }))}
      />
    </div>
  );
}
