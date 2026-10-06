/*
 * Image slot: shows the current image, opens the media library to change it.
 *
 * Alt text is prompted for on upload rather than being optional-and-forgotten.
 * These images end up on a public health site where some visitors use a screen
 * reader, so an unlabelled photo is a real accessibility failure, not a lint
 * warning.
 */

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2, Trash2, Upload, X } from 'lucide-react';
import { media, keys } from '../../lib/catalog';
import { useToast } from './Toast';
import Button from './Button';

function MediaLibrary({ open, onClose, onSelect }) {
  const toast = useToast();
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [page, setPage] = useState(1);

  const list = useQuery({
    queryKey: keys.media({ page, limit: 24 }),
    queryFn: () => media.list({ page, limit: 24 }),
    enabled: open,
  });

  const upload = useMutation({
    mutationFn: (files) => media.upload(files),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['media'] });
      if (res.rejected?.length) {
        // Partial uploads report both halves — saying only "done" would hide
        // the files that were refused.
        toast.error(`${res.rejected.length} file(s) rejected: ${res.rejected[0].reason}`);
      }
      if (res.items?.length) {
        toast.success(`${res.items.length} image(s) uploaded.`);
        if (res.items.length === 1) onSelect(res.items[0]);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button
        type="button"
        aria-label="Close media library"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        className="card relative flex max-h-[80vh] w-[min(820px,100%)] flex-col overflow-hidden"
        style={{ boxShadow: 'var(--shadow-pop)' }}
      >
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-[15px]">Media library</h2>
          <div className="flex items-center gap-2">
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
            <Button
              variant="outline"
              icon={Upload}
              loading={upload.isPending}
              onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 text-[13px]"
            >
              Upload
            </Button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded p-1.5 text-muted transition hover:bg-[var(--surface-hover)]"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {list.isLoading ? (
            <div className="grid place-items-center py-16">
              <Loader2 className="size-5 animate-spin text-muted" aria-label="Loading" />
            </div>
          ) : list.data?.items.length ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {list.data.items.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelect(m)}
                  className="group overflow-hidden rounded-lg border text-left transition hover:border-[var(--color-brand)]"
                  title={m.originalName}
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
                </button>
              ))}
            </div>
          ) : (
            <p className="py-16 text-center text-[13px] text-muted">
              No images yet. Upload one to get started.
            </p>
          )}
        </div>

        {list.data?.pagination?.pages > 1 && (
          <footer className="flex items-center justify-between border-t px-4 py-2.5">
            <span className="text-[12.5px] text-muted tabular">
              Page {list.data.pagination.page} of {list.data.pagination.pages}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                className="btn btn-outline px-2.5 py-1 text-[12.5px]"
                disabled={!list.data.pagination.hasPrev}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-outline px-2.5 py-1 text-[12.5px]"
                disabled={!list.data.pagination.hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}

export default function ImagePicker({ label, hint, value, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <p className="label mb-1.5">{label}</p>

      {value?.url ? (
        <div className="relative inline-block">
          <img
            src={value.url}
            alt={value.alt ?? ''}
            className="h-32 w-full max-w-[220px] rounded-lg border object-cover"
            style={{ background: 'var(--surface-sunken)' }}
          />
          <div className="mt-1.5 flex gap-1.5">
            <Button
              variant="outline"
              className="px-2.5 py-1 text-[12.5px]"
              onClick={() => setOpen(true)}
            >
              Replace
            </Button>
            <Button
              variant="ghost"
              icon={Trash2}
              className="px-2.5 py-1 text-[12.5px]"
              onClick={() => onChange(null)}
            >
              Remove
            </Button>
          </div>
          {!value.alt && (
            <p className="mt-1 text-[11.5px] text-[var(--color-warning)]">
              No alt text — add one in the media library.
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid h-32 w-full max-w-[220px] place-items-center rounded-lg border border-dashed text-muted transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]"
        >
          <span className="flex flex-col items-center gap-1">
            <ImagePlus className="size-5" aria-hidden="true" />
            <span className="text-[12.5px]">Choose image</span>
          </span>
        </button>
      )}

      {hint && <p className="mt-1.5 text-[12px] text-muted">{hint}</p>}

      <MediaLibrary
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(m) => {
          onChange(m);
          setOpen(false);
        }}
      />
    </div>
  );
}
