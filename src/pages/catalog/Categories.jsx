import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Field from '../../components/ui/Field';
import Alert from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Select from '../../components/ui/Select';
import IconButton from '../../components/ui/IconButton';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { categories, keys, flattenCategories } from '../../lib/catalog';

const BLANK = { name: '', slug: '', parentId: null, description: '', isVisible: true };

function Row({ node, depth, onEdit, onDelete }) {
  return (
    <>
      <div
        className="flex items-center gap-2 border-b py-2.5 pr-2"
        style={{ paddingLeft: `${8 + depth * 22}px` }}
      >
        {depth > 0 && (
          <ChevronRight className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
        )}

        <div className="min-w-0 flex-1">
          <span className="text-[13.5px] font-medium text-strong">{node.name}</span>
          <span className="ml-2 text-[11.5px] text-muted">/{node.path}</span>
          {!node.isVisible && (
            <span className="ml-2 text-[11px] text-[var(--color-warning)]">hidden</span>
          )}
        </div>

        <span className="shrink-0 text-[12px] text-muted tabular">
          {node.productCount} product{node.productCount === 1 ? '' : 's'}
        </span>

        <div className="flex shrink-0 gap-1">
          <IconButton icon={Pencil} label={`Edit category ${node.name}`} onClick={() => onEdit(node)} />
          <IconButton icon={Trash2} label={`Delete category ${node.name}`} tone="danger" onClick={() => onDelete(node)} />
        </div>
      </div>

      {node.children?.map((child) => (
        <Row
          key={child.id}
          node={child}
          depth={depth + 1}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

export default function Categories() {
  const qc = useQueryClient();
  const toast = useToast();

  const [editing, setEditing] = useState(null); // null | {} (new) | node
  const [form, setForm] = useState(BLANK);
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirm, setConfirm] = useState(null);

  const list = useQuery({ queryKey: keys.categories(), queryFn: categories.list });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['categories'] });
    // Product rows show category names, so they go stale too.
    qc.invalidateQueries({ queryKey: ['products'] });
  };

  const save = useMutation({
    mutationFn: (body) =>
      editing?.id ? categories.update(editing.id, body) : categories.create(body),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      setFieldErrors({});
      toast.success('Category saved.');
    },
    onError: (e) => {
      setFieldErrors(e.fieldErrors ?? {});
      toast.error(e.message);
    },
  });

  const remove = useMutation({
    mutationFn: (node) => categories.remove(node.id),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      toast.success('Category deleted.');
    },
    // The API refuses when products or children are still attached, and says
    // how many. Passing that through is more helpful than a generic error.
    onError: (e) => {
      setConfirm(null);
      toast.error(e.message);
    },
  });

  const openNew = () => {
    setForm(BLANK);
    setFieldErrors({});
    setEditing({});
  };

  const openEdit = (node) => {
    setForm({
      name: node.name,
      slug: node.slug,
      parentId: node.parentId,
      description: node.description ?? '',
      isVisible: node.isVisible,
    });
    setFieldErrors({});
    setEditing(node);
  };

  // A category cannot become its own descendant, so its own subtree is excluded
  // from the parent choices. The API enforces this too; this just avoids
  // offering a choice that will be rejected.
  const parentOptions = flattenCategories(list.data?.items).filter((c) => {
    if (!editing?.id) return true;
    return c.id !== editing.id && !c.path.startsWith(`${editing.path}/`);
  });

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px]">Categories</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            The navigation tree behind /tests/ and /packages/.
          </p>
        </div>
        <Button icon={Plus} onClick={openNew}>
          New category
        </Button>
      </header>

      {list.error && (
        <Alert tone="error" className="mb-3">
          {list.error.message}
        </Alert>
      )}

      <div className="card overflow-hidden">
        {list.isLoading ? (
          <div role="status" aria-label="Loading categories" className="space-y-3 p-4">
            <span className="sr-only">Loading categories</span>
            {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)}
          </div>
        ) : list.data?.items.length ? (
          list.data.items.map((node) => (
            <Row
              key={node.id}
              node={node}
              depth={0}
              onEdit={openEdit}
              onDelete={setConfirm}
            />
          ))
        ) : (
          <p className="py-12 text-center text-[13px] text-muted">No categories yet.</p>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/50"
            onClick={() => setEditing(null)}
          />
          <div
            className="card relative w-[min(460px,100%)] p-5"
            style={{ boxShadow: 'var(--shadow-pop)' }}
          >
            <h2 className="text-[16px]">
              {editing.id ? `Edit ${editing.name}` : 'New category'}
            </h2>

            <div className="mt-4 space-y-4">
              <Field
                label="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                error={fieldErrors.name}
                required
                autoFocus
              />
              <Field
                label="Slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                error={fieldErrors.slug}
                hint={
                  editing.id
                    ? 'Changing this changes the URL, and every sub-category URL below it.'
                    : 'Leave blank to generate from the name.'
                }
              />
              <div>
                <label className="label mb-1.5" htmlFor="parent">Parent</label>
                <Select
                  id="parent"
                  className="w-full"
                  value={form.parentId ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      parentId: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  options={[
                    { value: '', label: 'No parent (top level)' },
                    ...parentOptions.map((c) => ({
                      value: c.id,
                      label: c.label,
                    })),
                  ]}
                />
              </div>
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={form.isVisible}
                  onChange={(e) => setForm((f) => ({ ...f, isVisible: e.target.checked }))}
                  className="size-3.5 accent-[var(--color-brand)]"
                />
                Visible on the site
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button loading={save.isPending} onClick={() => save.mutate(form)}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={`Delete "${confirm?.name}"?`}
        message="Categories holding products or sub-categories cannot be deleted — hide them instead."
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
