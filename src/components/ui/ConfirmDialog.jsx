/*
 * Confirmation for destructive actions.
 *
 * Built on <dialog> so the browser supplies the modal semantics — focus trap,
 * Escape to close, inert background — rather than reimplementing them badly.
 */

import { useEffect, useRef } from 'react';
import Button from './Button';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      // Escape fires onClose, which cancels — the safe direction for a
      // destructive prompt.
      onCancel={(e) => {
        e.preventDefault();
        onCancel?.();
      }}
      className="w-[min(420px,calc(100vw-2rem))] rounded-xl border p-0 backdrop:bg-black/50"
      style={{ background: 'var(--surface-card)', color: 'var(--text-base)' }}
    >
      <div className="p-5">
        <h2 className="text-[16px]">{title}</h2>
        {message && <p className="mt-2 text-[13px] text-muted">{message}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
