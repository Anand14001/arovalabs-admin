import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, LoaderCircle } from 'lucide-react';

/*
 * Accessible branded select / combobox component for the Arova Labs admin dashboard.
 *
 * Implements the WAI-ARIA select-only combobox pattern:
 * - Full pointer, touch, and keyboard support (Arrow keys, Home, End, Enter, Space, Escape, Typeahead).
 * - Portal-rendered popover to prevent clipping by tables, cards, dialogs, and scroll containers.
 * - Dynamic viewport collision detection (flips above/below and aligns horizontally).
 * - Resize & window scroll repositioning.
 * - Supports controlled value and both onValueChange(val) and onChange(e) synthetic events.
 * - Supports options prop or <option> children.
 * - Supports disabled options, custom placeholder, loading spinner, and error styling.
 * - Themed with Arova CSS tokens across light and dark modes.
 */

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const STATUS_DOT_COLORS = {
  brand: 'var(--color-brand)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  neutral: 'var(--text-muted)',
};

export default function Select({
  id: propId,
  name,
  value,
  defaultValue,
  options,
  children,
  placeholder = 'Choose…',
  disabled = false,
  loading = false,
  error = false,
  hint,
  label,
  onValueChange,
  onChange,
  className = '',
  triggerClassName = '',
  popoverClassName = '',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  ...restProps
}) {
  const generatedId = useId();
  const id = propId || generatedId;
  const listboxId = `${id}-listbox`;

  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  // Uncontrolled fallback if value is undefined
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const currentValue = value !== undefined ? value : internalValue;

  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  // Parse options from either `options` prop or `<option>` children
  const parsedOptions = useMemo(() => {
    if (options && Array.isArray(options)) {
      return options.map((opt) => {
        if (typeof opt === 'object' && opt !== null) {
          return {
            value: opt.value !== undefined ? String(opt.value) : '',
            label: opt.label !== undefined ? opt.label : String(opt.value ?? ''),
            disabled: Boolean(opt.disabled),
            description: opt.description,
            tone: opt.tone,
          };
        }
        return {
          value: String(opt),
          label: String(opt),
          disabled: false,
        };
      });
    }

    if (children) {
      return React.Children.toArray(children)
        .filter((child) => React.isValidElement(child) && (child.type === 'option' || child.type === 'Option'))
        .map((child) => ({
          value: child.props.value !== undefined ? String(child.props.value) : String(child.props.children ?? ''),
          label: child.props.children !== undefined ? child.props.children : String(child.props.value ?? ''),
          disabled: Boolean(child.props.disabled),
          description: child.props['data-description'],
          tone: child.props['data-tone'],
        }));
    }

    return [];
  }, [options, children]);

  // Selected option lookup
  const selectedOption = useMemo(() => {
    const strVal = currentValue !== undefined && currentValue !== null ? String(currentValue) : '';
    return parsedOptions.find((opt) => opt.value === strVal);
  }, [parsedOptions, currentValue]);

  // Viewport-aware positioning
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 260,
    placement: 'bottom',
  });

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const optionCount = parsedOptions.length || 1;
    const estimatedHeight = Math.min(optionCount * 36 + 16, 260);

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    const shouldPlaceTop = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    const availableHeight = shouldPlaceTop ? spaceAbove - 16 : spaceBelow - 16;
    const maxHeight = Math.max(Math.min(availableHeight, 280), 120);

    const top = shouldPlaceTop
      ? Math.max(8, rect.top - Math.min(estimatedHeight, maxHeight) - 4)
      : Math.min(viewportHeight - 8, rect.bottom + 4);

    const width = Math.max(rect.width, 160);
    const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));

    setCoords({
      top,
      left,
      width,
      maxHeight,
      placement: shouldPlaceTop ? 'top' : 'bottom',
    });
  };

  useIsomorphicLayoutEffect(() => {
    if (open) {
      updatePosition();
    }
  }, [open, parsedOptions.length]);

  // Outside click listener
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target)
      ) {
        setOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  // Reposition on window scroll or resize
  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = (e) => {
      if (popoverRef.current && popoverRef.current.contains(e.target)) {
        return;
      }
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        if (rect.bottom < -20 || rect.top > window.innerHeight + 20) {
          setOpen(false);
          return;
        }
      }
      updatePosition();
    };

    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, parsedOptions.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (open && highlightedIndex >= 0 && popoverRef.current) {
      const activeEl = popoverRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, open]);

  const selectOption = (opt) => {
    if (opt.disabled) return;

    if (value === undefined) {
      setInternalValue(opt.value);
    }

    setLiveAnnouncement(`Selected ${typeof opt.label === 'string' ? opt.label : opt.value}`);
    setOpen(false);
    setHighlightedIndex(-1);
    triggerRef.current?.focus();

    onValueChange?.(opt.value);

    if (onChange) {
      const synthEvent = {
        target: { value: opt.value, name: name || id, id },
        currentTarget: { value: opt.value, name: name || id, id },
        preventDefault: () => {},
        stopPropagation: () => {},
      };
      onChange(synthEvent, opt.value);
    }
  };

  const openMenu = (targetIdx) => {
    if (disabled || loading || parsedOptions.length === 0) return;
    updatePosition();
    setOpen(true);

    if (targetIdx !== undefined && targetIdx >= 0) {
      setHighlightedIndex(targetIdx);
    } else {
      const selectedIdx = parsedOptions.findIndex((o) => o.value === String(currentValue));
      const firstEnabledIdx = parsedOptions.findIndex((o) => !o.disabled);
      setHighlightedIndex(selectedIdx >= 0 && !parsedOptions[selectedIdx]?.disabled ? selectedIdx : firstEnabledIdx);
    }
  };

  const closeMenu = (restoreFocus = true) => {
    setOpen(false);
    setHighlightedIndex(-1);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  };

  // Find next enabled index
  const getNextEnabledIndex = (startIdx, step) => {
    const total = parsedOptions.length;
    if (total === 0) return -1;
    let curr = (startIdx + step + total) % total;
    for (let i = 0; i < total; i++) {
      if (!parsedOptions[curr]?.disabled) return curr;
      curr = (curr + step + total) % total;
    }
    return startIdx;
  };

  const handleKeyDown = (e) => {
    if (disabled || loading) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) {
          openMenu();
        } else {
          setHighlightedIndex((prev) => getNextEnabledIndex(prev, 1));
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (!open) {
          openMenu();
        } else {
          setHighlightedIndex((prev) => getNextEnabledIndex(prev, -1));
        }
        break;

      case 'Home':
        if (open) {
          e.preventDefault();
          const first = parsedOptions.findIndex((o) => !o.disabled);
          if (first >= 0) setHighlightedIndex(first);
        }
        break;

      case 'End':
        if (open) {
          e.preventDefault();
          for (let i = parsedOptions.length - 1; i >= 0; i--) {
            if (!parsedOptions[i]?.disabled) {
              setHighlightedIndex(i);
              break;
            }
          }
        }
        break;

      case 'Enter':
      case ' ': // Space
        e.preventDefault();
        if (!open) {
          openMenu();
        } else if (highlightedIndex >= 0 && highlightedIndex < parsedOptions.length) {
          selectOption(parsedOptions[highlightedIndex]);
        }
        break;

      case 'Escape':
        if (open) {
          e.preventDefault();
          closeMenu(true);
        }
        break;

      case 'Tab':
        if (open) {
          closeMenu(false);
        }
        break;

      default:
        // Typeahead jump
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const char = e.key.toLowerCase();
          const matchIdx = parsedOptions.findIndex(
            (o) => !o.disabled && String(o.label || o.value).toLowerCase().startsWith(char)
          );
          if (matchIdx >= 0) {
            if (!open) {
              openMenu(matchIdx);
            } else {
              setHighlightedIndex(matchIdx);
            }
          }
        }
        break;
    }
  };

  const activeOption = open && highlightedIndex >= 0 ? parsedOptions[highlightedIndex] : null;
  const activeOptionId = activeOption ? `${id}-opt-${highlightedIndex}` : undefined;

  // Determine trigger display label
  const hasValue = selectedOption !== undefined && selectedOption.value !== '';
  const displayLabel = hasValue ? selectedOption.label : selectedOption?.label || placeholder;

  const wrapperWidthClass = className.includes('w-full')
    ? 'w-full block'
    : className.includes('w-auto')
      ? 'w-auto inline-block'
      : className.match(/\bw-\S+/)
        ? `${className.match(/\bw-\S+/)[0]} inline-block`
        : 'w-full block';

  const isCompact = className.includes('py-') || className.includes('text-[12px]');
  const minHeightClass = isCompact ? '' : 'min-h-[40px]';

  return (
    <div className={`relative ${wrapperWidthClass}`}>
      {label && (
        <label htmlFor={id} className="label mb-1.5 block">
          {label}
        </label>
      )}

      {/* Screen reader live region */}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </span>

      <button
        ref={triggerRef}
        id={id}
        name={name}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open ? activeOptionId : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-disabled={disabled || loading ? 'true' : undefined}
        aria-invalid={error ? 'true' : undefined}
        disabled={disabled || loading}
        onClick={() => {
          if (open) closeMenu(false);
          else openMenu();
        }}
        onKeyDown={handleKeyDown}
        className={`input flex ${minHeightClass} items-center justify-between gap-2 text-left cursor-pointer transition select-none ${
          error ? 'border-[var(--color-danger)]' : ''
        } ${className.includes('w-') ? className : `w-full ${className}`} ${triggerClassName}`}
        style={{
          background: 'var(--surface-card)',
          color: 'var(--text-strong)',
          ...restProps.style,
        }}
        {...restProps}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
          {loading ? (
            <>
              <LoaderCircle
                className="size-3.5 shrink-0 animate-spin text-[var(--color-brand)] motion-reduce:animate-none"
                aria-hidden="true"
              />
              <span className="truncate text-muted">Loading…</span>
            </>
          ) : (
            <>
              {selectedOption?.tone && (
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: STATUS_DOT_COLORS[selectedOption.tone] ?? 'var(--text-muted)',
                  }}
                  aria-hidden="true"
                />
              )}
              <span className={`truncate ${!hasValue ? 'text-muted' : 'text-strong'}`}>
                {displayLabel}
              </span>
            </>
          )}
        </span>

        <ChevronDown
          className={`size-3.5 shrink-0 text-muted transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {hint && !error && (
        <p className="mt-1.5 text-[12.5px] text-muted">{hint}</p>
      )}

      {error && typeof error === 'string' && (
        <p className="mt-1.5 text-[12.5px] text-[var(--color-danger)]">{error}</p>
      )}

      {/* Portal popover: immune to clipping by dialogs, tables, and cards */}
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-activedescendant={activeOptionId}
            tabIndex={-1}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxHeight: `${coords.maxHeight}px`,
              background: 'var(--surface-card)',
              borderColor: 'var(--line)',
              boxShadow: 'var(--shadow-pop)',
              zIndex: 9999,
            }}
            className={`overflow-hidden rounded-xl border p-1 ${popoverClassName}`}
          >
            <div
              className="overflow-y-auto overscroll-contain py-0.5"
              style={{ maxHeight: `${coords.maxHeight - 10}px` }}
            >
              {parsedOptions.map((opt, idx) => {
                const isSelected = String(currentValue) === opt.value;
                const isHighlighted = idx === highlightedIndex;

                const bg = isHighlighted
                  ? isSelected
                    ? 'color-mix(in srgb, var(--color-brand) 18%, var(--surface-card))'
                    : 'var(--surface-hover)'
                  : isSelected
                    ? 'color-mix(in srgb, var(--color-brand) 12%, var(--surface-card))'
                    : 'transparent';

                return (
                  <div
                    key={`${opt.value}-${idx}`}
                    id={`${id}-opt-${idx}`}
                    role="option"
                    data-index={idx}
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled ? 'true' : undefined}
                    onClick={() => selectOption(opt)}
                    onMouseEnter={() => {
                      if (!opt.disabled) setHighlightedIndex(idx);
                    }}
                    style={{ background: bg }}
                    className={`flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-strong transition select-none ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed pointer-events-none'
                        : 'cursor-pointer'
                    } ${isSelected ? 'font-semibold' : ''}`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {opt.tone && (
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor: STATUS_DOT_COLORS[opt.tone] ?? 'var(--text-muted)',
                          }}
                          aria-hidden="true"
                        />
                      )}
                      <div className="min-w-0 truncate">
                        <span className="truncate text-strong">{opt.label}</span>
                        {opt.description && (
                          <span className="block truncate text-[11px] text-muted">
                            {opt.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check
                        className="size-3.5 shrink-0 text-[var(--color-brand)]"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
