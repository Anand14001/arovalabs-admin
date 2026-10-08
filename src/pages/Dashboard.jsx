import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, IndianRupee, ShoppingBag, ClipboardList } from 'lucide-react';
import { api } from '../lib/api';
import { formatPaise } from '../lib/catalog';
import { useAuth } from '../context/AuthContext';

const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const periods = { '7d': 7, '30d': 30, '90d': 90 };
const moneyDelta = (current, previous) => previous ? `${((current - previous) / previous * 100).toFixed(1)}% vs previous period` : 'No previous period data';

function TrendChart({ points }) {
  const max = Math.max(1, ...points.map((p) => p.revenue));
  const coords = points.map((p, i) => `${points.length < 2 ? 300 : 16 + i * 568 / (points.length - 1)},${150 - Math.max(0, p.revenue) * 126 / max}`).join(' ');
  return <div className="card p-5">
    <div className="mb-4 flex items-center justify-between"><div><h2 className="text-[15px] font-semibold">Revenue & orders</h2><p className="text-[12px] text-muted">Daily net captured revenue</p></div><span className="text-[12px] text-muted">INR</span></div>
    <svg viewBox="0 0 600 180" className="h-48 w-full" role="img" aria-label="Daily revenue trend">
      {[0, 1, 2, 3].map((n) => <line key={n} x1="12" x2="588" y1={18 + n * 42} y2={18 + n * 42} stroke="var(--line)" strokeDasharray="3 4" />)}
      {points.length > 1 && <polyline points={coords} fill="none" stroke="var(--color-brand)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
      {points.map((p, i) => { const x = points.length < 2 ? 300 : 16 + i * 568 / (points.length - 1); const y = 150 - Math.max(0, p.revenue) * 126 / max; return <circle key={p.date} cx={x} cy={y} r="3" fill="var(--color-brand)" />; })}
      <text x="12" y="174" fill="var(--text-muted)" fontSize="10">{points[0]?.date ?? ''}</text><text x="588" y="174" textAnchor="end" fill="var(--text-muted)" fontSize="10">{points.at(-1)?.date ?? ''}</text>
    </svg>
  </div>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('30d');
  const range = useMemo(() => {
    const to = new Date(); const from = new Date(); from.setDate(from.getDate() - periods[period] + 1);
    return { from: iso(from), to: iso(to) };
  }, [period]);
  const analytics = useQuery({ queryKey: ['dashboard-analytics', range], queryFn: () => api.get(`/admin/analytics?from=${range.from}&to=${range.to}`), refetchInterval: 60_000 });
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const data = analytics.data;
  const cards = [
    { title: 'Net revenue', value: formatPaise(data?.kpis.revenue), compare: moneyDelta(data?.kpis.revenue ?? 0, data?.kpis.previousRevenue ?? 0), icon: IndianRupee },
    { title: 'Orders', value: data?.kpis.orders ?? '—', compare: moneyDelta(data?.kpis.orders ?? 0, data?.kpis.previousOrders ?? 0), icon: ShoppingBag },
    { title: 'Reports to complete', value: data?.attention.reportQueue ?? '—', compare: 'Bookings with unpublished tests', icon: ClipboardList, href: '/reports' },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-[20px]">Welcome back, {firstName}</h1><p className="mt-0.5 text-[13px] text-muted">A current view of sales and lab operations.</p></div>
        <select aria-label="Analytics period" className="input w-auto" value={period} onChange={(e) => setPeriod(e.target.value)}><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option></select>
      </header>

      {analytics.isError && <div className="card mb-4 p-4 text-[13px]" style={{ color: 'var(--color-danger)' }}>{analytics.error.message}</div>}
      <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ title, value, compare, icon: Icon, href }) => <div key={title} className="card p-4"><div className="flex items-center justify-between"><p className="text-[12px] font-medium text-muted">{title}</p><Icon className="size-4 text-muted" /></div><p className="mt-3 text-[24px] font-semibold tabular text-strong">{value}</p><p className="mt-1 text-[11.5px] text-muted">{compare}</p>{href && <Link className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: 'var(--color-brand)' }} to={href}>Open queue <ArrowUpRight size={13} /></Link>}</div>)}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.6fr_1fr]"><TrendChart points={data?.trend ?? []} /><section className="card p-5"><h2 className="text-[15px] font-semibold">Order pipeline</h2><div className="mt-3 space-y-2">{[['Confirmed','CONFIRMED'],['Scheduled','SCHEDULED'],['Sample collected','SAMPLE_COLLECTED'],['In lab','IN_LAB'],['Report ready','REPORT_READY'],['Completed','COMPLETED']].map(([label,key])=><div key={key} className="flex items-center justify-between border-b pb-2 text-[13px] last:border-0"><span className="text-muted">{label}</span><strong className="tabular text-strong">{data?.orderStatuses?.[key] ?? 0}</strong></div>)}</div></section></div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2"><section className="card p-5"><h2 className="text-[15px] font-semibold">Today’s collections</h2><div className="mt-3 space-y-2">{data?.todayCollections?.length ? data.todayCollections.map((c,i)=><div key={`${c.time}-${c.center}-${i}`} className="flex justify-between border-b pb-2 text-[13px] last:border-0"><span><strong className="text-strong">{c.time}</strong><span className="ml-2 text-muted">{c.center}</span></span><span className="text-muted">{c.bookings} booking{c.bookings===1?'':'s'}</span></div>) : <p className="text-[13px] text-muted">No collections scheduled today.</p>}</div></section>
        <section className="card p-5"><h2 className="text-[15px] font-semibold">Needs attention</h2><div className="mt-3 space-y-2">{[["Failed payments",data?.attention.failedPayments,'/orders'],['Reports to complete',data?.attention.reportQueue,'/reports'],['Prescriptions to review',data?.attention.prescriptionsToReview,'/prescriptions'],['New enquiries',data?.attention.newEnquiries,'/leads']].map(([label,count,to])=><Link key={label} to={to} className="flex justify-between border-b pb-2 text-[13px] last:border-0"><span className="text-muted">{label}</span><strong className="tabular text-strong">{count ?? '—'}</strong></Link>)}</div></section></div>
      <section className="card mt-3 p-5"><h2 className="text-[15px] font-semibold">Top tests & packages</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{data?.topProducts?.length ? data.topProducts.map((p)=><div key={p.title} className="flex justify-between gap-3 border-b pb-2 text-[13px]"><span className="truncate text-strong">{p.title}<small className="ml-2 text-muted">×{p.quantity}</small></span><strong className="shrink-0 tabular text-strong">{formatPaise(p.revenue)}</strong></div>) : <p className="text-[13px] text-muted">No paid orders in this period.</p>}</div></section>
      <p className="mt-3 text-[12px] text-muted">Revenue = captured payments minus processed refunds. Date range uses UTC.</p>
    </div>
  );
}
