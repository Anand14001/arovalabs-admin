import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgePercent, Plus, Search, Tag, Trash2, Edit3, CheckCircle, XCircle } from 'lucide-react';
import DataTable, { Pagination } from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import { useToast } from '../../components/ui/Toast';
import { coupons, couponKeys, COUPON_STATUS } from '../../lib/catalog';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'UPCOMING', label: 'Upcoming' },
  { key: 'EXPIRED', label: 'Expired' },
  { key: 'INACTIVE', label: 'Disabled' },
];

export default function Coupons() {
  const qc = useQueryClient();
  const toast = useToast();

  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '', q: '' });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    type: 'PERCENT',
    value: '',
    minOrderValue: '',
    maxDiscount: '',
    usageLimit: '',
    startsAt: '',
    endsAt: '',
    isActive: true,
  });

  const list = useQuery({
    queryKey: couponKeys.list(filters),
    queryFn: () => coupons.list(filters),
    placeholderData: (prev) => prev,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: couponKeys.all });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        code: data.code.trim().toUpperCase(),
        description: data.description?.trim() || null,
        type: data.type,
        value: Number(data.value),
        minOrderValue: data.minOrderValue ? Number(data.minOrderValue) : null,
        maxDiscount: data.maxDiscount ? Number(data.maxDiscount) : null,
        usageLimit: data.usageLimit ? Number(data.usageLimit) : null,
        startsAt: data.startsAt ? new Date(data.startsAt).toISOString() : null,
        endsAt: data.endsAt ? new Date(data.endsAt).toISOString() : null,
        isActive: data.isActive,
      };

      if (editingCoupon) {
        return coupons.update(editingCoupon.id, payload);
      }
      return coupons.create(payload);
    },
    onSuccess: () => {
      toast.success(editingCoupon ? 'Coupon updated' : 'Coupon created');
      setEditorOpen(false);
      setEditingCoupon(null);
      refresh();
    },
    onError: (err) => toast.error(err.message || 'Failed to save coupon'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }) => coupons.update(id, { isActive }),
    onSuccess: async (_res, { isActive }) => {
      await refresh();
      toast.success(isActive ? 'Coupon activated' : 'Coupon deactivated');
    },
    onError: (err) => toast.error(err.message || 'Status change failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => coupons.delete(id),
    onSuccess: (res) => {
      toast.success(res.message || 'Coupon removed');
      refresh();
    },
    onError: (err) => toast.error(err.message || 'Deletion failed'),
  });

  const openCreateModal = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      description: '',
      type: 'PERCENT',
      value: '',
      minOrderValue: '',
      maxDiscount: '',
      usageLimit: '',
      startsAt: '',
      endsAt: '',
      isActive: true,
    });
    setEditorOpen(true);
  };

  const openEditModal = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      type: coupon.type,
      value: coupon.value,
      minOrderValue: coupon.minOrderValue || '',
      maxDiscount: coupon.maxDiscount || '',
      usageLimit: coupon.usageLimit || '',
      startsAt: coupon.startsAt ? coupon.startsAt.slice(0, 16) : '',
      endsAt: coupon.endsAt ? coupon.endsAt.slice(0, 16) : '',
      isActive: coupon.isActive,
    });
    setEditorOpen(true);
  };

  const columns = [
    {
      key: 'code',
      header: 'Code',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold tracking-wider text-[13.5px] text-[var(--color-brand)]">
            {row.code}
          </span>
          {row.description && (
            <p className="text-[11.5px] text-muted truncate max-w-[200px]" title={row.description}>
              {row.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'discount',
      header: 'Discount Offer',
      render: (row) => (
        <div>
          <p className="font-semibold text-strong">
            {row.type === 'PERCENT' ? `${row.value}% OFF` : `₹${row.value} FLAT OFF`}
          </p>
          <div className="flex flex-wrap gap-2 text-[11.5px] text-muted">
            {row.maxDiscount && <span>Cap: ₹{row.maxDiscount}</span>}
            {row.minOrderValue && <span>Min Order: ₹{row.minOrderValue}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'usage',
      header: 'Redemptions',
      render: (row) => (
        <div className="text-[12.5px] tabular">
          <span className="font-semibold text-strong">{row.usageCount}</span>
          <span className="text-muted">
            {row.usageLimit ? ` / ${row.usageLimit}` : ' (unlimited)'}
          </span>
        </div>
      ),
    },
    {
      key: 'validity',
      header: 'Validity Period',
      render: (row) => {
        if (!row.startsAt && !row.endsAt) {
          return <span className="text-[12px] text-muted">No expiry date</span>;
        }
        return (
          <div className="text-[11.5px] text-muted">
            {row.startsAt && <div>From: {new Date(row.startsAt).toLocaleDateString('en-IN')}</div>}
            {row.endsAt && <div>Until: {new Date(row.endsAt).toLocaleDateString('en-IN')}</div>}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const meta = COUPON_STATUS[row.computedStatus] || { label: row.computedStatus, tone: 'neutral' };
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '156px',
      render: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <IconButton
            icon={row.isActive ? XCircle : CheckCircle}
            label={`${row.isActive ? 'Deactivate' : 'Activate'} coupon ${row.code}`}
            tone={row.isActive ? 'danger' : 'success'}
            loading={toggleStatusMutation.isPending && toggleStatusMutation.variables?.id === row.id}
            disabled={toggleStatusMutation.isPending || (deleteMutation.isPending && deleteMutation.variables === row.id)}
            onClick={() => toggleStatusMutation.mutate({ id: row.id, isActive: !row.isActive })}
          />
          <IconButton
            icon={Edit3}
            label={`Edit coupon ${row.code}`}
            disabled={
              (toggleStatusMutation.isPending && toggleStatusMutation.variables?.id === row.id) ||
              (deleteMutation.isPending && deleteMutation.variables === row.id)
            }
            onClick={() => openEditModal(row)}
          />
          <IconButton
            icon={Trash2}
            label={`Remove coupon ${row.code}`}
            tone="danger"
            loading={deleteMutation.isPending && deleteMutation.variables === row.id}
            disabled={deleteMutation.isPending || (toggleStatusMutation.isPending && toggleStatusMutation.variables?.id === row.id)}
            onClick={() => {
              if (confirm(`Remove coupon ${row.code}?`)) {
                deleteMutation.mutate(row.id);
              }
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-strong">Discounts & Coupons</h1>
          <p className="text-[13px] text-muted">
            Manage promotional discount codes for website checkout and health packages.
          </p>
        </div>
        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="size-4" />
          Create Coupon
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b pb-2">
        {STATUS_TABS.map((tab) => {
          const isActive = filters.status === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, status: tab.key, page: 1 }))}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${isActive
                  ? 'bg-[var(--surface-sunken)] font-semibold text-strong'
                  : 'text-muted hover:bg-[var(--surface-hover)]'
                }`}
            >
              {tab.label}
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
            placeholder="Search coupon code or description..."
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
        empty="No discount coupons found."
      />

      <Pagination
        pagination={list.data?.pagination}
        onChange={(page) => setFilters((f) => ({ ...f, page }))}
      />

      {/* Create / Edit Modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-[var(--surface-card)] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-strong">
                {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Coupon'}
              </h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="text-muted hover:text-strong"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(formData);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[12.5px] font-semibold text-strong mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AROVA20, HEALTH100"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="input w-full font-mono font-bold tracking-wider uppercase text-[14px]"
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-strong mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. 20% off on diabetes profile packages"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full text-[13px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-semibold text-strong mb-1">Discount Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input w-full text-[13px]"
                  >
                    <option value="PERCENT">Percentage (%)</option>
                    <option value="FIXED">Flat Rupee Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12.5px] font-semibold text-strong mb-1">
                    Value {formData.type === 'PERCENT' ? '(%) *' : '(₹) *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="1"
                    max={formData.type === 'PERCENT' ? '100' : undefined}
                    placeholder={formData.type === 'PERCENT' ? 'e.g. 15' : 'e.g. 150'}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="input w-full text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-semibold text-strong mb-1">Min Order Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={formData.minOrderValue}
                    onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                    className="input w-full text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-semibold text-strong mb-1">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder={formData.type === 'PERCENT' ? 'e.g. 300' : 'N/A for flat'}
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    className="input w-full text-[13px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-strong mb-1">Max Total Redemptions</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Leave empty for unlimited"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  className="input w-full text-[13px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-semibold text-strong mb-1">Valid From</label>
                  <input
                    type="datetime-local"
                    value={formData.startsAt}
                    onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                    className="input w-full text-[12px]"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-semibold text-strong mb-1">Valid Until</label>
                  <input
                    type="datetime-local"
                    value={formData.endsAt}
                    onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                    className="input w-full text-[12px]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="coupon-active"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="size-4 accent-[var(--color-brand)]"
                />
                <label htmlFor="coupon-active" className="text-[13px] font-medium text-strong">
                  Activate coupon immediately
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving…' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
