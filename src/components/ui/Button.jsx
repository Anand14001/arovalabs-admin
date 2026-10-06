import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'btn-primary',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  danger: 'bg-[var(--color-danger)] text-white hover:brightness-110',
};

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      // Disabled while loading, so a double-click can't submit twice.
      disabled={disabled || loading}
      // Tells assistive tech the control is working rather than simply dead.
      aria-busy={loading || undefined}
      className={`btn ${VARIANTS[variant] ?? VARIANTS.primary} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon className="size-4" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
