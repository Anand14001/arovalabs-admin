import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import RepeatableList from '../../components/ui/RepeatableList';
import IconButton from '../../components/ui/IconButton';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { content, contentKeys } from '../../lib/catalog';

/*
 * Navigation and redirects.
 *
 * Both are small and related — one controls where links go, the other catches
 * links that no longer resolve — so they share a screen rather than each having
 * one with three rows on it.
 */

const MENUS = [
  { key: 'HEADER', label: 'Header menu', help: 'The main navigation across the top.' },
  { key: 'FOOTER_QUICK', label: 'Footer — quick links' },
  { key: 'FOOTER_LEGAL', label: 'Footer — legal links' },
];

function MenuEditor({ menu, items, onSaved }) {
  const toast = useToast();
  const [rows, setRows] = useState(items);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setRows(items);
    setDirty(false);
  }, [items]);

  const save = useMutation({
    mutationFn: () =>
      content.saveNav(
        menu.key,
        rows.map((r) => ({
          label: r.label,
          url: r.url,
          opensInNewTab: r.opensInNewTab ?? false,
          isVisible: r.isVisible ?? true,
        })),
      ),
    onSuccess: () => {
      setDirty(false);
      onSaved();
      toast.success(`${menu.label} saved.`);
    },
    onError: (e) => toast.error(e.fieldErrors?.['items.0.label'] ?? e.message),
  });

  const change = (next) => {
    setRows(next);
    setDirty(true);
  };

  return (
    <section className="card p-5">
      <h2 className="text-[15px]">{menu.label}</h2>
      {menu.help && <p className="mt-0.5 text-[12.5px] text-muted">{menu.help}</p>}

      <div className="mt-4">
        <RepeatableList
          items={rows}
          onChange={change}
          newItem={{ label: '', url: '', isVisible: true }}
          itemNoun="link"
          addLabel="Add a link"
          empty="No links in this menu."
          renderItem={(item, update) => (
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="input"
                placeholder="Link text"
                aria-label="Link text"
                value={item.label ?? ''}
                onChange={(e) => update({ ...item, label: e.target.value })}
              />
              <input
                className="input"
                placeholder="/tests/"
                aria-label="Link address"
                value={item.url ?? ''}
                onChange={(e) => update({ ...item, url: e.target.value })}
              />
            </div>
          )}
        />
      </div>

      <Button
        icon={Save}
        className="mt-3"
        disabled={!dirty}
        loading={save.isPending}
        onClick={() => save.mutate()}
      >
        {dirty ? `Save ${menu.label.toLowerCase()}` : 'Saved'}
      </Button>
    </section>
  );
}

export default function Navigation() {
  const qc = useQueryClient();
  const toast = useToast();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const blocks = useQuery({ queryKey: contentKeys.blocks(), queryFn: content.blocks });
  const redirects = useQuery({ queryKey: contentKeys.redirects(), queryFn: content.redirects });

  const addRedirect = useMutation({
    mutationFn: () => content.createRedirect({ fromPath: from, toPath: to, statusCode: 301 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contentKeys.redirects() });
      setFrom('');
      setTo('');
      toast.success('Redirect added.');
    },
    onError: (e) => toast.error(e.message),
  });

  const removeRedirect = useMutation({
    mutationFn: (id) => content.deleteRedirect(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contentKeys.redirects() });
      toast.success('Redirect removed.');
    },
    onError: (e) => toast.error(e.message),
  });

  const nav = blocks.data?.nav ?? {};

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-[20px]">Navigation</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          The links in the header and footer, and the redirects that catch old addresses.
        </p>
      </header>

      {blocks.isLoading ? (
        <div role="status" aria-label="Loading navigation" className="space-y-4">
          <span className="sr-only">Loading navigation</span>
          {Array.from({ length: 3 }, (_, index) => <div key={index} className="card space-y-3 p-5"><Skeleton className="h-5 w-36" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>)}
        </div>
      ) : (
        MENUS.map((m) => (
          <MenuEditor
            key={m.key}
            menu={m}
            items={nav[m.key] ?? []}
            onSaved={() => qc.invalidateQueries({ queryKey: contentKeys.blocks() })}
          />
        ))
      )}

      <section className="card p-5">
        <h2 className="text-[15px]">Redirects</h2>
        <p className="mt-0.5 text-[12.5px] text-muted">
          Added automatically when a published article&rsquo;s address changes, so old links
          keep working. You can add your own here too.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            className="input"
            placeholder="/old-address/"
            aria-label="Old address"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <input
            className="input"
            placeholder="/new-address/"
            aria-label="New address"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <Button
            icon={Plus}
            disabled={!from.trim() || !to.trim()}
            loading={addRedirect.isPending}
            onClick={() => addRedirect.mutate()}
          >
            Add
          </Button>
        </div>

        <div className="mt-4">
          {redirects.data?.items.length ? (
            <ul className="divide-y">
              {redirects.data.items.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0 text-[13px]">
                    <span className="text-muted">{r.fromPath}</span>
                    <span className="mx-1.5 text-muted">→</span>
                    <span className="text-strong">{r.toPath}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {/* Hit count shows which old links are still in circulation. */}
                    <span className="text-[12px] text-muted tabular">
                      {r.hitCount} hit{r.hitCount === 1 ? '' : 's'}
                    </span>
                    <IconButton
                      icon={Trash2}
                      tone="danger"
                      label={`Remove redirect from ${r.fromPath}`}
                      loading={removeRedirect.isPending && removeRedirect.variables === r.id}
                      disabled={removeRedirect.isPending}
                      onClick={() => removeRedirect.mutate(r.id)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Alert tone="info">No redirects yet.</Alert>
          )}
        </div>
      </section>
    </div>
  );
}
