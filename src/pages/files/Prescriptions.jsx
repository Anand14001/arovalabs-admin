import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Link2, Search } from 'lucide-react';
import DataTable, { Pagination } from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import {
  prescriptions, fileKeys, PRESCRIPTION_STATUS, downloadPrivateFile,
} from '../../lib/catalog';

/*
 * The prescription inbox.
 *
 * Someone has photographed a doctor's handwriting and is waiting for a phone
 * call, so the screen is organised around that: newest first, phone number
 * always visible, and the file one click away.
 *
 * There is no inline preview. Rendering a patient-supplied file in the admin's
 * own origin is exactly the thing the download route refuses to allow, and
 * building a viewer that bypasses it would undo that.
 */

const TABS = [
  { key: '', label: 'All' },
  { key: 'RECEIVED', label: 'New' },
  { key: 'REVIEWED', label: 'Reviewed' },
  { key: 'QUOTED', label: 'Quoted' },
  { key: 'CONVERTED', label: 'Booked' },
  { key: 'REJECTED', label: 'Rejected' },
];

export default function Prescriptions() {
  const qc = useQueryClient();
  const toast = useToast();

  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '', q: '' });
  const [linking, setLinking] = useState(null);
  const [orderNumber, setOrderNumber] = useState('');

  const list = useQuery({
    queryKey: fileKeys.prescriptions(filters),
    queryFn: () => prescriptions.list(filters),
    placeholderData: (prev) => prev,
  });

  const counts = useQuery({
    queryKey: fileKeys.prescriptionCounts(),
    queryFn: prescriptions.counts,
    refetchInterval: 60_000,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['prescriptions'] });
    qc.invalidateQueries({ queryKey: ['prescription-counts'] });
  };

  const setStatus = useMutation({
    mutationFn: ({ id, status }) => prescriptions.update(id, { status }),
    onSuccess: () => {
      refresh();
      toast.success('Updated.');
    },
    onError: (e) => toast.error(e.message),
  });

  const link = useMutation({
    mutationFn: () => prescriptions.linkOrder(linking.id, orderNumber),
    onSuccess: () => {
      refresh();
      setLinking(null);
      setOrderNumber('');
      toast.success('Linked to the order.');
    },
    onError: (e) => toast.error(e.fieldErrors?.orderNumber ?? e.message),
  });

  const download = async (row) => {
    try {
      await downloadPrivateFile(
        prescriptions.downloadPath(row.id),
        `prescription-${row.id}-${row.patientName}`,
      );
    } catch (e) {
      toast.error(e.message);
    }
  };

  const setFilter = (patch) => setFilters((f) => ({ ...f, ...patch, page: 1 }));

  const columns = [
    {
      key: 'patientName',
      header: 'Patient',
      render: (p) => (
        <div className="min-w-[150px]">
          <span className="font-medium text-strong">{p.patientName}</span>
          <span className="block text-[11.5px] text-muted tabular">
            <a href={`tel:${p.phone}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
              {p.phone}
            </a>
          </span>
        </div>
      ),
    },
    {
      key: 'notes',
      header: 'Their note',
      render: (p) => (
        <span className="line-clamp-2 max-w-[260px] text-muted">{p.notes || '—'}</span>
      ),
    },
    {
      key: 'file',
      header: 'File',
      render: (p) => (
        <span className="whitespace-nowrap text-muted">
          {p.file ? `${p.file.isImage ? 'Photo' : 'PDF'} · ${Math.round(p.file.sizeBytes / 1024)} KB` : '—'}
        </span>
      ),
    },
    {
      key: 'linkedOrder',
      header: 'Order',
      render: (p) =>
        p.linkedOrder ? (
          <span className="tabular text-[var(--color-brand)]">{p.linkedOrder.orderNumber}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'createdAt',
      header: 'Received',
      render: (p) => (
        <span className="whitespace-nowrap text-muted">
          {new Date(p.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => {
        const s = PRESCRIPTION_STATUS[p.status] ?? { label: p.status, tone: 'neutral' };
        return <Badge tone={s.tone}>{s.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: '',
      width: '150px',
      render: (p) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Download the prescription"
            onClick={() => download(p)}
            className="rounded p-1.5 text-muted transition hover:bg-[var(--surface-hover)] hover:text-strong"
          >
            <Download className="size-3.5" />
          </button>
          <button
            type="button"
            title="Link to an order"
            onClick={() => {
              setLinking(p);
              setOrderNumber('');
            }}
            className="rounded p-1.5 text-muted transition hover:bg-[var(--surface-hover)] hover:text-strong"
          >
            <Link2 className="size-3.5" />
          </button>
          <Select
            className="w-auto min-w-[130px] px-2 py-1 text-[12px]"
            value={p.status}
            loading={setStatus.isPending && setStatus.variables?.id === p.id}
            disabled={setStatus.isPending && setStatus.variables?.id === p.id}
            onChange={(e) => setStatus.mutate({ id: p.id, status: e.target.value })}
            aria-label={`Status for ${p.patientName}`}
            options={Object.entries(PRESCRIPTION_STATUS).map(([k, v]) => ({
              value: k,
              label: v.label,
              tone: v.tone,
            }))}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-4">
        <h1 className="text-[20px]">Prescriptions</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          Uploaded from the website. Read them, call with a quote, then link the booking.
        </p>
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

      <div className="card mb-3 p-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            className="input pl-9"
            placeholder="Name, phone or email…"
            value={filters.q}
            onChange={(e) => setFilter({ q: e.target.value })}
            aria-label="Search prescriptions"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={list.data?.items ?? []}
        loading={list.isLoading}
        error={list.error}
        empty="No prescriptions yet. They arrive from the website's upload form."
      />

      <Pagination
        pagination={list.data?.pagination}
        onChange={(page) => setFilters((f) => ({ ...f, page }))}
      />

      {linking && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/50"
            onClick={() => setLinking(null)}
          />
          <div className="card relative w-[min(420px,100%)] p-5" style={{ boxShadow: 'var(--shadow-pop)' }}>
            <h2 className="text-[16px]">Link to an order</h2>
            <p className="mt-2 text-[13px] text-muted">
              Place the booking for {linking.patientName} first, then enter its number here.
            </p>
            <label className="label mb-1.5 mt-4 block" htmlFor="linkOrder">
              Order number
            </label>
            <input
              id="linkOrder"
              className="input tabular"
              placeholder="ARV-2026-00001"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setLinking(null)}>
                Cancel
              </Button>
              <Button
                loading={link.isPending}
                disabled={!orderNumber.trim()}
                onClick={() => link.mutate()}
              >
                Link
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
