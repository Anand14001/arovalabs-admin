import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Search, MapPin, Phone, Mail, Edit3, Trash2, CheckCircle, XCircle } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import { useToast } from '../../components/ui/Toast';
import { centers, centerKeys } from '../../lib/catalog';

export default function Centers() {
  const qc = useQueryClient();
  const toast = useToast();

  const [filters, setFilters] = useState({ q: '', isActive: 'all' });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    phone: '',
    email: '',
    mapUrl: '',
    isHomeCollectionHub: false,
    isActive: true,
  });

  const list = useQuery({
    queryKey: centerKeys.list(filters),
    queryFn: () => centers.list(filters),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: centerKeys.all });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        name: data.name.trim(),
        address: data.address.trim(),
        city: data.city.trim(),
        state: data.state.trim() || 'Tamil Nadu',
        pincode: data.pincode?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        mapUrl: data.mapUrl?.trim() || null,
        isHomeCollectionHub: Boolean(data.isHomeCollectionHub),
        isActive: Boolean(data.isActive),
      };

      if (editingCenter) {
        return centers.update(editingCenter.id, payload);
      }
      return centers.create(payload);
    },
    onSuccess: () => {
      toast.success(editingCenter ? 'Centre updated' : 'Centre created');
      setEditorOpen(false);
      setEditingCenter(null);
      refresh();
    },
    onError: (err) => toast.error(err.message || 'Failed to save centre'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }) => centers.update(id, { isActive }),
    onSuccess: async (_res, { isActive }) => {
      await refresh();
      toast.success(isActive ? 'Centre activated' : 'Centre deactivated');
    },
    onError: (err) => toast.error(err.message || 'Status update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => centers.delete(id),
    onSuccess: (res) => {
      toast.success(res.message || 'Centre removed');
      refresh();
    },
    onError: (err) => toast.error(err.message || 'Failed to remove centre'),
  });

  const openCreateModal = () => {
    setEditingCenter(null);
    setFormData({
      name: '',
      address: '',
      city: '',
      state: 'Tamil Nadu',
      pincode: '',
      phone: '',
      email: '',
      mapUrl: '',
      isHomeCollectionHub: false,
      isActive: true,
    });
    setEditorOpen(true);
  };

  const openEditModal = (c) => {
    setEditingCenter(c);
    setFormData({
      name: c.name,
      address: c.address,
      city: c.city,
      state: c.state || 'Tamil Nadu',
      pincode: c.pincode || '',
      phone: c.phone || '',
      email: c.email || '',
      mapUrl: c.mapUrl || '',
      isHomeCollectionHub: Boolean(c.isHomeCollectionHub),
      isActive: Boolean(c.isActive),
    });
    setEditorOpen(true);
  };

  const columns = [
    {
      key: 'name',
      header: 'Location / Centre Name',
      render: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-strong text-[13.5px]">{row.name}</span>
            {row.isHomeCollectionHub && (
              <Badge tone="brand" className="text-[10px]">
                Collection Hub
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-muted mt-0.5">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate max-w-sm" title={row.address}>
              {row.address}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'city',
      header: 'City & Pincode',
      width: '160px',
      render: (row) => (
        <div className="text-[12.5px]">
          <p className="font-medium text-strong">{row.city}</p>
          <p className="text-muted text-[11.5px]">{row.pincode || '—'}</p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact Details',
      render: (row) => (
        <div className="space-y-0.5 text-[12px]">
          {row.phone && (
            <div className="flex items-center gap-1.5 text-muted">
              <Phone className="size-3 shrink-0" />
              <a href={`tel:${row.phone}`} className="hover:text-[var(--color-brand)]">
                {row.phone}
              </a>
            </div>
          )}
          {row.email && (
            <div className="flex items-center gap-1.5 text-muted">
              <Mail className="size-3 shrink-0" />
              <a href={`mailto:${row.email}`} className="hover:text-[var(--color-brand)]">
                {row.email}
              </a>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (row) => (
        <Badge tone={row.isActive ? 'success' : 'neutral'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '156px',
      render: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <IconButton
            icon={row.isActive ? XCircle : CheckCircle}
            label={`${row.isActive ? 'Deactivate' : 'Activate'} ${row.name}`}
            tone={row.isActive ? 'danger' : 'success'}
            loading={toggleStatusMutation.isPending && toggleStatusMutation.variables?.id === row.id}
            disabled={toggleStatusMutation.isPending || (deleteMutation.isPending && deleteMutation.variables === row.id)}
            onClick={() => toggleStatusMutation.mutate({ id: row.id, isActive: !row.isActive })}
          />
          <IconButton
            icon={Edit3}
            label={`Edit ${row.name}`}
            disabled={
              (toggleStatusMutation.isPending && toggleStatusMutation.variables?.id === row.id) ||
              (deleteMutation.isPending && deleteMutation.variables === row.id)
            }
            onClick={() => openEditModal(row)}
          />
          <IconButton
            icon={Trash2}
            label={`Remove ${row.name}`}
            tone="danger"
            loading={deleteMutation.isPending && deleteMutation.variables === row.id}
            disabled={deleteMutation.isPending || (toggleStatusMutation.isPending && toggleStatusMutation.variables?.id === row.id)}
            onClick={() => {
              if (confirm(`Remove diagnostic centre "${row.name}"?`)) {
                deleteMutation.mutate(row.id);
              }
            }}
          />
        </div>
      ),
    },
  ];

  const items = list.data?.items ?? [];
  const filtered = items.filter((row) => {
    if (filters.isActive === 'true' && !row.isActive) return false;
    if (filters.isActive === 'false' && row.isActive) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const match =
        row.name.toLowerCase().includes(q) ||
        row.city.toLowerCase().includes(q) ||
        row.address.toLowerCase().includes(q) ||
        (row.phone && row.phone.includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-strong">Diagnostic Centres</h1>
          <p className="text-[13px] text-muted">
            Manage lab branches, sample collection hubs, and address information.
          </p>
        </div>
        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="size-4" />
          Add Centre
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder="Search by centre name, city, address or phone..."
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            className="input w-full pl-9 text-[13px]"
          />
        </div>

        <select
          value={filters.isActive}
          onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
          className="input text-[13px] w-36"
        >
          <option value="all">All Centres</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        rows={filtered}
        loading={list.isLoading}
        error={list.error}
        empty="No diagnostic centres match your criteria."
      />

      {/* Modal Editor */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-[var(--surface-card)] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-strong">
                {editingCenter ? `Edit Centre: ${editingCenter.name}` : 'Add New Diagnostic Centre'}
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
                <label className="block text-[12.5px] font-semibold text-strong mb-1">
                  Centre Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dharmapuri Main Branch, Salem Fairlands"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full text-[13px]"
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-strong mb-1">
                  Full Address *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Door number, street, landmark, area..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input w-full text-[13px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-semibold text-strong mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dharmapuri"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="input w-full text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-semibold text-strong mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 636701"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="input w-full text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-semibold text-strong mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +91 9442218998"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input w-full text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-semibold text-strong mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. branch@arovalabs.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input w-full text-[13px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-strong mb-1">
                  Google Maps URL
                </label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/..."
                  value={formData.mapUrl}
                  onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                  className="input w-full text-[13px]"
                />
              </div>

              <div className="space-y-2 pt-1 border-t">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="center-hub"
                    checked={formData.isHomeCollectionHub}
                    onChange={(e) => setFormData({ ...formData, isHomeCollectionHub: e.target.checked })}
                    className="size-4 accent-[var(--color-brand)]"
                  />
                  <label htmlFor="center-hub" className="text-[13px] font-medium text-strong">
                    Home Sample Collection Hub (dispatches phlebotomists)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="center-active"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="size-4 accent-[var(--color-brand)]"
                  />
                  <label htmlFor="center-active" className="text-[13px] font-medium text-strong">
                    Active branch (visible on website and accepts walk-ins)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving…' : editingCenter ? 'Update Centre' : 'Add Centre'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
