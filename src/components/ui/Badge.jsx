const TONES = {
  neutral: { bg: 'var(--surface-sunken)', fg: 'var(--text-muted)' },
  brand: { bg: 'color-mix(in srgb, var(--color-brand) 14%, transparent)', fg: 'var(--color-brand)' },
  success: { bg: 'color-mix(in srgb, var(--color-success) 14%, transparent)', fg: 'var(--color-success)' },
  warning: { bg: 'color-mix(in srgb, var(--color-warning) 14%, transparent)', fg: 'var(--color-warning)' },
  danger: { bg: 'color-mix(in srgb, var(--color-danger) 14%, transparent)', fg: 'var(--color-danger)' },
};

export default function Badge({ tone = 'neutral', children, className = '' }) {
  const t = TONES[tone] ?? TONES.neutral;
  return (
    <span
      className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${className}`}
      style={{ background: t.bg, color: t.fg }}
    >
      {children}
    </span>
  );
}

// Publish state, with one mapping used everywhere so a draft never looks
// different on one screen than another.
export const STATUS_TONE = {
  PUBLISHED: 'success',
  DRAFT: 'warning',
  SCHEDULED: 'brand',
  ARCHIVED: 'neutral',
};

export const StatusBadge = ({ status }) => (
  <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{status.toLowerCase()}</Badge>
);
