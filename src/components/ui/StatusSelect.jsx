import Select from './Select';

/*
 * Status selection menu for order workflow transitions.
 *
 * Backed by the shared accessible Select component, mapping status keys
 * and tone metadata (brand, success, warning, neutral) to options.
 */

export default function StatusSelect({
  id = 'order-status',
  labelId = 'order-status-label',
  options = [],
  statusMeta = {},
  value = '',
  placeholder = 'Choose next status…',
  disabled = false,
  isPending = false,
  onChange,
  className = '',
}) {
  const selectOptions = options.map((opt) => {
    const meta = statusMeta[opt] ?? { label: opt, tone: 'neutral' };
    return {
      value: opt,
      label: meta.label,
      tone: meta.tone,
    };
  });

  return (
    <Select
      id={id}
      aria-labelledby={labelId}
      options={selectOptions}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      loading={isPending}
      onChange={(e, val) => onChange?.(val || e?.target?.value)}
      className={`min-w-[220px] ${className}`}
    />
  );
}
