import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-[42px] font-semibold leading-none text-muted tabular">404</p>
      <h1 className="mt-3 text-[18px]">Nothing here</h1>
      <p className="mt-1.5 text-[13px] text-muted">
        This screen either doesn&rsquo;t exist or hasn&rsquo;t been built yet.
        Items marked &ldquo;Soon&rdquo; in the sidebar are still to come.
      </p>
      <Link
        to="/"
        className="btn btn-outline mt-5 inline-flex"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to dashboard
      </Link>
    </div>
  );
}
