import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Save, Trash2 } from 'lucide-react';
import Field from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import RepeatableList from '../../components/ui/RepeatableList';
import ImagePicker from '../../components/ui/ImagePicker';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Select from '../../components/ui/Select';
import { PageSkeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { products, categories, tags, keys, flattenCategories } from '../../lib/catalog';

const TABS = ['Basics', 'Content', 'Media', 'Taxonomy', 'Logistics', 'SEO'];

const BLANK = {
  title: '', slug: '', type: 'TEST', status: 'DRAFT',
  regularPrice: '', salePrice: '',
  cardExcerpt: '', excerpt: '', overview: '',
  badges: [], ribbon: '',
  parameters: [], parameterGroups: [], parametersUnavailable: false,
  showAllParametersCta: false,
  preparation: [], process: [], audience: [], faqs: [],
  categoryIds: [], tagIds: [],
  cardImage: null, detailImage: null, archiveImage: null,
  sampleType: '', fastingRequired: false, fastingNote: '',
  turnaroundHours: '', reportFormat: '',
  metaTitle: '', metaDescription: '',
};

// The API speaks paise; the form shows rupees, because that is what a person
// types. Conversion happens here, at the single boundary.
const fromApi = (p) => ({
  ...BLANK,
  ...p,
  regularPrice: p.price ? String(p.price.regularRupees) : '',
  salePrice: p.price ? String(p.price.saleRupees) : '',
  badges: p.badges ?? [],
  ribbon: p.ribbon ?? '',
  cardExcerpt: p.cardExcerpt ?? '',
  excerpt: p.excerpt ?? '',
  overview: p.overview ?? '',
  sampleType: p.logistics?.sampleType ?? '',
  fastingRequired: p.logistics?.fastingRequired ?? false,
  fastingNote: p.logistics?.fastingNote ?? '',
  turnaroundHours: p.logistics?.turnaroundHours ?? '',
  reportFormat: p.logistics?.reportFormat ?? '',
  metaTitle: p.seo?.metaTitle ?? '',
  metaDescription: p.seo?.metaDescription ?? '',
  faqs: (p.faqs ?? []).map((f) => ({ question: f.q, answer: f.a })),
  parameterGroups: (p.parameterGroups ?? []).map((g) => ({
    name: g.name, summary: g.summary ?? '', items: g.items ?? [],
  })),
});

const toApi = (f) => ({
  title: f.title,
  slug: f.slug || undefined,
  type: f.type,
  status: f.status,
  regularPrice: Number(f.regularPrice) || 0,
  salePrice: Number(f.salePrice) || 0,
  cardExcerpt: f.cardExcerpt || null,
  excerpt: f.excerpt || null,
  overview: f.overview || null,
  badges: f.badges,
  ribbon: f.ribbon || null,
  parameters: f.parameters,
  parametersUnavailable: f.parametersUnavailable,
  parameterGroups: f.parameterGroups.map((g) => ({
    name: g.name, summary: g.summary || null, items: g.items,
  })),
  showAllParametersCta: f.showAllParametersCta,
  preparation: f.preparation,
  process: f.process,
  audience: f.audience,
  faqs: f.faqs,
  categoryIds: f.categoryIds,
  tagIds: f.tagIds,
  cardImageId: f.cardImage?.id ?? null,
  detailImageId: f.detailImage?.id ?? null,
  archiveImageId: f.archiveImage?.id ?? null,
  sampleType: f.sampleType || null,
  fastingRequired: f.fastingRequired,
  fastingNote: f.fastingNote || null,
  turnaroundHours: f.turnaroundHours === '' ? null : Number(f.turnaroundHours),
  reportFormat: f.reportFormat || null,
  metaTitle: f.metaTitle || null,
  metaDescription: f.metaDescription || null,
});

/*
 * Send only what changed.
 *
 * The API replaces nested content wholesale — parameters, FAQs, steps,
 * categories, tags are deleted and reinserted whenever they are present in the
 * payload. Sending the whole product on every save therefore rewrote around
 * thirty rows to change one line of text, and against a remote database at
 * ~50ms per statement that made a trivial save take two and a half seconds.
 *
 * Comparing each top-level key against the version that was loaded keeps a
 * normal edit down to the handful of scalars that actually moved.
 */
const changedOnly = (next, original) => {
  if (!original) return next;
  const out = {};
  for (const [key, value] of Object.entries(next)) {
    if (JSON.stringify(value) !== JSON.stringify(original[key])) out[key] = value;
  }
  return out;
};

const Section = ({ title, hint, children }) => (
  <section className="card p-5">
    <h2 className="text-[15px]">{title}</h2>
    {hint && <p className="mt-0.5 text-[12.5px] text-muted">{hint}</p>}
    <div className="mt-4">{children}</div>
  </section>
);

export default function ProductEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState('Basics');
  const [form, setForm] = useState(BLANK);
  // The version last loaded or saved, used to work out what actually changed.
  const [baseline, setBaseline] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const query = useQuery({
    queryKey: keys.product(id),
    queryFn: () => products.get(id),
    enabled: !isNew,
  });

  const cats = useQuery({ queryKey: keys.categories(), queryFn: categories.list });
  const tagList = useQuery({ queryKey: keys.tags(), queryFn: tags.list });

  /*
   * Load the server's version into the form — but never on top of unsaved work.
   *
   * A save invalidates the query, which refetches, which lands here. If someone
   * starts typing in that window their keystrokes were being wiped by the
   * response to their own save. The dirty check makes the server authoritative
   * only while there is nothing local to lose.
   */
  useEffect(() => {
    if (!query.data?.product || dirty) return;
    const loaded = fromApi(query.data.product);
    setForm(loaded);
    setBaseline(toApi(loaded));
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `dirty` is a guard,
    // not a trigger: re-running when it flips would defeat the point.
  }, [query.data]);

  /*
   * Warn before leaving with unsaved work.
   *
   * Only covers closing or reloading the tab; React Router navigations are
   * guarded by the explicit check in `leave()` below, because beforeunload does
   * not fire for them.
   */
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

  const save = useMutation({
    mutationFn: (body) => (isNew ? products.create(body) : products.update(id, body)),
    onSuccess: ({ product }) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: keys.product(String(product.id)) });
      // The saved state becomes the new baseline, so a second save sends only
      // what changed after it rather than repeating the first save's fields.
      setBaseline(toApi(fromApi(product)));
      setDirty(false);
      setFieldErrors({});
      setError(null);
      toast.success(isNew ? 'Product created.' : 'Changes saved.');
      if (isNew) navigate(`/products/${product.id}`, { replace: true });
    },
    onError: (e) => {
      setError(e.message);
      setFieldErrors(e.fieldErrors ?? {});
      // Field errors are useless if they are on a tab the user cannot see.
      const first = Object.keys(e.fieldErrors ?? {})[0];
      if (first) {
        const tabFor = {
          title: 'Basics', slug: 'Basics', regularPrice: 'Basics', salePrice: 'Basics',
          metaTitle: 'SEO', metaDescription: 'SEO',
        }[first];
        if (tabFor) setTab(tabFor);
      }
      toast.error(e.message);
    },
  });

  const remove = useMutation({
    mutationFn: () => products.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted.');
      navigate('/products');
    },
    onError: (e) => {
      setConfirmDelete(false);
      toast.error(e.message);
    },
  });

  const leave = () => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    navigate('/products');
  };

  const categoryOptions = useMemo(
    () => flattenCategories(cats.data?.items),
    [cats.data],
  );

  const discount = useMemo(() => {
    const r = Number(form.regularPrice);
    const s = Number(form.salePrice);
    if (!r || !s || s >= r) return null;
    return `${Math.round(((r - s) / r) * 100)}% OFF`;
  }, [form.regularPrice, form.salePrice]);

  if (!isNew && query.isLoading) {
    return <PageSkeleton variant="editor" />;
  }
  if (!isNew && query.error) {
    return (
      <Alert tone="error" className="mx-auto max-w-2xl">
        {query.error.message}
      </Alert>
    );
  }

  const toggleIn = (list, value) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

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
            All products
          </button>
          <h1 className="truncate text-[20px]">
            {isNew ? 'New product' : form.title || 'Untitled'}
          </h1>
          {!isNew && form.slug && (
            <a
              href={`${import.meta.env.VITE_SITE_URL ?? 'http://localhost:5173'}/product/${form.slug}/`}
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
            <Button
              variant="ghost"
              icon={Trash2}
              onClick={() => setConfirmDelete(true)}
              className="text-[var(--color-danger)]"
            >
              Delete
            </Button>
          )}
          <Button
            icon={Save}
            loading={save.isPending}
            disabled={!dirty && !isNew}
            onClick={() => save.mutate(isNew ? toApi(form) : changedOnly(toApi(form), baseline))}
          >
            {dirty || isNew ? 'Save' : 'Saved'}
          </Button>
        </div>
      </header>

      {error && (
        <Alert tone="error" className="mb-3">
          {error}
        </Alert>
      )}

      <div className="mb-4 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-medium transition"
            style={
              tab === t
                ? { borderColor: 'var(--color-brand)', color: 'var(--color-brand)' }
                : { borderColor: 'transparent', color: 'var(--text-muted)' }
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {tab === 'Basics' && (
          <>
            <Section title="Identity">
              <div className="space-y-4">
                <Field
                  label="Title"
                  value={form.title}
                  onChange={(e) => set({ title: e.target.value })}
                  error={fieldErrors.title}
                  required
                />
                <Field
                  label="URL slug"
                  value={form.slug}
                  onChange={(e) => set({ slug: e.target.value })}
                  error={fieldErrors.slug}
                  hint={
                    isNew
                      ? 'Leave blank to generate from the title.'
                      : 'Changing this changes the public URL of this page.'
                  }
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label mb-1.5" htmlFor="type">Type</label>
                    <Select
                      id="type"
                      className="w-full"
                      value={form.type}
                      onChange={(e) => set({ type: e.target.value })}
                      options={[
                        { value: 'TEST', label: 'Test' },
                        { value: 'PACKAGE', label: 'Package' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="label mb-1.5" htmlFor="status">Status</label>
                    <Select
                      id="status"
                      className="w-full"
                      value={form.status}
                      onChange={(e) => set({ status: e.target.value })}
                      options={[
                        { value: 'DRAFT', label: 'Draft', tone: 'warning' },
                        { value: 'PUBLISHED', label: 'Published', tone: 'success' },
                        { value: 'ARCHIVED', label: 'Archived', tone: 'neutral' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Pricing" hint="In rupees. The discount badge is worked out for you.">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  label="Regular price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.regularPrice}
                  onChange={(e) => set({ regularPrice: e.target.value })}
                  error={fieldErrors.regularPrice}
                />
                <Field
                  label="Sale price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.salePrice}
                  onChange={(e) => set({ salePrice: e.target.value })}
                  error={fieldErrors.salePrice}
                />
                <div>
                  <p className="label mb-1.5">Discount</p>
                  <p className="input flex items-center text-muted">{discount ?? 'None'}</p>
                </div>
              </div>
            </Section>

            <Section title="Summary" hint="Short copy for cards and listings.">
              <div className="space-y-4">
                <Field
                  label="Card excerpt"
                  value={form.cardExcerpt}
                  onChange={(e) => set({ cardExcerpt: e.target.value })}
                  hint={`${form.cardExcerpt.length}/500 — shown on listing cards.`}
                  maxLength={500}
                />
                <div>
                  <label className="label mb-1.5" htmlFor="excerpt">Intro paragraph</label>
                  <textarea
                    id="excerpt"
                    rows={3}
                    className="input resize-y"
                    value={form.excerpt}
                    onChange={(e) => set({ excerpt: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Ribbon"
                    value={form.ribbon}
                    onChange={(e) => set({ ribbon: e.target.value })}
                    hint='Corner label, e.g. "Most Trusted". Leave blank for none.'
                  />
                  <Field
                    label="Badges"
                    value={form.badges.join(', ')}
                    onChange={(e) =>
                      set({
                        badges: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    hint="Comma separated, e.g. NABL Accredited."
                  />
                </div>
              </div>
            </Section>
          </>
        )}

        {tab === 'Content' && (
          <>
            <Section title="Overview" hint="The long description on the product page.">
              <textarea
                rows={8}
                className="input resize-y"
                value={form.overview}
                onChange={(e) => set({ overview: e.target.value })}
                aria-label="Overview"
              />
            </Section>

            <Section
              title={form.type === 'PACKAGE' ? 'Parameter groups' : 'Parameters'}
              hint={
                form.type === 'PACKAGE'
                  ? 'Packages list their tests grouped by profile.'
                  : 'What this test measures.'
              }
            >
              <label className="mb-3 flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={form.parametersUnavailable}
                  onChange={(e) => set({ parametersUnavailable: e.target.checked })}
                  className="size-3.5 accent-[var(--color-brand)]"
                />
                No parameter list available for this product
              </label>

              {form.type === 'PACKAGE' ? (
                <RepeatableList
                  items={form.parameterGroups}
                  onChange={(parameterGroups) => set({ parameterGroups })}
                  newItem={{ name: '', summary: '', items: [] }}
                  addLabel="Add group"
                  itemNoun="group"
                  empty="No parameter groups yet."
                  renderItem={(g, update) => (
                    <div className="space-y-2">
                      <input
                        className="input"
                        placeholder="Group name, e.g. Lipid Profile (8 tests)"
                        value={g.name}
                        onChange={(e) => update({ ...g, name: e.target.value })}
                        aria-label="Group name"
                      />
                      <input
                        className="input"
                        placeholder="Tests in this group, comma separated"
                        value={g.items.join(', ')}
                        onChange={(e) =>
                          update({
                            ...g,
                            items: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        aria-label="Group items"
                      />
                    </div>
                  )}
                />
              ) : (
                <RepeatableList
                  items={form.parameters}
                  onChange={(parameters) => set({ parameters })}
                  newItem=""
                  addLabel="Add parameter"
                  itemNoun="parameter"
                  empty="No parameters listed."
                  renderItem={(p, update) => (
                    <input
                      className="input"
                      placeholder="e.g. Glucose Fasting"
                      value={p}
                      onChange={(e) => update(e.target.value)}
                      aria-label="Parameter name"
                    />
                  )}
                />
              )}
            </Section>

            <Section title="Preparation" hint="What the patient should do beforehand.">
              <RepeatableList
                items={form.preparation}
                onChange={(preparation) => set({ preparation })}
                newItem={{ title: '', text: '', icon: '' }}
                addLabel="Add step"
                itemNoun="preparation step"
                empty="No preparation steps."
                renderItem={(s, update) => (
                  <div className="space-y-2">
                    <input
                      className="input"
                      placeholder="Title (optional), e.g. 10-12 Hours Fasting"
                      value={s.title ?? ''}
                      onChange={(e) => update({ ...s, title: e.target.value })}
                      aria-label="Preparation step title"
                    />
                    <textarea
                      rows={2}
                      className="input resize-y"
                      placeholder="Instruction"
                      value={s.text}
                      onChange={(e) => update({ ...s, text: e.target.value })}
                      aria-label="Preparation step text"
                    />
                  </div>
                )}
              />
            </Section>

            <Section title="How it works" hint="The numbered process shown on the page.">
              <RepeatableList
                items={form.process}
                onChange={(process) => set({ process })}
                newItem={{ text: '', icon: '' }}
                addLabel="Add step"
                itemNoun="process step"
                empty="No process steps."
                renderItem={(s, update) => (
                  <input
                    className="input"
                    placeholder="e.g. Sample collected 2 hours after the meal"
                    value={s.text}
                    onChange={(e) => update({ ...s, text: e.target.value })}
                    aria-label="Process step"
                  />
                )}
              />
            </Section>

            <Section title="Who should take this">
              <RepeatableList
                items={form.audience}
                onChange={(audience) => set({ audience })}
                newItem=""
                addLabel="Add point"
                itemNoun="audience point"
                empty="No audience points."
                renderItem={(a, update) => (
                  <textarea
                    rows={2}
                    className="input resize-y"
                    value={a}
                    onChange={(e) => update(e.target.value)}
                    aria-label="Audience point"
                  />
                )}
              />
            </Section>

            <Section title="FAQs">
              <RepeatableList
                items={form.faqs}
                onChange={(faqs) => set({ faqs })}
                newItem={{ question: '', answer: '' }}
                addLabel="Add question"
                itemNoun="FAQ"
                empty="No FAQs."
                renderItem={(f, update) => (
                  <div className="space-y-2">
                    <input
                      className="input"
                      placeholder="Question"
                      value={f.question}
                      onChange={(e) => update({ ...f, question: e.target.value })}
                      aria-label="Question"
                    />
                    <textarea
                      rows={2}
                      className="input resize-y"
                      placeholder="Answer"
                      value={f.answer}
                      onChange={(e) => update({ ...f, answer: e.target.value })}
                      aria-label="Answer"
                    />
                  </div>
                )}
              />
            </Section>
          </>
        )}

        {tab === 'Media' && (
          <Section title="Images" hint="Three slots, as the site uses them in different places.">
            <div className="grid gap-6 sm:grid-cols-2">
              <ImagePicker
                label="Card image"
                hint="Listings, carousels and search results."
                value={form.cardImage}
                onChange={(cardImage) => set({ cardImage })}
              />
              <ImagePicker
                label="Detail image"
                hint="The large image on the product page."
                value={form.detailImage}
                onChange={(detailImage) => set({ detailImage })}
              />
              <ImagePicker
                label="Archive thumbnail"
                hint="Square thumbnail for category pages."
                value={form.archiveImage}
                onChange={(archiveImage) => set({ archiveImage })}
              />
            </div>
          </Section>
        )}

        {tab === 'Taxonomy' && (
          <>
            <Section title="Categories" hint="Where this appears in the site's navigation.">
              <div className="grid gap-1.5 sm:grid-cols-2">
                {categoryOptions.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={form.categoryIds.includes(c.id)}
                      onChange={() => set({ categoryIds: toggleIn(form.categoryIds, c.id) })}
                      className="size-3.5 accent-[var(--color-brand)]"
                    />
                    <span style={{ paddingLeft: `${c.depth * 10}px` }}>{c.name}</span>
                  </label>
                ))}
              </div>
            </Section>

            <Section title="Organ tags" hint="Drives the homepage's 'Choose Test by Organ' tiles.">
              <div className="flex flex-wrap gap-2">
                {(tagList.data?.items ?? []).map((t) => {
                  const on = form.tagIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => set({ tagIds: toggleIn(form.tagIds, t.id) })}
                      className="rounded-lg border px-3 py-1.5 text-[13px] transition"
                      style={
                        on
                          ? {
                              background: 'color-mix(in srgb, var(--color-brand) 12%, transparent)',
                              borderColor: 'var(--color-brand)',
                              color: 'var(--color-brand)',
                            }
                          : undefined
                      }
                      aria-pressed={on}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </Section>
          </>
        )}

        {tab === 'Logistics' && (
          <Section title="Sample & reporting">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Sample type"
                  value={form.sampleType}
                  onChange={(e) => set({ sampleType: e.target.value })}
                  hint="e.g. Blood (serum)"
                />
                <Field
                  label="Turnaround (hours)"
                  type="number"
                  min="0"
                  value={form.turnaroundHours}
                  onChange={(e) => set({ turnaroundHours: e.target.value })}
                  hint="Used to flag overdue reports later."
                />
              </div>
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={form.fastingRequired}
                  onChange={(e) => set({ fastingRequired: e.target.checked })}
                  className="size-3.5 accent-[var(--color-brand)]"
                />
                Fasting required
              </label>
              {form.fastingRequired && (
                <Field
                  label="Fasting note"
                  value={form.fastingNote}
                  onChange={(e) => set({ fastingNote: e.target.value })}
                  hint="e.g. 10-12 hours, water allowed."
                />
              )}
              <Field
                label="Report format"
                value={form.reportFormat}
                onChange={(e) => set({ reportFormat: e.target.value })}
                hint="e.g. PDF e-report"
              />
            </div>
          </Section>
        )}

        {tab === 'SEO' && (
          <Section title="Search engines" hint="Leave blank to fall back to the title and excerpt.">
            <div className="space-y-4">
              <Field
                label="Meta title"
                value={form.metaTitle}
                onChange={(e) => set({ metaTitle: e.target.value })}
                hint={`${form.metaTitle.length}/60 recommended.`}
                maxLength={255}
              />
              <div>
                <label className="label mb-1.5" htmlFor="metaDescription">Meta description</label>
                <textarea
                  id="metaDescription"
                  rows={3}
                  className="input resize-y"
                  maxLength={500}
                  value={form.metaDescription}
                  onChange={(e) => set({ metaDescription: e.target.value })}
                />
                <p className="mt-1.5 text-[12px] text-muted">
                  {form.metaDescription.length}/160 recommended.
                </p>
              </div>

              <div className="rounded-lg border p-3" style={{ background: 'var(--surface-sunken)' }}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Search result preview
                </p>
                <p className="truncate text-[15px] text-[#1a0dab]">
                  {form.metaTitle || form.title || 'Untitled'}
                </p>
                <p className="truncate text-[12px] text-[var(--color-success)]">
                  arovalabs.com/product/{form.slug || 'slug'}/
                </p>
                <p className="line-clamp-2 text-[12.5px] text-muted">
                  {form.metaDescription || form.cardExcerpt || 'No description set.'}
                </p>
              </div>
            </div>
          </Section>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this product?"
        message="This cannot be undone. If it has ever been ordered, archive it instead — the API will refuse the delete."
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
