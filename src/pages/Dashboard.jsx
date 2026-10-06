/*
 * Dashboard — placeholder until the analytics endpoints exist (build step 8).
 *
 * It shows what is genuinely known today rather than inventing numbers:
 * the API's own health, and an honest list of what is coming. Fake KPI tiles
 * with plausible-looking revenue figures would be worse than an empty state,
 * because someone would eventually read one and believe it.
 */

import { useQuery } from '@tanstack/react-query';
import { Activity, CircleSlash2, Database } from 'lucide-react';
import { health } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const PLANNED = [
  ['Revenue & orders', 'Today, 7-day and 30-day totals with deltas, and a revenue chart.'],
  ['Collection schedule', "Today's bookings grouped by slot and centre."],
  ['Report queue', 'Reports awaiting upload, ordered by turnaround breach risk.'],
  ['Alerts', 'Failed payments, overdue reports, unreviewed prescriptions, slots over capacity.'],
  ['Top products', 'Best sellers by revenue and by volume.'],
  ['Activity', 'A live feed from the audit log.'],
];

function StatusCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health', 'ready'],
    queryFn: health.ready,
    refetchInterval: 60_000,
    retry: false,
  });

  const tone = isLoading
    ? { label: 'Checking…', color: 'var(--text-muted)', Icon: Activity }
    : isError
      ? { label: 'Unreachable', color: 'var(--color-danger)', Icon: CircleSlash2 }
      : { label: 'Connected', color: 'var(--color-success)', Icon: Database };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted">
            API & database
          </p>
          <p className="mt-1.5 text-[22px] font-semibold" style={{ color: tone.color }}>
            {tone.label}
          </p>
          {data?.databaseLatencyMs != null && (
            <p className="mt-0.5 text-[12.5px] text-muted tabular">
              {data.databaseLatencyMs} ms round trip
            </p>
          )}
          {isError && (
            <p className="mt-0.5 text-[12.5px] text-muted">
              Is the API running on the configured URL?
            </p>
          )}
        </div>
        <tone.Icon className="size-5 shrink-0" style={{ color: tone.color }} aria-hidden="true" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-5">
        <h1 className="text-[20px]">Welcome back, {firstName}</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          Authentication is live. The rest of the panel is being built in order —
          catalogue next.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatusCard />
      </div>

      <section className="card mt-4 p-5">
        <h2 className="text-[15px]">What this screen will show</h2>
        <ul className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {PLANNED.map(([title, detail]) => (
            <li key={title} className="flex gap-2.5">
              <span
                className="mt-1.5 size-1.5 shrink-0 rounded-full"
                style={{ background: 'var(--line-strong)' }}
                aria-hidden="true"
              />
              <span>
                <span className="block text-[13.5px] font-medium text-strong">{title}</span>
                <span className="block text-[12.5px] text-muted">{detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
