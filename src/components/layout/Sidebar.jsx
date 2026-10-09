/*
 * Navigation.
 *
 * Screens that are not built yet are shown, greyed, labelled "Soon" and not
 * clickable. That is a deliberate choice over hiding them: it tells whoever is
 * using this what the finished panel will contain and stops a dead link looking
 * like a bug. Each entry loses its `soon` flag as its build step lands.
 */

import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  BadgePercent,
  Building2,
  ClipboardList,
  CircleSlash2,
  Database,
  FileText,
  FlaskConical,
  Gauge,
  Image,
  Inbox,
  LayoutGrid,
  Link2,
  Mail,
  Newspaper,
  Quote,
  Package,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { health } from '../../lib/api';

const SECTIONS = [
  {
    items: [{ to: '/', label: 'Dashboard', icon: Gauge, end: true }],
  },
  {
    title: 'Catalogue',
    items: [
      { to: '/products', label: 'Tests & packages', icon: FlaskConical },
      { to: '/categories', label: 'Categories', icon: LayoutGrid },
      { to: '/media', label: 'Media', icon: Image },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/orders', label: 'Orders', icon: Package },
      { to: '/reports', label: 'Lab reports', icon: FileText },
      { to: '/prescriptions', label: 'Prescriptions', icon: ClipboardList },
      { to: '/centers', label: 'Centres', icon: Building2 },
      { to: '/coupons', label: 'Coupons', icon: BadgePercent },
    ],
  },
  {
    title: 'Content',
    items: [
      { to: '/posts', label: 'Blog', icon: Newspaper },
      { to: '/content-blocks', label: 'FAQs', icon: Quote },
      { to: '/navigation', label: 'Navigation', icon: Link2 },
    ],
  },
  {
    title: 'Enquiries',
    items: [
      { to: '/leads', label: 'Messages', icon: Inbox },
    ],
  },
  /*
   * Reserved for later phases:
   * {
   *   title: 'System',
   *   items: [
   *     { to: '/settings', label: 'Settings', icon: Settings },
   *     { to: '/users', label: 'Admin users', icon: Users },
   *     { to: '/audit', label: 'Audit log', icon: ShieldCheck },
   *   ],
   * },
   */
];

function Item({ item, onNavigate }) {
  const { icon: Icon, label, to, soon, end } = item;

  if (soon) {
    return (
      <span
        className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] opacity-50"
        style={{ color: 'var(--text-muted)' }}
        title={`${label} — not built yet`}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ background: 'var(--surface-sunken)' }}
        >
          Soon
        </span>
      </span>
    );
  }

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition"
      style={({ isActive }) =>
        isActive
          ? {
            background: 'color-mix(in srgb, var(--color-brand) 12%, transparent)',
            color: 'var(--color-brand)',
          }
          : { color: 'var(--text-base)' }
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ onNavigate }) {
  const { isLoading, isError } = useQuery({
    queryKey: ['health', 'ready'],
    queryFn: health.ready,
    refetchInterval: 60_000,
    retry: false,
  });
  const StatusIcon = isLoading ? Activity : isError ? CircleSlash2 : Database;
  const status = isLoading ? 'Checking connection…' : isError ? 'Connection unavailable' : 'Database connected';
  const statusColor = isLoading ? 'var(--text-muted)' : isError ? 'var(--color-danger)' : 'var(--color-success)';

  return (
    <nav
      aria-label="Main"
      className="flex h-full flex-col gap-1 overflow-y-auto p-3"
      style={{ background: 'var(--surface-card)' }}
    >
      <div className="mt-1 flex-1 space-y-4">
        {SECTIONS.map((section, i) => (
          <div key={section.title ?? i}>
            {section.title && (
              <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <Item key={item.to} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 border-t px-2.5 pt-3 text-[12px] font-medium" style={{ color: statusColor }} role="status" aria-live="polite">
        <StatusIcon className={`size-3.5 shrink-0 ${isLoading ? 'animate-pulse' : ''}`} aria-hidden="true" />
        <span>{status}</span>
      </div>
    </nav>
  );
}
