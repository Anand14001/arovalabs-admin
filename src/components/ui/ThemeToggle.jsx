import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
  const Icon = resolvedTheme === 'dark' ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      className="inline-grid size-9 shrink-0 place-items-center rounded-lg border text-[var(--text-base)] transition hover:bg-[var(--surface-hover)] hover:text-strong"
      style={{ background: 'var(--surface-card)', borderColor: 'var(--line)' }}
    >
      <Icon className="size-[17px]" aria-hidden="true" />
    </button>
  );
}
