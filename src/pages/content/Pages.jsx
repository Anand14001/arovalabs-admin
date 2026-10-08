import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown, ChevronUp, Eye, EyeOff, Lock, Plus, Save, Trash2, X,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Alert from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import RichTextEditor from '../../components/ui/RichTextEditor';
import SectionForm from '../../components/content/SectionForm';
import { useToast } from '../../components/ui/Toast';
import { content, contentKeys, CONTENT_STATUS } from '../../lib/catalog';

/*
 * Pages and their sections.
 *
 * The homepage is twelve blocks; this screen shows them as an ordered list of
 * cards you can reorder, hide or open. Opening one shows a form generated from
 * that block's declared fields — so every heading, image and list item is
 * editable, and the layout is not.
 *
 * Reordering uses buttons rather than drag-and-drop, for the same reason the
 * repeatable fields do: drag is unusable with a keyboard and awkward on touch,
 * and these lists are short.
 */

export default function Pages() {
  const qc = useQueryClient();
  const toast = useToast();

  const [pageId, setPageId] = useState(null);
  const [openSection, setOpenSection] = useState(null);
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [body, setBody] = useState('');
  const [bodyDirty, setBodyDirty] = useState(false);

  const pages = useQuery({ queryKey: contentKeys.pages(), queryFn: content.listPages });
  const types = useQuery({ queryKey: contentKeys.sectionTypes(), queryFn: content.sectionTypes });

  /*
   * Open a page automatically — a screen that starts empty reads as broken.
   * The homepage rather than whichever sorts first alphabetically: it is the
   * page people come here to edit, and "About Us" opening by default is a small
   * daily annoyance.
   */
  useEffect(() => {
    if (pageId || !pages.data?.items.length) return;
    const items = pages.data.items;
    const home = items.find((p) => p.slug === 'home');
    setPageId((home ?? items[0]).id);
  }, [pages.data, pageId]);

  const page = useQuery({
    queryKey: contentKeys.page(pageId),
    queryFn: () => content.getPage(pageId),
    enabled: Boolean(pageId),
  });

  useEffect(() => {
    if (page.data?.page) {
      setBody(page.data.page.bodyHtml ?? '');
      setBodyDirty(false);
      setOpenSection(null);
      setDraft(null);
    }
  }, [page.data]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: contentKeys.page(pageId) });
    qc.invalidateQueries({ queryKey: contentKeys.pages() });
  };

  const saveSection = useMutation({
    mutationFn: ({ id, data }) => content.updateSection(id, { data }),
    onSuccess: () => {
      refresh();
      setOpenSection(null);
      setDraft(null);
      setErrors({});
      toast.success('Section saved.');
    },
    onError: (e) => {
      setErrors(e.fieldErrors ?? {});
      toast.error(e.message);
    },
  });

  const toggleVisible = useMutation({
    mutationFn: (s) => content.updateSection(s.id, { isVisible: !s.isVisible }),
    onSuccess: () => {
      refresh();
      toast.success('Updated.');
    },
    onError: (e) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: (ids) => content.reorderSections(pageId, ids),
    onSuccess: refresh,
    onError: (e) => toast.error(e.message),
  });

  const addSection = useMutation({
    mutationFn: () => content.createSection(pageId, { type: newType, data: {} }),
    onSuccess: ({ section }) => {
      refresh();
      setAdding(false);
      setNewType('');
      setOpenSection(section.id);
      setDraft(section.data ?? {});
      toast.success('Section added — fill it in and save.');
    },
    onError: (e) => toast.error(e.message),
  });

  const removeSection = useMutation({
    mutationFn: (id) => content.deleteSection(id),
    onSuccess: () => {
      refresh();
      setConfirmDelete(null);
      toast.success('Section removed. It is recoverable from its history.');
    },
    onError: (e) => {
      setConfirmDelete(null);
      toast.error(e.message);
    },
  });

  const saveBody = useMutation({
    mutationFn: () => content.updatePage(pageId, { bodyHtml: body }),
    onSuccess: () => {
      refresh();
      setBodyDirty(false);
      toast.success('Page saved.');
    },
    onError: (e) => toast.error(e.message),
  });

  const current = page.data?.page;
  const sections = current?.sections ?? [];
  const typeMap = Object.fromEntries((types.data?.items ?? []).map((t) => [t.type, t]));

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= sections.length) return;
    const ids = sections.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids);
  };

  const open = (s) => {
    setOpenSection(s.id);
    setDraft(s.data ?? {});
    setErrors({});
  };

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-4">
        <h1 className="text-[20px]">Pages</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          Edit the words, images and numbers on each page. The layout stays as designed.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(pages.data?.items ?? []).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPageId(p.id)}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition"
            style={
              pageId === p.id
                ? {
                    background: 'color-mix(in srgb, var(--color-brand) 12%, transparent)',
                    borderColor: 'var(--color-brand)',
                    color: 'var(--color-brand)',
                  }
                : { color: 'var(--text-base)' }
            }
          >
            {p.title}
            {p.isSystem && <Lock className="size-3 opacity-50" aria-label="Built-in page" />}
          </button>
        ))}
      </div>

      {page.isLoading && <p className="py-12 text-center text-[13px] text-muted">Loading…</p>}

      {current && (
        <>
          <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <h2 className="text-[15px]">{current.title}</h2>
              <p className="mt-0.5 text-[12.5px] text-muted">
                arovalabs.com/{current.slug === 'home' ? '' : `${current.slug}/`}
              </p>
            </div>
            <Badge tone={CONTENT_STATUS[current.status]?.tone ?? 'neutral'}>
              {CONTENT_STATUS[current.status]?.label ?? current.status}
            </Badge>
          </div>

          {current.layout === 'RICH_TEXT' ? (
            <section className="card p-5">
              <h2 className="mb-3 text-[15px]">Page content</h2>
              <RichTextEditor
                value={body}
                onChange={(html) => {
                  setBody(html);
                  setBodyDirty(true);
                }}
              />
              <Button
                icon={Save}
                className="mt-3"
                disabled={!bodyDirty}
                loading={saveBody.isPending}
                onClick={() => saveBody.mutate()}
              >
                {bodyDirty ? 'Save page' : 'Saved'}
              </Button>
            </section>
          ) : (
            <>
              <div className="space-y-2">
                {sections.map((s, i) => {
                  const def = typeMap[s.type];
                  const isOpen = openSection === s.id;

                  return (
                    <div key={s.id} className="card overflow-hidden">
                      <div className="flex items-center gap-2 p-3">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => move(i, -1)}
                            disabled={i === 0 || reorder.isPending}
                            aria-label={`Move ${def?.label ?? s.type} up`}
                            className="rounded p-0.5 text-muted transition hover:bg-[var(--surface-hover)] disabled:opacity-30"
                          >
                            <ChevronUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(i, 1)}
                            disabled={i === sections.length - 1 || reorder.isPending}
                            aria-label={`Move ${def?.label ?? s.type} down`}
                            className="rounded p-0.5 text-muted transition hover:bg-[var(--surface-hover)] disabled:opacity-30"
                          >
                            <ChevronDown className="size-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => (isOpen ? setOpenSection(null) : open(s))}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block text-[13.5px] font-medium text-strong">
                            {s.label || def?.label || s.type}
                          </span>
                          <span className="block truncate text-[11.5px] text-muted">
                            {def?.description ?? def?.label ?? s.type}
                          </span>
                        </button>

                        {!s.isVisible && <Badge tone="neutral">Hidden</Badge>}

                        <button
                          type="button"
                          onClick={() => toggleVisible.mutate(s)}
                          title={s.isVisible ? 'Hide from the site' : 'Show on the site'}
                          className="rounded p-1.5 text-muted transition hover:bg-[var(--surface-hover)] hover:text-strong"
                        >
                          {s.isVisible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(s)}
                          title="Remove this section"
                          className="rounded p-1.5 text-muted transition hover:bg-[var(--surface-hover)] hover:text-[var(--color-danger)]"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      {isOpen && (
                        <div className="border-t p-4" style={{ background: 'var(--surface-sunken)' }}>
                          <SectionForm
                            definition={def}
                            data={draft ?? {}}
                            onChange={setDraft}
                            errors={errors}
                          />
                          <div className="mt-4 flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setOpenSection(null);
                                setDraft(null);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              icon={Save}
                              loading={saveSection.isPending}
                              onClick={() => saveSection.mutate({ id: s.id, data: draft })}
                            >
                              Save section
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {adding ? (
                <div className="card mt-3 p-4">
                  <label className="label mb-1.5 block" htmlFor="newSection">
                    What kind of section?
                  </label>
                  <select
                    id="newSection"
                    className="input"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                  >
                    <option value="">Choose…</option>
                    {(types.data?.items ?? []).map((t) => (
                      <option key={t.type} value={t.type}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {newType && (
                    <p className="mt-1.5 text-[12px] text-muted">
                      {typeMap[newType]?.description}
                    </p>
                  )}
                  <div className="mt-3 flex justify-end gap-2">
                    <Button variant="ghost" icon={X} onClick={() => setAdding(false)}>
                      Cancel
                    </Button>
                    <Button
                      loading={addSection.isPending}
                      disabled={!newType}
                      onClick={() => addSection.mutate()}
                    >
                      Add section
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="btn btn-outline mt-3 w-full border-dashed py-2.5 text-[13px]"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add a section
                </button>
              )}

              {sections.length === 0 && (
                <Alert tone="info" className="mt-3">
                  This page has no sections yet.
                </Alert>
              )}
            </>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={`Remove the ${typeMap[confirmDelete?.type]?.label ?? 'section'}?`}
        message="It disappears from the page immediately. A copy is kept in the section's history, so it can be recovered."
        confirmLabel="Remove"
        loading={removeSection.isPending}
        onConfirm={() => removeSection.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
