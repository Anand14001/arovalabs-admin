import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Copy, Download, Mail, Search, Send, Trash2, Upload, XCircle,
} from 'lucide-react';
import DataTable, { Pagination } from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { useToast } from '../../components/ui/Toast';
import { reports, fileKeys, REPORT_STATUS, downloadPrivateFile } from '../../lib/catalog';

/*
 * Lab reports.
 *
 * Two halves, because the lab has two distinct jobs: "whose results are
 * overdue" and "what have we uploaded but not sent". The worklist is first
 * because a report nobody has uploaded is the one with a patient waiting.
 *
 * Publishing is deliberately separate from sending. A wrong result reaching the
 * wrong person cannot be taken back, so neither step happens as a side effect
 * of the other.
 */

const TABS = [
  { key: '', label: 'All' },
  { key: 'UPLOADED', label: 'Not sent' },
  { key: 'PUBLISHED', label: 'Published' },
  { key: 'WITHDRAWN', label: 'Withdrawn' },
];

function UploadDialog({ order, onClose, onDone }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');

  const upload = useMutation({
    mutationFn: () => reports.upload(order.id, files, { title }),
    onSuccess: (res) => {
      res.rejected?.forEach((r) => toast.error(`${r.name}: ${r.reason}`));
      if (res.items?.length) {
        toast.success(`${res.items.length} report(s) uploaded — not sent yet.`);
        onDone();
      }
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="card relative w-[min(460px,100%)] p-5" style={{ boxShadow: 'var(--shadow-pop)' }}>
        <h2 className="text-[16px]">Upload report for {order.orderNumber}</h2>
        <p className="mt-1 text-[13px] text-muted">
          {order.contactName} · {order.testCount} test{order.testCount === 1 ? '' : 's'}
        </p>

        <label className="label mb-1.5 mt-4 block" htmlFor="reportTitle">
          Report name
        </label>
        <input
          id="reportTitle"
          className="input"
          placeholder="e.g. Complete Blood Count"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <p className="mt-1 text-[12px] text-muted">Leave blank to use the file name.</p>

        <label className="label mb-1.5 mt-4 block" htmlFor="reportFiles">
          Files (PDF, JPG or PNG)
        </label>
        <input
          id="reportFiles"
          ref={fileRef}
          type="file"
          accept=".pdf,image/jpeg,image/png"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="input"
        />
        {files.length > 0 && (
          <p className="mt-1.5 text-[12px] text-muted">
            {files.map((f) => f.name).join(', ')}
          </p>
        )}

        <Alert tone="info" className="mt-4">
          Uploading does not send anything. You publish and send it afterwards.
        </Alert>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon={Upload} loading={upload.isPending} disabled={!files.length} onClick={() => upload.mutate()}>
            Upload
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Reports() {
  const qc = useQueryClient();
  const toast = useToast();

  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '', q: '' });
  const [uploadFor, setUploadFor] = useState(null);
  const [withdrawing, setWithdrawing] = useState(null);
  const [reason, setReason] = useState('');

  const list = useQuery({
    queryKey: fileKeys.reports(filters),
    queryFn: () => reports.list(filters),
    placeholderData: (prev) => prev,
  });

  const awaiting = useQuery({ queryKey: fileKeys.awaiting(), queryFn: reports.awaiting });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['reports'] });
    qc.invalidateQueries({ queryKey: ['reports-awaiting'] });
    qc.invalidateQueries({ queryKey: ['orders'] });
  };

  const publish = useMutation({
    mutationFn: (id) => reports.publish(id),
    onSuccess: () => {
      refresh();
      toast.success('Published. Send the link when you are ready.');
    },
    onError: (e) => toast.error(e.message),
  });

  const notify = useMutation({
    mutationFn: (id) => reports.notify(id),
    onSuccess: (r) =>
      r.sent
        ? toast.success('Emailed to the customer.')
        : // Honest rather than a false success — with no SMTP the server logs
          // the mail instead of sending it.
          toast.error('Email is not configured yet, so nothing was sent. Copy the link instead.'),
    onError: (e) => toast.error(e.message),
  });

  const withdraw = useMutation({
    mutationFn: () => reports.withdraw(withdrawing.id, reason),
    onSuccess: () => {
      refresh();
      setWithdrawing(null);
      setReason('');
      toast.success('Withdrawn — the link stopped working immediately.');
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id) => reports.remove(id),
    onSuccess: () => {
      refresh();
      toast.success('Deleted.');
    },
    onError: (e) => toast.error(e.message),
  });

  const copyLink = async (id) => {
    try {
      const { url } = await reports.shareLink(id);
      await navigator.clipboard.writeText(url);
      toast.success('Link copied — paste it into WhatsApp.');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const download = async (r) => {
    try {
      await downloadPrivateFile(reports.downloadPath(r.id), r.file?.originalName ?? r.title);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const setFilter = (patch) => setFilters((f) => ({ ...f, ...patch, page: 1 }));

  const columns = [
    {
      key: 'title',
      header: 'Report',
      render: (r) => (
        <div className="min-w-[160px]">
          <span className="font-medium text-strong">{r.title}</span>
          <span className="block text-[11.5px] text-muted">
            {r.patient?.name ?? r.order?.contactName ?? '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'order',
      header: 'Order',
      render: (r) => <span className="tabular text-muted">{r.order?.orderNumber ?? '—'}</span>,
    },
    {
      key: 'delivery',
      header: 'Delivery',
      render: (r) =>
        r.status !== 'PUBLISHED' ? (
          <span className="text-muted">—</span>
        ) : (
          <span className="text-muted">
            {r.downloadCount > 0
              ? `Opened ${r.downloadCount}×`
              : r.deliveredViaEmail
                ? 'Sent, not opened'
                : 'Not sent'}
          </span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const s = REPORT_STATUS[r.status] ?? { label: r.status, tone: 'neutral' };
        return <Badge tone={s.tone}>{s.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: '',
      width: '180px',
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Download (staff copy)"
            onClick={() => download(r)}
            className="rounded p-1.5 text-muted transition hover:bg-[var(--surface-hover)] hover:text-strong"
          >
            <Download className="size-3.5" />
          </button>

          {r.status === 'UPLOADED' && (
            <Button
              className="px-2 py-1 text-[12px]"
              loading={publish.isPending}
              onClick={() => publish.mutate(r.id)}
            >
              Publish
            </Button>
          )}

          {r.status === 'PUBLISHED' && (
            <>
              <button
                type="button"
                title="Copy the share link"
                onClick={() => copyLink(r.id)}
                className="rounded p-1.5 text-muted transition hover:bg-[var(--surface-hover)] hover:text-strong"
              >
                <Copy className="size-3.5" />
              </button>
              <button
                type="button"
                title="Email it to the customer"
                onClick={() => notify.mutate(r.id)}
                className="rounded p-1.5 text-muted transition hover:bg-[var(--surface-hover)] hover:text-strong"
              >
                <Mail className="size-3.5" />
              </button>
              <button
                type="button"
                title="Withdraw — kills the link"
                onClick={() => {
                  setWithdrawing(r);
                  setReason('');
                }}
                className="rounded p-1.5 text-muted transition hover:bg-[var(--surface-hover)] hover:text-[var(--color-danger)]"
              >
                <XCircle className="size-3.5" />
              </button>
            </>
          )}

          {r.status !== 'PUBLISHED' && (
            <button
              type="button"
              title="Delete"
              onClick={() => remove.mutate(r.id)}
              className="rounded p-1.5 text-muted transition hover:bg-[var(--surface-hover)] hover:text-[var(--color-danger)]"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const worklist = awaiting.data?.items ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-4">
        <h1 className="text-[20px]">Lab reports</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          Upload results, publish them, then send the link. Links expire and can be withdrawn.
        </p>
      </header>

      {/* ------------------------------------------------- the worklist */}
      <section className="card mb-5 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[15px]">Awaiting reports</h2>
          <span className="text-[12.5px] text-muted">
            {worklist.length} order{worklist.length === 1 ? '' : 's'}
          </span>
        </div>

        {awaiting.isLoading ? (
          <p className="py-6 text-center text-[13px] text-muted">Loading…</p>
        ) : worklist.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted">
            Nothing outstanding — every collected sample has its reports published.
          </p>
        ) : (
          <ul className="divide-y">
            {worklist.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-[160px] flex-1">
                  <span className="text-[13.5px] font-medium text-strong tabular">
                    {o.orderNumber}
                  </span>
                  <span className="block text-[11.5px] text-muted">
                    {o.contactName} · {o.testCount} test{o.testCount === 1 ? '' : 's'} ·{' '}
                    {o.reportsPublished}/{o.testCount} published
                  </span>
                </div>

                {/*
                  Days since collection, not a turnaround breach: the promise
                  lives on each product and not every product has one set, so
                  claiming something is "overdue" would often be wrong.
                */}
                {o.daysSinceCollection !== null && (
                  <span
                    className="flex items-center gap-1 text-[12px]"
                    style={{
                      color:
                        o.daysSinceCollection >= 2
                          ? 'var(--color-warning)'
                          : 'var(--text-muted)',
                    }}
                  >
                    {o.daysSinceCollection >= 2 && (
                      <AlertTriangle className="size-3" aria-hidden="true" />
                    )}
                    {o.daysSinceCollection === 0
                      ? 'Collected today'
                      : `${o.daysSinceCollection}d since collection`}
                  </span>
                )}

                <Button
                  variant="outline"
                  icon={Upload}
                  className="px-2.5 py-1.5 text-[12.5px]"
                  onClick={() => setUploadFor(o)}
                >
                  Upload
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* --------------------------------------------------- all reports */}
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

      <div className="card mb-3 p-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            className="input pl-9"
            placeholder="Report name, order number or patient…"
            value={filters.q}
            onChange={(e) => setFilter({ q: e.target.value })}
            aria-label="Search reports"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={list.data?.items ?? []}
        loading={list.isLoading}
        error={list.error}
        empty="No reports yet. Upload one against a collected order above."
      />

      <Pagination
        pagination={list.data?.pagination}
        onChange={(page) => setFilters((f) => ({ ...f, page }))}
      />

      {uploadFor && (
        <UploadDialog
          order={uploadFor}
          onClose={() => setUploadFor(null)}
          onDone={() => {
            refresh();
            setUploadFor(null);
          }}
        />
      )}

      {withdrawing && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/50"
            onClick={() => setWithdrawing(null)}
          />
          <div className="card relative w-[min(420px,100%)] p-5" style={{ boxShadow: 'var(--shadow-pop)' }}>
            <h2 className="text-[16px]">Withdraw &ldquo;{withdrawing.title}&rdquo;?</h2>
            <p className="mt-2 text-[13px] text-muted">
              The share link stops working immediately, including one the customer has
              already received. The file is kept so there is a record of what was sent.
            </p>
            <label className="label mb-1.5 mt-4 block" htmlFor="withdrawReason">
              Reason
            </label>
            <input
              id="withdrawReason"
              className="input"
              placeholder="Wrong patient — corrected copy to follow"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setWithdrawing(null)}>
                Keep it published
              </Button>
              <Button
                variant="danger"
                icon={Send}
                loading={withdraw.isPending}
                disabled={!reason.trim()}
                onClick={() => withdraw.mutate()}
              >
                Withdraw
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
