import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, History, Save, Trash2 } from 'lucide-react';
import Field from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import RichTextEditor from '../../components/ui/RichTextEditor';
import ImagePicker from '../../components/ui/ImagePicker';
import { useToast } from '../../components/ui/Toast';
import { content, contentKeys, CONTENT_STATUS } from '../../lib/catalog';

/*
 * The article editor.
 *
 * Written for someone who is not technical, so:
 *   - the slug is generated from the title and only shown as "the web address",
 *     with a warning that changing a published one is a real change;
 *   - the SEO fields have counters and a preview rather than bare inputs;
 *   - revisions are one click away, because the single most reassuring thing a
 *     CMS can offer is "you can put it back".
 */

const BLANK = {
  title: '', slug: '', excerpt: '', content: '', status: 'DRAFT',
  categoryId: '', featuredImage: null, authorName: '', isFeatured: false,
  metaTitle: '', metaDescription: '',
};

export default function PostEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const [form, setForm] = useState(BLANK);
  const [dirty, setDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [showRevisions, setShowRevisions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const query = useQuery({
    queryKey: contentKeys.post(id),
    queryFn: () => content.getPost(id),
    enabled: !isNew,
  });

  const categories = useQuery({
    queryKey: contentKeys.blogCategories(),
    queryFn: content.blogCategories,
  });

  const revisions = useQuery({
    queryKey: contentKeys.revisions('post', id),
    queryFn: () => content.postRevisions(id),
    enabled: !isNew && showRevisions,
  });

  /*
   * Never load the server's version on top of unsaved work — a save triggers a
   * refetch, and typing in that window would otherwise be wiped by the response
   * to your own save.
   */
  useEffect(() => {
    const p = query.data?.post;
    if (!p || dirty) return;
    setForm({
      title: p.title ?? '',
      slug: p.slug ?? '',
      excerpt: p.excerpt ?? '',
      content: p.content ?? '',
      status: p.status ?? 'DRAFT',
      categoryId: p.categoryId ?? '',
      featuredImage: p.image ? { id: p.featuredUploadId, url: p.image } : null,
      authorName: p.author ?? '',
      isFeatured: p.isFeatured ?? false,
      metaTitle: p.metaTitle ?? '',
      metaDescription: p.metaDescription ?? '',
    });
    setDirty(false);
  }, [query.data]);

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const toApi = () => ({
    title: form.title,
    slug: form.slug || undefined,
    excerpt: form.excerpt || null,
    content: form.content || null,
    status: form.status,
    categoryId: form.categoryId === '' ? null : Number(form.categoryId),
    featuredUploadId: form.featuredImage?.id ?? null,
    authorName: form.authorName || null,
    isFeatured: form.isFeatured,
    metaTitle: form.metaTitle || null,
    metaDescription: form.metaDescription || null,
  });

  const save = useMutation({
    mutationFn: (body) => (isNew ? content.createPost(body) : content.updatePost(id, body)),
    onSuccess: ({ post }) => {
      qc.invalidateQueries({ queryKey: ['posts'] });
      qc.invalidateQueries({ queryKey: contentKeys.post(String(post.id)) });
      setDirty(false);
      setFieldErrors({});
      setError(null);
      toast.success(isNew ? 'Article created.' : 'Changes saved.');
      if (isNew) navigate(`/posts/${post.id}`, { replace: true });
    },
    onError: (e) => {
      setError(e.message);
      setFieldErrors(e.fieldErrors ?? {});
      toast.error(e.message);
    },
  });

  const restore = useMutation({
    mutationFn: (revisionId) => content.restorePost(id, revisionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contentKeys.post(id) });
      qc.invalidateQueries({ queryKey: contentKeys.revisions('post', id) });
      setShowRevisions(false);
      toast.success('Restored. The version you replaced is still in the history.');
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => content.deletePost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Article deleted.');
      navigate('/posts');
    },
    onError: (e) => {
      setConfirmDelete(false);
      toast.error(e.message);
    },
  });

  const leave = () => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    navigate('/posts');
  };

  const siteUrl = import.meta.env.VITE_SITE_URL ?? 'http://localhost:5173';

  const wordCount = useMemo(
    () => (form.content ?? '').replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length,
    [form.content],
  );

  if (!isNew && query.isLoading) {
    return <p className="py-16 text-center text-[13px] text-muted">Loading…</p>;
  }
  if (!isNew && query.error) {
    return <Alert tone="error" className="mx-auto max-w-2xl">{query.error.message}</Alert>;
  }

  return (
    <div className="mx-auto max-w-4xl pb-20">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={leave}
            className="mb-1 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted transition hover:text-strong"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            All articles
          </button>
          <h1 className="truncate text-[20px]">{isNew ? 'New article' : form.title || 'Untitled'}</h1>
          {!isNew && form.status === 'PUBLISHED' && (
            <a
              href={`${siteUrl}/${form.slug}/`}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 text-[12.5px] text-[var(--color-brand)] hover:underline"
            >
              View on site
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isNew && (
            <>
              <Button
                variant="ghost"
                icon={History}
                onClick={() => setShowRevisions(true)}
                className="px-2.5 py-1.5 text-[12.5px]"
              >
                History
              </Button>
              <Button
                variant="ghost"
                icon={Trash2}
                onClick={() => setConfirmDelete(true)}
                className="px-2.5 py-1.5 text-[12.5px] text-[var(--color-danger)]"
              >
                Delete
              </Button>
            </>
          )}
          <Button
            icon={Save}
            loading={save.isPending}
            disabled={!dirty && !isNew}
            onClick={() => save.mutate(toApi())}
          >
            {dirty || isNew ? 'Save' : 'Saved'}
          </Button>
        </div>
      </header>

      {error && <Alert tone="error" className="mb-3">{error}</Alert>}

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <section className="card p-5">
            <Field
              label="Title"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              error={fieldErrors.title}
              required
            />

            <div className="mt-4">
              <label className="label mb-1.5 block" htmlFor="excerpt">
                Summary
              </label>
              <textarea
                id="excerpt"
                rows={2}
                className="input resize-y"
                value={form.excerpt}
                onChange={(e) => set({ excerpt: e.target.value })}
                placeholder="One or two sentences for the article card. Left blank, we'll take the opening lines."
              />
            </div>
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px]">Content</h2>
              <span className="text-[12px] text-muted tabular">
                {wordCount} word{wordCount === 1 ? '' : 's'}
              </span>
            </div>
            <RichTextEditor
              value={form.content}
              onChange={(html) => set({ content: html })}
              placeholder="Start writing…"
            />
            <p className="mt-2 text-[12px] text-muted">
              Pasting from Word or another site is fine — the formatting is cleaned up
              automatically.
            </p>
          </section>

          <section className="card p-5">
            <h2 className="text-[15px]">Search engines</h2>
            <p className="mt-0.5 text-[12.5px] text-muted">
              Leave blank to use the title and summary.
            </p>

            <div className="mt-4 space-y-4">
              <Field
                label="Page title"
                value={form.metaTitle}
                onChange={(e) => set({ metaTitle: e.target.value })}
                hint={`${form.metaTitle.length}/60 recommended`}
                maxLength={255}
              />
              <div>
                <label className="label mb-1.5 block" htmlFor="metaDescription">
                  Description
                </label>
                <textarea
                  id="metaDescription"
                  rows={2}
                  className="input resize-y"
                  maxLength={500}
                  value={form.metaDescription}
                  onChange={(e) => set({ metaDescription: e.target.value })}
                />
                <p className="mt-1.5 text-[12px] text-muted">
                  {form.metaDescription.length}/160 recommended
                </p>
              </div>

              <div className="rounded-lg border p-3" style={{ background: 'var(--surface-sunken)' }}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  How it looks in Google
                </p>
                <p className="truncate text-[15px] text-[#1a0dab]">
                  {form.metaTitle || form.title || 'Untitled'}
                </p>
                <p className="truncate text-[12px] text-[var(--color-success)]">
                  arovalabs.com/{form.slug || 'web-address'}/
                </p>
                <p className="line-clamp-2 text-[12.5px] text-muted">
                  {form.metaDescription || form.excerpt || 'No description set.'}
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="text-[15px]">Publishing</h2>
            <div className="mt-3 space-y-3">
              <div>
                <label className="label mb-1.5 block" htmlFor="status">Status</label>
                <select
                  id="status"
                  className="input"
                  value={form.status}
                  onChange={(e) => set({ status: e.target.value })}
                >
                  {Object.entries(CONTENT_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label mb-1.5 block" htmlFor="category">Category</label>
                <select
                  id="category"
                  className="input"
                  value={form.categoryId}
                  onChange={(e) => set({ categoryId: e.target.value })}
                >
                  <option value="">No category</option>
                  {(categories.data?.items ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <Field
                label="Author"
                value={form.authorName}
                onChange={(e) => set({ authorName: e.target.value })}
                hint="Shown on the article."
              />
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-[15px]">Web address</h2>
            <Field
              label="Address"
              value={form.slug}
              onChange={(e) => set({ slug: e.target.value })}
              error={fieldErrors.slug}
              hint={
                isNew
                  ? "Leave blank and we'll build it from the title."
                  : form.status === 'PUBLISHED'
                    ? 'Changing this changes the public link. The old one will redirect automatically.'
                    : 'Changing this changes the public link.'
              }
            />
          </section>

          <section className="card p-5">
            <ImagePicker
              label="Cover image"
              hint="Shown on the article card and at the top of the article."
              value={form.featuredImage}
              onChange={(featuredImage) => set({ featuredImage })}
            />
          </section>
        </aside>
      </div>

      {showRevisions && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowRevisions(false)}
          />
          <div
            className="card relative flex max-h-[70vh] w-[min(460px,100%)] flex-col p-5"
            style={{ boxShadow: 'var(--shadow-pop)' }}
          >
            <h2 className="text-[16px]">Version history</h2>
            <p className="mt-1 text-[12.5px] text-muted">
              Restoring does not lose anything — the current version is saved first.
            </p>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
              {revisions.isLoading ? (
                <p className="py-6 text-center text-[13px] text-muted">Loading…</p>
              ) : revisions.data?.items.length ? (
                <ul className="divide-y">
                  {revisions.data.items.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] text-strong">
                          {r.summary ?? 'Earlier version'}
                        </p>
                        <p className="text-[11.5px] text-muted">
                          {r.actor} ·{' '}
                          {new Date(r.createdAt).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                          {r.note && ` · ${r.note}`}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="shrink-0 px-2.5 py-1 text-[12px]"
                        loading={restore.isPending}
                        onClick={() => restore.mutate(r.id)}
                      >
                        Restore
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-[13px] text-muted">
                  No earlier versions yet. One is saved every time you save a change.
                </p>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={() => setShowRevisions(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this article?"
        message="This cannot be undone. If it is published, the old link will redirect to the homepage."
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
