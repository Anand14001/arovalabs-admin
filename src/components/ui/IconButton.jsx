import { LoaderCircle } from 'lucide-react';

const tones = {
  neutral: 'table-icon-button--neutral',
  success: 'table-icon-button--success',
  danger: 'table-icon-button--danger',
};

export default function IconButton({
  icon: Icon,
  label,
  tone = 'neutral',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      type="button"
      aria-label={loading ? `${label} in progress` : label}
      aria-busy={loading || undefined}
      title={loading ? `${label} in progress` : label}
      disabled={disabled || loading}
      className={`table-icon-button ${tones[tone] ?? tones.neutral} ${className}`}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="size-[17px] animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <Icon className="size-[17px]" aria-hidden="true" />
      )}
    </button>
  );
}
