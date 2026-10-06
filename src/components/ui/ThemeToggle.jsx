/*
 * Light / Dark / System, as a segmented control.
 *
 * All three states are visible at once rather than cycling through them with
 * one button: with a cycling toggle you cannot tell whether "looks light" means
 * light or system-following-light, which is exactly what someone checking this
 * setting wants to know.
 */

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function ThemeToggle({ showLabels = false }) {
  const { theme, setTheme, systemIsDark } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="inline-flex items-center gap-0.5 rounded-lg p-0.5"
      style={{ background: 'var(--surface-sunken)', border: '1px solid var(--line)' }}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            title={
              value === 'system'
                ? `Follow the device (currently ${systemIsDark ? 'dark' : 'light'})`
                : label
            }
            className="inline-flex items-center gap-1.5 rounded-[7px] px-2 py-1.5 text-[12.5px] font-medium transition"
            style={
              active
                ? { background: 'var(--surface-card)', color: 'var(--text-strong)', boxShadow: 'var(--shadow-card)' }
                : { color: 'var(--text-muted)' }
            }
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {showLabels && label}
            {!showLabels && <span className="sr-only">{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
