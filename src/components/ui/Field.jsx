/*
 * A labelled input with its error message.
 *
 * Wired for screen readers rather than just visually: the label is bound to the
 * input by id, `aria-invalid` marks the failure, and the message is referenced
 * by `aria-describedby` so it is announced instead of being a red line only
 * sighted users notice.
 */

import { useId } from 'react';

export default function Field({
  label,
  error,
  hint,
  type = 'text',
  className = '',
  inputRef,
  ...props
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <label htmlFor={id} className="label mb-1.5">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        type={type}
        className="input"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-[12.5px] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-[12.5px] text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
