import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Phone, Search, Clock, CheckCircle2, AlertOctagon, MessageSquare } from 'lucide-react';
import DataTable, { Pagination } from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { leads, leadKeys, LEAD_STATUS } from '../../lib/catalog';

const TABS = [
  { key: '', label: 'All' },
  { key: 'NEW', label: 'New' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'SPAM', label: 'Spam' },
];

export default function Leads() {
  const qc = useQueryClient();
  const toast = useToast();

  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '', q: '' });
  const [selectedLead, setSelectedLead] = useState(null);
  const [internalNotes, setInternalNotes] = useState('');

  const list = useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: () => leads.list(filters),
    placeholderData: (prev) => prev,
  });

  const counts = useQuery({
    queryKey: leadKeys.counts(),
    queryFn: leads.counts,
    refetchInterval: 30_000,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: leadKeys.all });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => leads.update(id, data),
    onSuccess: (updated) => {
      toast.success('Enquiry updated');
      refresh();
      if (selectedLead?.id === updated.id) {
        setSelectedLead(updated);
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update enquiry');
    },
  });

  const handleRowClick = (lead) => {
    setSelectedLead(lead);
    setInternalNotes(lead.internalNotes || '');
  };

  const columns = [
    {
      key: 'name',
      header: 'Sender / Contact',
      render: (row) => (
        <div>
          <p className="font-semibold text-strong">{row.name || 'Anonymous Visitor'}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
            <span className="flex items-center gap-1">
              <Mail className="size-3" />
              <a
                href={`mailto:${row.email}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:underline hover:text-[var(--color-brand)]"
              >
                {row.email}
              </a>
            </span>
            {row.phone && (
              <span className="flex items-center gap-1">
                <Phone className="size-3" />
                <a
                  href={`tel:${row.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline hover:text-[var(--color-brand)]"
                >
                  {row.phone}
                </a>
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'message',
      header: 'Message Excerpt',
      render: (row) => (
        <p className="max-w-md truncate text-muted text-[13px]" title={row.message}>
          {row.message}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row) => {
        const meta = LEAD_STATUS[row.status] ?? { label: row.status, tone: 'neutral' };
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
    {
      key: 'createdAt',
      header: 'Received',
      width: '160px',
      render: (row) => (
        <span className="text-[12px] text-muted whitespace-nowrap">
          {new Date(row.createdAt).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-strong">Enquiry Messages</h1>
          <p className="text-[13px] text-muted">
            Visitor enquiries submitted from the contact page and website forms.
          </p>
        </div>
      </div>

      {/* Tabs / Status count filter */}
      <div className="flex flex-wrap items-center gap-1 border-b pb-2">
        {TABS.map((tab) => {
          const isActive = filters.status === tab.key;
          const count =
            tab.key === ''
              ? counts.data?.ALL
              : counts.data?.[tab.key];

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, status: tab.key, page: 1 }))}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${isActive
                  ? 'bg-[var(--surface-sunken)] font-semibold text-strong'
                  : 'text-muted hover:bg-[var(--surface-hover)]'
                }`}
            >
              {tab.label}
              {count !== undefined && (
                <span className="rounded-full bg-black/5 dark:bg-white/10 px-1.5 py-0.2 text-[11px]">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder="Search by name, email, phone, or message..."
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))}
            className="input w-full pl-9 text-[13px]"
          />
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        rows={list.data?.items ?? []}
        loading={list.isLoading}
        error={list.error}
        empty="No enquiry messages match your filters."
        onRowClick={handleRowClick}
      />

      <Pagination
        pagination={list.data?.pagination}
        onChange={(page) => setFilters((f) => ({ ...f, page }))}
      />

      {/* Slide-over / Modal detail view for selected lead */}
      {selectedLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs"
          onClick={() => setSelectedLead(null)}
        >
          <div
            className="h-full w-full max-w-lg bg-[var(--surface-card)] p-6 shadow-2xl flex flex-col gap-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-strong">{selectedLead.name || 'Anonymous Visitor'}</h2>
                <p className="text-[12px] text-muted">
                  Received {new Date(selectedLead.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLead(null)}>
                Close
              </Button>
            </div>

            {/* Contact Details */}
            <div className="rounded-lg bg-[var(--surface-sunken)] p-3.5 space-y-2 text-[13px]">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted" />
                <a href={`mailto:${selectedLead.email}`} className="text-[var(--color-brand)] font-medium hover:underline">
                  {selectedLead.email}
                </a>
              </div>
              {selectedLead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-muted" />
                  <a href={`tel:${selectedLead.phone}`} className="text-[var(--color-brand)] font-medium hover:underline">
                    {selectedLead.phone}
                  </a>
                </div>
              )}
              {selectedLead.ipAddress && (
                <p className="text-[11px] text-muted">IP Address: {selectedLead.ipAddress}</p>
              )}
            </div>

            {/* Message Body */}
            <div>
              <h3 className="text-[12px] font-semibold uppercase text-muted mb-1.5">Enquiry Content</h3>
              <div
                className="rounded-lg border p-4 text-[13.5px] leading-relaxed whitespace-pre-wrap"
                style={{ background: 'var(--surface-sunken)', color: 'var(--text-base)' }}
              >
                {selectedLead.message}
              </div>
            </div>

            {/* Quick Status Update */}
            <div>
              <h3 className="text-[12px] font-semibold uppercase text-muted mb-2">Lead Status</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM'].map((s) => {
                  const meta = LEAD_STATUS[s];
                  const isCurrent = selectedLead.status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={isCurrent || updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ id: selectedLead.id, data: { status: s } })}
                      className={`rounded-lg border px-2.5 py-1.5 text-center text-[12px] font-semibold transition ${isCurrent
                          ? 'border-[var(--color-brand)] bg-[var(--color-brand)] text-white'
                          : 'hover:bg-[var(--surface-hover)] text-muted'
                        }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Internal Notes */}
            <div className="space-y-2">
              <h3 className="text-[12px] font-semibold uppercase text-muted">Internal Lab Notes</h3>
              <textarea
                rows={3}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Add private staff notes regarding this enquiry..."
                className="input w-full text-[13px]"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={updateMutation.isPending || internalNotes === (selectedLead.internalNotes || '')}
                onClick={() =>
                  updateMutation.mutate({
                    id: selectedLead.id,
                    data: { internalNotes: internalNotes.trim() },
                  })
                }
              >
                Save Notes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
