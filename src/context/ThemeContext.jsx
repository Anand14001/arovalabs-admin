/*
 * Theme preference: 'light' | 'dark' | 'system'.
 *
 * The preference is stored; the *resolved* theme is not. In 'system' mode the
 * stylesheet does the work through a prefers-color-scheme query, so the OS
 * flipping to dark mid-session changes the UI with no JavaScript. The resolved
 * value is still tracked here, because the toggle needs to show which way
 * 'system' currently points.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'arova-admin-theme';
const THEMES = ['light', 'dark', 'system'];

const ThemeContext = createContext(null);

// Every localStorage access is guarded: it throws in private mode and when site
// data is blocked, and the app has to work either way.
const readStored = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(v) ? v : 'system';
  } catch {
    return 'system';
  }
};

const prefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStored);
  const [systemIsDark, setSystemIsDark] = useState(prefersDark);

  // Keep the attribute in sync. The inline script in index.html sets it for the
  // first paint; this takes over for every change after that.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Preference won't survive a reload. Not worth telling anyone about.
    }
  }, [theme]);

  // Track the OS preference whether or not we're following it, so switching to
  // 'system' shows the right state immediately.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const onChange = (e) => setSystemIsDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setTheme = useCallback((next) => {
    if (THEMES.includes(next)) setThemeState(next);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      themes: THEMES,
      // What is actually on screen right now.
      resolvedTheme: theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme,
      systemIsDark,
    }),
    [theme, setTheme, systemIsDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
