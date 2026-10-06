/*
 * A reorderable list of repeated fields — parameters, preparation steps, FAQs.
 *
 * Reordering uses explicit up/down buttons rather than drag-and-drop. Drag is
 * nicer with a mouse but is effectively unusable with a keyboard or on a touch
 * screen without a lot of extra work, and these lists are short. Buttons work
 * everywhere, for everyone, immediately.
 */

import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

export default function RepeatableList({
  items,
  onChange,
  renderItem,
  newItem,
  addLabel = 'Add item',
  empty = 'Nothing added yet.',
  // Names the thing being repeated, so the control labels are unique on a page
  // holding several of these lists. Without it a screen reader hears "Remove
  // item 3" four times over and cannot tell which list it belongs to.
  itemNoun = 'item',
}) {
  const update = (index, value) =>
    onChange(items.map((item, i) => (i === index ? value : item)));

  const removeAt = (index) => onChange(items.filter((_, i) => i !== index));

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-[12.5px] text-muted">
          {empty}
        </p>
      )}

      {items.map((item, index) => (
        <div
          key={index}
          className="flex items-start gap-2 rounded-lg border p-2"
          style={{ background: 'var(--surface-sunken)' }}
        >
          <div className="flex flex-col gap-0.5 pt-1">
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              aria-label={`Move ${itemNoun} ${index + 1} up`}
              className="rounded p-0.5 text-muted transition hover:bg-[var(--surface-hover)] disabled:opacity-30"
            >
              <ChevronUp className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === items.length - 1}
              aria-label={`Move ${itemNoun} ${index + 1} down`}
              className="rounded p-0.5 text-muted transition hover:bg-[var(--surface-hover)] disabled:opacity-30"
            >
              <ChevronDown className="size-3.5" />
            </button>
          </div>

          <div className="min-w-0 flex-1">{renderItem(item, (v) => update(index, v), index)}</div>

          <button
            type="button"
            onClick={() => removeAt(index)}
            aria-label={`Remove ${itemNoun} ${index + 1}`}
            className="rounded p-1.5 text-muted transition hover:bg-[var(--surface-hover)] hover:text-[var(--color-danger)]"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...items, structuredClone(newItem)])}
        className="btn btn-outline w-full border-dashed py-2 text-[13px]"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        {addLabel}
      </button>
    </div>
  );
}
