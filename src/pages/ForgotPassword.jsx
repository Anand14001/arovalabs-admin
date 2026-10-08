import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  LockKeyhole,
  Mail,
  Send,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
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
    <main className="forgot-page">
      <section className="forgot-shell" aria-label="Arova Labs password reset">
        <aside className="forgot-visual">
          <div className="forgot-decoration" aria-hidden="true" />
          <img src="/assets/arovalabs-logo.svg" alt="Arova Labs" className="forgot-logo" />
          <div className="forgot-story">
            <p className="forgot-eyebrow">Arova Labs admin portal</p>
            <h2>Secure access to better care.</h2>
            <p className="forgot-story-copy">Manage tests, orders and reports for Arova Labs.</p>
          </div>
          <img
            className="forgot-banner"
            src="/assets/forgotpassword-banner.webp"
            alt="Arova Labs technician collecting a blood sample from a patient"
          />
          <div className="forgot-image-tint" aria-hidden="true" />
        </aside>

        <section className="forgot-form-panel">
          <div className="forgot-form-content">
            <img src="/assets/arovalabs-logo.svg" alt="Arova Labs" className="forgot-mobile-logo" />
            <Link to="/login" className="forgot-back">
              <ArrowLeft aria-hidden="true" />
              Back to sign in
            </Link>

            <div className="forgot-heading-mark" aria-hidden="true">
              <Mail />
              <span><Send /></span>
            </div>
            <h1>Reset your password</h1>
            {sent ? (
              <>
                {/* The server responds identically whether or not the account exists. */}
                <Alert tone="success" className="mt-5">
                  If that account exists, a reset link is on its way. It expires in one hour.
                </Alert>
                <p className="forgot-subtitle">
                  No email? Check spam, or ask another admin to reset it for you.
                </p>
              </>
            ) : (
              <>
                <p className="forgot-subtitle">
                  Enter your email address and we&rsquo;ll send you a link to set a new password.
                </p>

                {error && <Alert tone="error" className="mt-5">{error}</Alert>}

                <form onSubmit={onSubmit} className="forgot-form" noValidate>
                  <div className="forgot-email-field">
                    <label htmlFor="forgot-email" className="label">Email address</label>
                    <div className="forgot-input-wrap">
                      <Mail aria-hidden="true" />
                      <input
                        id="forgot-email"
                        className="input"
                        type="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        inputMode="email"
                        placeholder="you@arovalabs.com"
                        required
                        autoFocus
                        aria-invalid={fieldErrors.email ? 'true' : undefined}
                        aria-describedby={fieldErrors.email ? 'forgot-email-error' : undefined}
                      />
                    </div>
                    {fieldErrors.email && (
                      <p id="forgot-email-error" className="forgot-field-error" role="alert">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>
                  <Button type="submit" loading={busy} icon={Send} className="forgot-submit w-full">
                    Send reset link
                  </Button>
                </form>
              </>
            )}

            <div className="forgot-security-note">
              <span className="forgot-lock-icon"><LockKeyhole aria-hidden="true" /></span>
              <span>
                <strong>Authorised staff only</strong>
                <small>For security reasons, only registered admin emails can request a password reset.</small>
              </span>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
