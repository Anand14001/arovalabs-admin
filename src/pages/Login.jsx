import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import Field from '../components/ui/Field';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import ThemeToggle from '../components/ui/ThemeToggle';
import Logo from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setBusy(true);

    try {
      // Deliberately no navigation here. RedirectIfAuthed in App.jsx owns the
      // post-login redirect and sends them back to the page they asked for;
      // navigating here as well meant the two raced and the dashboard won.
      await login(email, password);
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
          <h1 className="text-[19px]">Sign in</h1>
          <p className="mt-1 text-[13px] text-muted">
            Manage tests, orders and reports for Arova Labs.
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
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              autoComplete="username"
              placeholder="you@arovalabs.com"
              required
              autoFocus
            />

            <div>
              <Field
                label="Password"
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
              <div className="mt-2 text-right">
                <Link
                  to="/forgot-password"
                  className="text-[12.5px] font-medium text-[var(--color-brand)] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" loading={busy} icon={LogIn} className="w-full">
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-[12px] text-muted">
          Authorised staff only. Activity on this panel is logged.
        </p>
      </div>
    </div>
  );
}
