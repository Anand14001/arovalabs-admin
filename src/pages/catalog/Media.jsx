import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Upload } from 'lucide-react';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Pagination } from '../../components/ui/DataTable';
import { useToast } from '../../components/ui/Toast';
import { media, keys } from '../../lib/catalog';

const formatSize = (bytes) =>
  bytes > 1_000_000
    ? `${(bytes / 1_048_576).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;

export default function Media() {
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef(null);

  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [alt, setAlt] = useState('');
  const [confirm, setConfirm] = useState(null);

  const list = useQuery({
    queryKey: keys.media({ page, limit: 36 }),
    queryFn: () => media.list({ page, limit: 36 }),
    placeholderData: (prev) => prev,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['media'] });

  const upload = useMutation({
    mutationFn: (files) => media.upload(files),
    onSuccess: (res) => {
      invalidate();
      if (res.items?.length) toast.success(`${res.items.length} image(s) uploaded.`);
      // Rejections are reported individually — a file refused for being the
      // wrong type needs a different fix than one that was too large.
      res.rejected?.forEach((r) => toast.error(`${r.name}: ${r.reason}`));
    },
    onError: (e) => toast.error(e.message),
  });

  const saveAlt = useMutation({
    mutationFn: ({ id, value }) => media.update(id, { alt: value || null }),
    onSuccess: ({ item }) => {
      invalidate();
      setSelected(item);
      toast.success('Alt text saved.');
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id) => media.remove(id),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      setSelected(null);
      toast.success('Image deleted.');
    },
    onError: (e) => {
      setConfirm(null);
      toast.error(e.message);
    },
  });

  const missingAlt = (list.data?.items ?? []).filter((m) => !m.alt).length;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px]">Media</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            {list.data?.pagination.total ?? '—'} image
            {list.data?.pagination.total === 1 ? '' : 's'}.
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) upload.mutate(Array.from(e.target.files));
            e.target.value = '';
          }}
        />
        <Button icon={Upload} loading={upload.isPending} onClick={() => fileRef.current?.click()}>
          Upload images
        </Button>
      </header>

      {missingAlt > 0 && (
        <Alert tone="warning" className="mb-3" title={`${missingAlt} image(s) have no alt text`}>
          Alt text is read aloud to visitors using a screen reader. Click an image to add it.
        </Alert>
      )}

      {list.error && (
        <Alert tone="error" className="mb-3">
          {list.error.message}
        </Alert>
      )}

      <div className="card p-4">
        {list.isLoading ? (
          <p className="py-12 text-center text-[13px] text-muted">Loading…</p>
        ) : list.data?.items.length ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {list.data.items.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSelected(m);
                  setAlt(m.alt ?? '');
                }}
                className="group overflow-hidden rounded-lg border text-left transition hover:border-[var(--color-brand)]"
              >
                <img
                  src={m.url}
                  alt={m.alt ?? ''}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                  style={{ background: 'var(--surface-sunken)' }}
                />
                <span className="block truncate px-1.5 py-1 text-[11px] text-muted">
                  {m.originalName}
                </span>
                {!m.alt && (
                  <span className="block px-1.5 pb-1 text-[10px] text-[var(--color-warning)]">
                    no alt
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="py-12 text-center text-[13px] text-muted">
            No images yet. Upload one to get started.
          </p>
        )}
      </div>

      <Pagination pagination={list.data?.pagination} onChange={setPage} />

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelected(null)}
          />
          <div
            className="card relative w-[min(520px,100%)] overflow-hidden"
            style={{ boxShadow: 'var(--shadow-pop)' }}
          >
            <img
              src={selected.url}
              alt={selected.alt ?? ''}
              className="max-h-[45vh] w-full object-contain"
              style={{ background: 'var(--surface-sunken)' }}
            />
            <div className="p-5">
              <p className="truncate text-[14px] font-medium text-strong">
                {selected.originalName}
              </p>
              <p className="mt-0.5 text-[12px] text-muted tabular">
                {selected.mimeType} · {formatSize(selected.sizeBytes)}
                {selected.width ? ` · ${selected.width}×${selected.height}` : ''}
              </p>

              <label className="label mb-1.5 mt-4 block" htmlFor="alt">
                Alt text
              </label>
              <input
                id="alt"
                className="input"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Describe the image for screen readers"
                maxLength={255}
              />

              <div className="mt-4 flex justify-between gap-2">
                <Button
                  variant="ghost"
                  icon={Trash2}
                  className="text-[var(--color-danger)]"
                  onClick={() => setConfirm(selected)}
                >
                  Delete
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setSelected(null)}>
                    Close
                  </Button>
                  <Button
                    loading={saveAlt.isPending}
                    onClick={() => saveAlt.mutate({ id: selected.id, value: alt })}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete this image?"
        message="Images still used by a product or category cannot be deleted — replace them there first."
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
