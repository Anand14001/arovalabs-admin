import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import Field from '../components/ui/Field';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import Logo from '../components/ui/Logo';
import ThemeToggle from '../components/ui/ThemeToggle';
import { auth } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setBusy(true);
    try {
      await auth.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fieldErrors ?? {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>

        <div className="card p-6">
          <h1 className="text-[19px]">Reset your password</h1>

          {sent ? (
            <>
              {/*
                * The server answers identically whether or not the account
                * exists, so this wording cannot confirm an address either.
                */}
              <Alert tone="success" className="mt-4">
                If that account exists, a reset link is on its way. It expires in
                one hour.
              </Alert>
              <p className="mt-4 text-[12.5px] text-muted">
                No email? Check spam, or ask another admin to reset it for you.
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-[13px] text-muted">
                We&rsquo;ll email you a link to set a new one.
              </p>

              {error && (
                <Alert tone="error" className="mt-4">
                  {error}
                </Alert>
              )}

              <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
                <Field
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={fieldErrors.email}
                  autoComplete="username"
                  placeholder="you@arovalabs.com"
                  required
                  autoFocus
                />
                <Button type="submit" loading={busy} icon={Send} className="w-full">
                  Send reset link
                </Button>
              </form>
            </>
          )}

          <Link
            to="/login"
            className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--color-brand)] hover:underline"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
