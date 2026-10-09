const base = 'skeleton animate-pulse rounded-md bg-[var(--surface-sunken)]';

export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`${base} ${className}`} />;
}

export function PageSkeleton({ variant = 'detail' }) {
  return (
    <section role="status" aria-label="Loading page" className="mx-auto max-w-6xl space-y-4">
      <span className="sr-only">Loading page content</span>
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {variant === 'editor' && (
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      )}
      <div className={variant === 'editor' ? 'space-y-4' : 'grid gap-4 md:grid-cols-2'}>
        <div className="card space-y-4 p-5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-28 w-full" />
          {variant === 'editor' && <Skeleton className="h-28 w-full" />}
        </div>
        {variant !== 'editor' && (
          <div className="card space-y-4 p-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
      </div>
    </section>
  );
}

export function ImageGridSkeleton({ count = 12 }) {
  return (
    <div role="status" aria-label="Loading images" className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
      <span className="sr-only">Loading images</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-lg border p-1.5">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="mx-1 mt-2 h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}
