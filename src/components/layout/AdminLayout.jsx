/*
 * The shell: fixed sidebar on desktop, slide-over drawer on smaller screens.
 *
 * Mobile matters here — lab staff and phlebotomists check the day's collections
 * on a phone, and the order screens have to be usable on one.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, UserCircle2, X } from 'lucide-react';
import Sidebar from './Sidebar';
import ThemeToggle from '../ui/ThemeToggle';
import { useAuth } from '../../context/AuthContext';

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click and on Escape — a menu you can only close by
  // clicking the trigger again is a nuisance.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition hover:bg-[var(--surface-hover)]"
      >
        <span
          className="grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold text-white"
          style={{ background: 'var(--color-brand)' }}
          aria-hidden="true"
        >
          {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
        </span>
        <span className="hidden max-w-[12ch] truncate font-medium text-strong sm:block">
          {user?.name}
        </span>
        <ChevronDown className="size-3.5 text-muted" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="card absolute right-0 z-50 mt-1.5 w-60 overflow-hidden p-1"
          style={{ boxShadow: 'var(--shadow-pop)' }}
        >
          <div className="border-b px-3 py-2.5">
            <p className="truncate text-[13px] font-medium text-strong">{user?.name}</p>
            <p className="truncate text-[12px] text-muted">{user?.email}</p>
          </div>

          <Link
            to="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-[13px] transition hover:bg-[var(--surface-hover)]"
          >
            <UserCircle2 className="size-4" aria-hidden="true" />
            Account & password
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-[var(--color-danger)] transition hover:bg-[var(--surface-hover)]"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();

  // A navigation that leaves the drawer open covers the page you just opened.
  useEffect(() => setDrawerOpen(false), [pathname]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh border-r lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/45"
          />
          <div className="absolute inset-y-0 left-0 w-[268px] border-r shadow-2xl">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header
          className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b px-3 sm:px-5"
          style={{
            background: 'color-mix(in srgb, var(--surface-card) 85%, transparent)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label={drawerOpen ? 'Close navigation' : 'Open navigation'}
            className="btn btn-ghost -ml-1 px-2 lg:hidden"
          >
            {drawerOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>

          <div className="flex-1" />

          <ThemeToggle />
          <UserMenu />
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
