/*
 * A section's form, generated from its declared field schema.
 *
 * The admin does not know what a HERO or a STATISTICS block contains — the
 * server's section registry does, and sends that description down. This renders
 * it. Adding a field to a section type therefore needs no change here at all,
 * and the form can never offer a field the server would reject.
 */

import Field from '../ui/Field';
import RepeatableList from '../ui/RepeatableList';
import ImagePicker from '../ui/ImagePicker';
import RichTextEditor from '../ui/RichTextEditor';

const labelFor = (f) => f.label ?? f.name;

function Scalar({ field, value, onChange, error }) {
  const common = {
    label: labelFor(field),
    hint: field.help,
    error,
    required: field.required,
  };

  switch (field.kind) {
    case 'textarea':
      return (
        <div>
          <label className="label mb-1.5 block" htmlFor={`f-${field.name}`}>
            {labelFor(field)}
            {field.required && <span className="ml-0.5 text-[var(--color-brand)]">*</span>}
          </label>
          <textarea
            id={`f-${field.name}`}
            rows={3}
            className="input resize-y"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.help && <p className="mt-1.5 text-[12px] text-muted">{field.help}</p>}
          {error && <p className="mt-1.5 text-[12.5px] text-[var(--color-danger)]">{error}</p>}
        </div>
      );

    case 'number':
      return (
        <Field
          {...common}
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      );

    case 'toggle':
      return (
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="size-3.5 accent-[var(--color-brand)]"
          />
          {labelFor(field)}
        </label>
      );

    case 'image':
      return (
        <ImagePicker
          label={labelFor(field)}
          hint={field.help}
          // A section image may be an uploaded id or a path into the site's own
          // static assets, which is how the imported illustrations arrived.
          value={
            typeof value === 'string'
              ? { url: value.startsWith('http') ? value : `${import.meta.env.VITE_SITE_URL ?? 'http://localhost:5173'}${value}` }
              : value
          }
          onChange={(picked) => onChange(picked?.id ?? null)}
        />
      );

    case 'link':
      return (
        <div>
          <p className="label mb-1.5">{labelFor(field)}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="input"
              placeholder="Button text"
              aria-label={`${labelFor(field)} text`}
              value={value?.label ?? ''}
              onChange={(e) => onChange({ ...(value ?? {}), label: e.target.value })}
            />
            <input
              className="input"
              placeholder="/tests/"
              aria-label={`${labelFor(field)} address`}
              value={value?.to ?? ''}
              onChange={(e) => onChange({ ...(value ?? {}), to: e.target.value })}
            />
          </div>
        </div>
      );

    case 'richText':
      return (
        <div>
          <p className="label mb-1.5">{labelFor(field)}</p>
          <RichTextEditor value={value ?? ''} onChange={onChange} />
        </div>
      );

    case 'strings':
      return (
        <div>
          <p className="label mb-1.5">{labelFor(field)}</p>
          {field.help && <p className="mb-2 text-[12px] text-muted">{field.help}</p>}
          <RepeatableList
            items={value ?? []}
            onChange={onChange}
            newItem=""
            itemNoun={labelFor(field).toLowerCase()}
            addLabel={`Add to ${labelFor(field).toLowerCase()}`}
            empty="Nothing here yet."
            renderItem={(item, update) => (
              <input
                className="input"
                value={item}
                onChange={(e) => update(e.target.value)}
                aria-label={labelFor(field)}
              />
            )}
          />
        </div>
      );

    case 'productSource':
      return (
        <div>
          <p className="label mb-1.5">{labelFor(field)}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              className="input"
              aria-label="Product type"
              value={value?.type ?? ''}
              onChange={(e) => onChange({ ...(value ?? { mode: 'query', limit: 8 }), type: e.target.value || null })}
            >
              <option value="">Tests and packages</option>
              <option value="TEST">Tests only</option>
              <option value="PACKAGE">Packages only</option>
            </select>
            <input
              className="input"
              type="number"
              min="1"
              max="24"
              aria-label="How many to show"
              placeholder="How many"
              value={value?.limit ?? 8}
              onChange={(e) =>
                onChange({ ...(value ?? { mode: 'query' }), limit: Number(e.target.value) || 8 })
              }
            />
          </div>
          <p className="mt-1.5 text-[12px] text-muted">
            The rail fills itself from the catalogue, so new tests appear automatically.
          </p>
        </div>
      );

    default:
      return (
        <Field
          {...common}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export default function SectionForm({ definition, data, onChange, errors = {} }) {
  const set = (name, value) => onChange({ ...data, [name]: value });

  if (!definition) {
    return (
      <p className="text-[13px] text-muted">
        This section type is not available in this version of the admin.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {definition.fields.map((field) =>
        field.kind === 'list' ? (
          <div key={field.name}>
            <p className="label mb-1.5">{labelFor(field)}</p>
            {field.help && <p className="mb-2 text-[12px] text-muted">{field.help}</p>}
            <RepeatableList
              items={data[field.name] ?? []}
              onChange={(items) => set(field.name, items)}
              newItem={Object.fromEntries(field.fields.map((f) => [f.name, null]))}
              itemNoun={labelFor(field).toLowerCase().replace(/s$/, '')}
              addLabel={`Add ${labelFor(field).toLowerCase().replace(/s$/, '')}`}
              empty="Nothing here yet."
              renderItem={(item, update) => (
                <div className="space-y-2">
                  {field.fields.map((sub) => (
                    <Scalar
                      key={sub.name}
                      field={sub}
                      value={item?.[sub.name]}
                      onChange={(v) => update({ ...item, [sub.name]: v })}
                    />
                  ))}
                </div>
              )}
            />
          </div>
        ) : (
          <Scalar
            key={field.name}
            field={field}
            value={data[field.name]}
            onChange={(v) => set(field.name, v)}
            error={errors[field.name]}
          />
        ),
      )}
    </div>
  );
}
