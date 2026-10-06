import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const TONES = {
  error: {
    icon: AlertCircle,
    // color-mix keeps these tinted backgrounds legible in both themes without
    // a second set of hardcoded colours.
    style: {
      background: 'color-mix(in srgb, var(--color-danger) 10%, var(--surface-card))',
      borderColor: 'color-mix(in srgb, var(--color-danger) 35%, transparent)',
      color: 'var(--color-danger)',
    },
  },
  warning: {
    icon: AlertTriangle,
    style: {
      background: 'color-mix(in srgb, var(--color-warning) 10%, var(--surface-card))',
      borderColor: 'color-mix(in srgb, var(--color-warning) 35%, transparent)',
      color: 'var(--color-warning)',
    },
  },
  success: {
    icon: CheckCircle2,
    style: {
      background: 'color-mix(in srgb, var(--color-success) 10%, var(--surface-card))',
      borderColor: 'color-mix(in srgb, var(--color-success) 35%, transparent)',
      color: 'var(--color-success)',
    },
  },
  info: {
    icon: Info,
    style: {
      background: 'color-mix(in srgb, var(--color-brand) 10%, var(--surface-card))',
      borderColor: 'color-mix(in srgb, var(--color-brand) 35%, transparent)',
      color: 'var(--color-brand)',
    },
  },
};

export default function Alert({ tone = 'info', title, children, className = '' }) {
  const { icon: Icon, style } = TONES[tone] ?? TONES.info;

  return (
    <div
      // Errors interrupt; confirmations wait their turn.
      role={tone === 'error' ? 'alert' : 'status'}
      style={style}
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-[13px] ${className}`}
    >
      <Icon className="mt-px size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
      </div>
    </div>
  );
}
