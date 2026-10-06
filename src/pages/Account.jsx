import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import Field from '../components/ui/Field';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import ThemeToggle from '../components/ui/ThemeToggle';
import { useAuth } from '../context/AuthContext';

const Row = ({ label, children }) => (
  <div className="flex items-baseline justify-between gap-4 border-b py-2.5 last:border-0">
    <dt className="text-[13px] text-muted">{label}</dt>
    <dd className="text-right text-[13px] font-medium text-strong">{children}</dd>
  </div>
);

export default function Account() {
  const { user, changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setDone(false);

    if (newPassword !== confirm) {
      setFieldErrors({ confirm: 'Those two passwords do not match.' });
      return;
    }

    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      setDone(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fieldErrors ?? {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5">
        <h1 className="text-[20px]">Account</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          Your sign-in details and panel preferences.
        </p>
      </header>

      {user?.mustChangePassword && (
        <Alert tone="warning" className="mb-4" title="Set your own password">
          This account is still using the password it was created with.
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-[15px]">Details</h2>
          <dl className="mt-3">
            <Row label="Name">{user?.name}</Row>
            <Row label="Email">{user?.email}</Row>
            <Row label="Role">
              {/* One role exists by decision, so this is informational only. */}
              {user?.role === 'SUPER_ADMIN' ? 'Super admin' : user?.role}
            </Row>
            <Row label="Last signed in">
              {user?.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString()
                : '—'}
            </Row>
          </dl>

          <div className="mt-5 border-t pt-4">
            <p className="label mb-2">Colour theme</p>
            <ThemeToggle showLabels />
            <p className="mt-2 text-[12px] text-muted">
              System follows your device&rsquo;s appearance setting.
            </p>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-[15px]">Change password</h2>
          <p className="mt-1 text-[12.5px] text-muted">
            Changing this signs out every other device.
          </p>

          {error && (
            <Alert tone="error" className="mt-3">
              {error}
            </Alert>
          )}
          {done && (
            <Alert tone="success" className="mt-3">
              Password updated.
            </Alert>
          )}

          <form onSubmit={onSubmit} className="mt-4 space-y-3.5" noValidate>
            <Field
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              error={fieldErrors.currentPassword}
              autoComplete="current-password"
              required
            />
            <Field
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={fieldErrors.newPassword}
              hint="8+ characters, with upper, lower and a number."
              autoComplete="new-password"
              required
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
            <Button type="submit" loading={busy} icon={KeyRound}>
              Update password
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
