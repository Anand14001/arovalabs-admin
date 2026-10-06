import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import Field from '../components/ui/Field';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import Logo from '../components/ui/Logo';
import ThemeToggle from '../components/ui/ThemeToggle';
import { auth } from '../lib/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Checked here rather than server-side: the confirmation field exists only
    // to catch typing mistakes, so the server has no use for it.
    if (password !== confirm) {
      setFieldErrors({ confirm: 'Those two passwords do not match.' });
      return;
    }

    setBusy(true);
    try {
      await auth.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
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
          <h1 className="text-[19px]">Set a new password</h1>

          {!token ? (
            <Alert tone="error" className="mt-4" title="This link is incomplete">
              Open the link from your email again, or request a new one.
            </Alert>
          ) : done ? (
            <Alert tone="success" className="mt-4">
              Password updated. Taking you to the sign-in page…
            </Alert>
          ) : (
            <>
              <p className="mt-1 text-[13px] text-muted">
                At least 8 characters, with an uppercase letter, a lowercase
                letter and a number.
              </p>

              {error && (
                <Alert tone="error" className="mt-4">
                  {error}
                </Alert>
              )}

              <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
                <Field
                  label="New password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={fieldErrors.password}
                  autoComplete="new-password"
                  required
                  autoFocus
                />
                <Field
                  label="Confirm new password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  error={fieldErrors.confirm}
                  autoComplete="new-password"
                  required
                />
                <Button type="submit" loading={busy} icon={Check} className="w-full">
                  Update password
                </Button>
              </form>
            </>
          )}

          <Link
            to="/login"
            className="mt-5 inline-block text-[12.5px] font-medium text-[var(--color-brand)] hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
