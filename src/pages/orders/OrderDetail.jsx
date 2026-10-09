import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Ban, CalendarClock, CreditCard, LoaderCircle, Mail, MapPin, Phone, Receipt, Save, User,
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { PageSkeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import StatusSelect from '../../components/ui/StatusSelect';
import Select from '../../components/ui/Select';
import {
  orders, orderKeys, collectionOptions, formatPaise, ORDER_STATUS, PAYMENT_STATUS,
} from '../../lib/catalog';

const Card = ({ title, action, children }) => (
  <section className="card p-5">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[15px]">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

const Line = ({ icon: Icon, label, children }) => (
  <div className="flex gap-2.5 py-1.5">
    <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <div className="text-[13px] text-strong">{children}</div>
    </div>
  </div>
);

const when = (v) =>
  v
    ? new Date(v).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : '—';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const query = useQuery({ queryKey: orderKeys.one(id), queryFn: () => orders.get(id) });
  const order = query.data?.order;

  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);
  const [statusChoice, setStatusChoice] = useState('');
  const [dialog, setDialog] = useState(null); // 'cancel' | 'refund' | 'reschedule'
  const [cancelReason, setCancelReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [slotDate, setSlotDate] = useState('');
  const [slotWindow, setSlotWindow] = useState('');

  useEffect(() => {
    if (order) {
      setNotes(order.internalNotes ?? '');
      setNotesDirty(false);
      setSlotDate(order.collection.requestedDate?.slice(0, 10) ?? '');
    }
  }, [order]);

  const windows = useQuery({
    queryKey: ['collection-windows', slotDate],
    queryFn: () => collectionOptions(slotDate),
    enabled: dialog === 'reschedule' && Boolean(slotDate),
  });

  const refresh = (data) => {
    qc.setQueryData(orderKeys.one(id), data);
    qc.invalidateQueries({ queryKey: ['orders'] });
    qc.invalidateQueries({ queryKey: ['order-counts'] });
  };

  /*
   * One shaped success handler, shared by the four actions below. Each
   * useMutation is written out rather than produced by a helper: hooks created
   * inside a function happen to work while the call order is fixed, and break
   * silently the moment anyone adds a condition.
   *
   * The API's refusals are specific — "an order that is confirmed cannot move
   * to completed" — so they are surfaced verbatim rather than replaced with a
   * generic message.
   */
  const onDone = (message) => ({
    onSuccess: (data, variables) => {
      refresh(data);
      if (variables?.status) setStatusChoice('');
      setDialog(null);
      toast.success(message);
    },
    onError: (e, variables) => {
      if (variables?.status) setStatusChoice('');
      toast.error(e.message);
    },
  });

  const advance = useMutation({
    mutationFn: ({ status, note }) => orders.setStatus(id, status, note),
    ...onDone('Status updated.'),
  });

  const cancel = useMutation({
    mutationFn: () => orders.cancel(id, cancelReason),
    ...onDone('Order cancelled.'),
  });

  const refund = useMutation({
    mutationFn: () =>
      orders.refund(id, refundAmount === '' ? null : Number(refundAmount), refundReason),
    ...onDone('Refund issued.'),
  });

  const reschedule = useMutation({
    mutationFn: () => orders.reschedule(id, slotDate, slotWindow),
    ...onDone('Collection rescheduled.'),
  });
  const saveNotes = useMutation({
    mutationFn: () => orders.setNotes(id, notes),
    onSuccess: (data) => {
      refresh(data);
      setNotesDirty(false);
      toast.success('Notes saved.');
    },
    onError: (e) => toast.error(e.message),
  });
  const resend = useMutation({
    mutationFn: () => orders.resendConfirmation(id),
    onSuccess: (r) =>
      r.sent
        ? toast.success('Confirmation email sent.')
        : // Honest rather than a false success: with no SMTP configured the
          // server logs the mail instead of sending it.
          toast.error('Email is not configured yet, so nothing was sent.'),
    onError: (e) => toast.error(e.message),
  });

  if (query.isLoading) {
    return <PageSkeleton />;
  }
  if (query.error) {
    return (
      <Alert tone="error" className="mx-auto max-w-2xl">
        {query.error.message}
      </Alert>
    );
  }

  const status = ORDER_STATUS[order.status] ?? { label: order.status, tone: 'neutral' };
  const payment = PAYMENT_STATUS[order.paymentStatus] ?? {
    label: order.paymentStatus, tone: 'neutral',
  };

  const canCancel = order.allowedTransitions.includes('CANCELLED');
  const forward = order.allowedTransitions.filter((s) => s !== 'CANCELLED');

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <header className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="mb-1 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted transition hover:text-strong"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          All orders
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[20px] tabular">{order.orderNumber}</h1>
            <Badge tone={status.tone}>{status.label}</Badge>
            <Badge tone={payment.tone}>{payment.label}</Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            {order.contact.email && (
              <Button
                variant="ghost"
                icon={Mail}
                loading={resend.isPending}
                onClick={() => resend.mutate()}
                className="px-2.5 py-1.5 text-[12.5px]"
              >
                Resend email
              </Button>
            )}
            {canCancel && (
              <Button
                variant="ghost"
                icon={Ban}
                onClick={() => setDialog('cancel')}
                className="px-2.5 py-1.5 text-[12.5px] text-[var(--color-danger)]"
              >
                Cancel
              </Button>
            )}
            {order.refundableAmount > 0 && (
              <Button
                variant="outline"
                icon={Receipt}
                onClick={() => setDialog('refund')}
                className="px-2.5 py-1.5 text-[12.5px]"
              >
                Refund
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Only legal next steps are offered, and the server validates the same transitions. */}
      {forward.length > 0 && (
        <div
          className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5"
          style={{ background: 'var(--surface-sunken)' }}
        >
          <label id="order-status-label" htmlFor="order-status-trigger" className="text-[12.5px] font-medium text-muted">
            Update order status
          </label>
          <StatusSelect
            id="order-status"
            labelId="order-status-label"
            options={forward}
            statusMeta={ORDER_STATUS}
            value={advance.isPending ? advance.variables?.status ?? statusChoice : statusChoice}
            disabled={advance.isPending}
            isPending={advance.isPending}
            placeholder="Choose next status…"
            onChange={(nextStatus) => {
              setStatusChoice(nextStatus);
              if (nextStatus) advance.mutate({ status: nextStatus });
            }}
          />
          {advance.isPending && (
            <span role="status" aria-live="polite" className="inline-flex items-center gap-2 text-[12.5px] text-muted">
              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Updating status…
            </span>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card title="Booking">
            <ul className="divide-y">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-medium text-strong">{i.title}</span>
                    <span className="text-[11.5px] text-muted">
                      {i.type === 'PACKAGE' ? 'Package' : 'Test'}
                      {i.quantity > 1 && ` · ×${i.quantity}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] tabular text-strong">
                    {formatPaise(i.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-3 space-y-1.5 border-t pt-3 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular text-strong">{formatPaise(order.totals.subtotal)}</dd>
              </div>
              {order.totals.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">
                    Discount {order.couponCode && `(${order.couponCode})`}
                  </dt>
                  <dd className="tabular text-[var(--color-brand)]">
                    −{formatPaise(order.totals.discount)}
                  </dd>
                </div>
              )}
              {order.totals.collectionFee > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">Collection fee</dt>
                  <dd className="tabular text-strong">{formatPaise(order.totals.collectionFee)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 text-[14px] font-semibold">
                <dt className="text-strong">Total</dt>
                <dd className="tabular text-strong">{formatPaise(order.totals.total)}</dd>
              </div>
            </dl>
          </Card>

          <Card
            title="Collection"
            action={
              <Button
                variant="ghost"
                icon={CalendarClock}
                className="px-2 py-1 text-[12px]"
                onClick={() => setDialog('reschedule')}
              >
                Reschedule
              </Button>
            }
          >
            <Line icon={CalendarClock} label="Requested">
              {order.collection.requestedDate
                ? new Date(order.collection.requestedDate).toLocaleDateString('en-IN', {
                    weekday: 'short', day: 'numeric', month: 'long',
                  })
                : '—'}
              {order.collection.requestedWindow &&
                ` · ${order.collection.requestedWindow.start}–${order.collection.requestedWindow.end}`}
              {/* The customer was told this is a request, so the admin sees the
                  same framing rather than a confirmed-looking appointment. */}
              <span className="mt-0.5 block text-[11.5px] text-muted">
                Requested by the customer — confirm by phone.
              </span>
            </Line>

            <Line icon={MapPin} label={order.collection.type === 'HOME' ? 'Home collection' : 'Walk-in'}>
              {order.collection.type === 'HOME' && order.address ? (
                <>
                  {order.address.line1}
                  {order.address.line2 && `, ${order.address.line2}`}
                  {order.address.landmark && ` (${order.address.landmark})`}
                  <br />
                  {order.address.city}, {order.address.state} {order.address.pincode}
                </>
              ) : (
                order.collection.center?.name ?? '—'
              )}
            </Line>

            {order.notes && (
              <Line icon={User} label="Customer note">
                {order.notes}
              </Line>
            )}
          </Card>

          <Card title={`Patients (${order.patients.length})`}>
            <ul className="divide-y">
              {order.patients.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-[13.5px] text-strong">{p.name}</span>
                  <span className="text-[12px] text-muted">
                    {[p.age && `${p.age}y`, p.gender !== 'UNDISCLOSED' && p.gender.toLowerCase(), p.relation]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="History">
            <ol className="space-y-3">
              {order.timeline.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full"
                    style={{ background: 'var(--color-brand)' }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-strong">
                      {e.from && e.from !== e.to
                        ? `${ORDER_STATUS[e.from]?.label ?? e.from} → ${ORDER_STATUS[e.to]?.label ?? e.to}`
                        : (ORDER_STATUS[e.to]?.label ?? e.to)}
                    </p>
                    {e.note && <p className="text-[12.5px] text-muted">{e.note}</p>}
                    <p className="text-[11.5px] text-muted">
                      {e.actor} · {when(e.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Customer">
            <Line icon={User} label="Name">{order.contact.name}</Line>
            <Line icon={Phone} label="Phone">
              <a href={`tel:${order.contact.phone}`} className="hover:underline">
                {order.contact.phone}
              </a>
            </Line>
            {order.contact.email && (
              <Line icon={Mail} label="Email">
                <a href={`mailto:${order.contact.email}`} className="break-all hover:underline">
                  {order.contact.email}
                </a>
              </Line>
            )}
          </Card>

          <Card title="Payment">
            {order.payments.length === 0 ? (
              <p className="text-[13px] text-muted">No payment attempt recorded.</p>
            ) : (
              <ul className="space-y-3">
                {order.payments.map((p) => (
                  <li key={p.id} className="text-[12.5px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-strong">
                        <CreditCard className="size-3.5 text-muted" aria-hidden="true" />
                        {formatPaise(p.amount)}
                      </span>
                      <Badge tone={p.state === 'CAPTURED' ? 'success' : p.state === 'FAILED' ? 'danger' : 'neutral'}>
                        {p.state.toLowerCase()}
                      </Badge>
                    </div>
                    {p.method && <p className="mt-0.5 text-muted">via {p.method}</p>}
                    {p.razorpayPaymentId && (
                      <p className="mt-0.5 break-all text-[11px] text-muted">{p.razorpayPaymentId}</p>
                    )}
                    {p.failureReason && (
                      <p className="mt-0.5 text-[var(--color-danger)]">{p.failureReason}</p>
                    )}
                    {p.refunds.map((r) => (
                      <p key={r.id} className="mt-1 text-muted">
                        Refunded {formatPaise(r.amount)} — {r.state.toLowerCase()}
                        {r.reason && ` (${r.reason})`}
                      </p>
                    ))}
                  </li>
                ))}
              </ul>
            )}
            {order.refundableAmount > 0 && (
              <p className="mt-3 border-t pt-2 text-[12px] text-muted">
                {formatPaise(order.refundableAmount)} refundable
              </p>
            )}
          </Card>

          <Card title="Internal notes">
            <textarea
              rows={5}
              className="input resize-y text-[13px]"
              placeholder="Visible to staff only — never shown to the customer."
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesDirty(true);
              }}
              aria-label="Internal notes"
            />
            <Button
              icon={Save}
              className="mt-2 w-full"
              disabled={!notesDirty}
              loading={saveNotes.isPending}
              onClick={() => saveNotes.mutate()}
            >
              {notesDirty ? 'Save notes' : 'Saved'}
            </Button>
          </Card>

          <p className="text-center text-[12px] text-muted">
            <Link
              to={`${import.meta.env.VITE_SITE_URL ?? 'http://localhost:5173'}/booking-confirmation/`}
              className="hover:underline"
              onClick={(e) => e.preventDefault()}
              title="The customer's own view is reachable from their emailed link"
            >
              Placed {when(order.createdAt)}
            </Link>
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------- dialogs */}

      {dialog === 'cancel' && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/50"
            onClick={() => setDialog(null)}
          />
          <div className="card relative w-[min(420px,100%)] p-5" style={{ boxShadow: 'var(--shadow-pop)' }}>
            <h2 className="text-[16px]">Cancel {order.orderNumber}?</h2>
            <p className="mt-2 text-[13px] text-muted">
              Cancelling does not refund. If money needs to go back, issue a refund separately.
            </p>
            <label className="label mb-1.5 mt-4 block" htmlFor="cancelReason">
              Reason
            </label>
            <input
              id="cancelReason"
              className="input"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Customer called to cancel"
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDialog(null)}>
                Keep order
              </Button>
              <Button
                variant="danger"
                loading={cancel.isPending}
                disabled={!cancelReason.trim()}
                onClick={() => cancel.mutate()}
              >
                Cancel order
              </Button>
            </div>
          </div>
        </div>
      )}

      {dialog === 'refund' && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/50"
            onClick={() => setDialog(null)}
          />
          <div className="card relative w-[min(420px,100%)] p-5" style={{ boxShadow: 'var(--shadow-pop)' }}>
            <h2 className="text-[16px]">Refund {order.orderNumber}</h2>
            <p className="mt-2 text-[13px] text-muted">
              Up to {formatPaise(order.refundableAmount)} can be refunded. This sends money back
              through Razorpay immediately.
            </p>

            <label className="label mb-1.5 mt-4 block" htmlFor="refundAmount">
              Amount (₹) — leave blank to refund it all
            </label>
            <input
              id="refundAmount"
              type="number"
              min="1"
              step="0.01"
              className="input"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder={String(order.refundableAmount / 100)}
            />

            <label className="label mb-1.5 mt-3 block" htmlFor="refundReason">Reason</label>
            <input
              id="refundReason"
              className="input"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Collection could not be completed"
            />

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button>
              <Button variant="danger" loading={refund.isPending} onClick={() => refund.mutate()}>
                Refund
              </Button>
            </div>
          </div>
        </div>
      )}

      {dialog === 'reschedule' && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/50"
            onClick={() => setDialog(null)}
          />
          <div className="card relative w-[min(420px,100%)] p-5" style={{ boxShadow: 'var(--shadow-pop)' }}>
            <h2 className="text-[16px]">Reschedule collection</h2>

            <label className="label mb-1.5 mt-4 block" htmlFor="slotDate">Date</label>
            <input
              id="slotDate"
              type="date"
              className="input"
              value={slotDate}
              onChange={(e) => setSlotDate(e.target.value)}
            />

            <label className="label mb-1.5 mt-3 block" htmlFor="slotWindow">Time</label>
            <Select
              id="slotWindow"
              className="w-full"
              value={slotWindow}
              onChange={(e) => setSlotWindow(e.target.value)}
              placeholder="Choose…"
              options={[
                { value: '', label: 'Choose…' },
                ...(windows.data?.windows ?? []).map((w) => ({
                  value: w.id,
                  label: `${w.label} (${w.start}–${w.end})`,
                })),
              ]}
            />
            {/* No notice-period restriction here, unlike checkout: an admin on
                the phone may well be moving a collection to this afternoon. */}
            <p className="mt-1.5 text-[12px] text-muted">
              Staff can book any time — the customer-facing notice period does not apply.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button>
              <Button
                loading={reschedule.isPending}
                disabled={!slotDate || !slotWindow}
                onClick={() => reschedule.mutate()}
              >
                Reschedule
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
