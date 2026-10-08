import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, FlaskConical, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import Field from '../components/ui/Field';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { useAuth } from '../context/AuthContext';

const trustStats = [
  { value: '30+', label: 'Years of\nexcellence', icon: ShieldCheck },
  { value: '25M+', label: 'Tests\nprocessed', icon: FlaskConical },
  { value: '1,000+', label: 'Trained\ntechnicians', icon: Users },
];

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setBusy(true);
    try {
      // RedirectIfAuthed in App.jsx owns the post-login redirect.
      await login(email, password);
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fieldErrors ?? {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-shell" aria-label="Arova Labs administrator sign in">
        <div className="login-visual">
          <img className="login-banner" src="/assets/signin-banner.webp" alt="Arova Labs technician examining a sample under a microscope" />
          <div className="login-visual-shade" />
          <div className="login-brand-row">
            <img src="/assets/arovalabs-logo.svg" alt="Arova Labs" className="login-logo" />
            <span className="login-portal-label">Admin portal</span>
          </div>
          <div className="login-story">
            <p className="login-eyebrow">Precision. Care. Clarity.</p>
            <h2>Every result builds a healthier tomorrow.</h2>
            <p className="login-story-copy">Manage tests, orders and reports with accuracy and care.</p>
          </div>
          <div className="login-stats" aria-label="Arova Labs at a glance">
            {trustStats.map(({ value, label, icon: Icon }) => (
              <div className="login-stat" key={value}>
                <Icon aria-hidden="true" />
                <strong>{value}</strong>
                <span>{label.split('\n').map((line, index) => <span key={index}>{line}</span>)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="login-form-panel">
          <div className="login-form-content">
            <div className="login-heading-mark" aria-hidden="true"><span /><span /><span /></div>
            <p className="login-kicker">Secure staff access</p>
            <h1>Welcome back</h1>
            <p className="login-subtitle">Sign in to manage Arova Labs.</p>
            <div className="login-title-rule" aria-hidden="true" />

            {error && <Alert tone="error" className="mt-5">{error}</Alert>}

            <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
              <Field
                label="Email address"
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

              <div className="login-password-wrap">
                <Field
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={fieldErrors.password}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>

              <div className="login-forgot-row">
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
              <Button type="submit" loading={busy} className="login-submit w-full">
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <div className="login-security-note">
              <span className="login-lock-icon"><LockKeyhole aria-hidden="true" /></span>
              <span><strong>Authorised staff only</strong><small>Activity on this panel is securely logged.</small></span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
