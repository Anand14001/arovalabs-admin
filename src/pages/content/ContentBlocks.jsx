import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import RepeatableList from '../../components/ui/RepeatableList';
import { PageSkeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { content, contentKeys } from '../../lib/catalog';

/*
 * FAQs.
 *
 * Testimonials and Google reviews are deliberately not editable here: the
 * reviews shown on the site are a temporary hardcoded set awaiting a real
 * integration, so building an editor for them would be building a screen for
 * data that is about to be replaced. The API still stores them, and this screen
 * can grow to cover them when that changes.
 */

const GROUPS = [
  { key: 'HOME', label: 'Homepage' },
  { key: 'PRODUCT', label: 'Product pages' },
  { key: 'GENERAL', label: 'General' },
];

export default function ContentBlocks() {
  const qc = useQueryClient();
  const toast = useToast();

  const blocks = useQuery({ queryKey: contentKeys.blocks(), queryFn: content.blocks });

  const [faqs, setFaqs] = useState([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!blocks.data || dirty) return;
    setFaqs(blocks.data.faqs);
    setDirty(false);
  }, [blocks.data, dirty]);

  /*
   * Saved one row at a time rather than as a bulk replace.
   *
   * FAQ rows are referenced by id from page sections, so a delete-and-recreate
   * would quietly break those references. Creating, updating and deleting
   * individually keeps ids stable.
   */
  const save = useMutation({
    mutationFn: async () => {
      const original = new Map(blocks.data.faqs.map((f) => [f.id, f]));
      for (const [index, row] of faqs.entries()) {
        const body = {
          question: row.question,
          answer: row.answer,
          group: row.group ?? 'GENERAL',
          menuOrder: index,
          isVisible: row.isVisible ?? true,
        };
        if (row.id) await content.updateFaq(row.id, body);
        else await content.createFaq(body);
        original.delete(row.id);
      }
      for (const removed of original.keys()) await content.deleteFaq(removed);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contentKeys.blocks() });
      setDirty(false);
      toast.success('FAQs saved.');
    },
    onError: (e) => toast.error(e.message),
  });

  if (blocks.isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-4">
        <h1 className="text-[20px]">FAQs</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          The questions shown on the homepage and product pages. Drag-free reordering with
          the arrows; the order here is the order on the site.
        </p>
      </header>

      <section className="card p-5">
        <RepeatableList
          items={faqs}
          onChange={(next) => {
            setFaqs(next);
            setDirty(true);
          }}
          newItem={{ question: '', answer: '', group: 'GENERAL', isVisible: true }}
          itemNoun="FAQ"
          addLabel="Add a question"
          empty="No questions yet."
          renderItem={(item, update) => (
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
                <input
                  className="input"
                  placeholder="Question"
                  aria-label="Question"
                  value={item.question ?? ''}
                  onChange={(e) => update({ ...item, question: e.target.value })}
                />
                <Select
                  className="w-full text-[13px]"
                  aria-label="Where it appears"
                  value={item.group ?? 'GENERAL'}
                  onChange={(e) => update({ ...item, group: e.target.value })}
                  options={GROUPS.map((g) => ({
                    value: g.key,
                    label: g.label,
                  }))}
                />
              </div>
              <textarea
                rows={2}
                className="input resize-y"
                placeholder="Answer"
                aria-label="Answer"
                value={item.answer ?? ''}
                onChange={(e) => update({ ...item, answer: e.target.value })}
              />
              <label className="flex items-center gap-2 text-[12.5px] text-muted">
                <input
                  type="checkbox"
                  checked={item.isVisible ?? true}
                  onChange={(e) => update({ ...item, isVisible: e.target.checked })}
                  className="size-3.5 accent-[var(--color-brand)]"
                />
                Show on the site
              </label>
            </div>
          )}
        />

        <Button
          icon={Save}
          className="mt-4"
          disabled={!dirty}
          loading={save.isPending}
          onClick={() => save.mutate()}
        >
          {dirty ? 'Save FAQs' : 'Saved'}
        </Button>
      </section>
    </div>
  );
}
