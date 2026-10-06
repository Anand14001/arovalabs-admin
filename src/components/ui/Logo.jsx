/*
 * Wordmark. Drawn rather than loaded as an image so it inherits the current
 * text colour and stays sharp in both themes.
 */

export default function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="grid size-8 shrink-0 place-items-center rounded-lg font-bold text-white"
        style={{ background: 'var(--color-brand)' }}
        aria-hidden="true"
      >
        A
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold leading-tight text-strong">
            Arova Labs
          </span>
          <span className="block text-[11px] uppercase tracking-wider text-muted">
            Admin
          </span>
        </span>
      )}
    </div>
  );
}
