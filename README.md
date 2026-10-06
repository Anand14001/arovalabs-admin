# Arova Labs — Admin

React 19 + Vite + Tailwind 4. Talks only to the API in [`../backend`](../backend);
it has no database access of its own. Screens and scope are in
[`../SPEC.md`](../SPEC.md) §4.

## Running locally

The API must be running first — the admin is useless without it.

```bash
cd ../backend && npm run dev     # http://localhost:4100
cd ../admin   && npm install && npm run dev   # http://localhost:5174
```

Sign in with the seeded account (`backend/.env` → `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

## How auth works here

- **The access token is held in memory only** (`src/lib/api.js`), never in
  localStorage. Anything that can read the DOM can read localStorage, so an XSS
  would otherwise hand over a working credential that survives a reload.
- **A reload therefore has no token**, and the app asks the API to mint a new one
  from the httpOnly refresh cookie before it knows who is signed in. That is the
  `status: 'loading'` state in `AuthContext`, and both route guards wait for it —
  without that wait, reloading `/orders` would throw a signed-in admin out.
- **Refresh is single-flight.** Several requests failing at once would otherwise
  each start their own refresh; because refresh tokens rotate, the first to land
  would invalidate the rest, the server would read that as token reuse, and the
  user would be logged out for doing nothing wrong.
- **`RedirectIfAuthed` owns the post-login redirect.** Login does not navigate.
  Having both navigate meant they raced and the "return to the page you asked
  for" behaviour silently lost.

## Theming

Three states — light, dark, system — in `ThemeContext`.

The preference is stored; the resolved theme is not. In `system` the stylesheet
does the work via `prefers-color-scheme`, so the OS switching theme mid-session
needs no JavaScript. `index.html` sets `data-theme` before first paint, which is
what stops the light-then-dark flash on load.

Only the surface and text variables change between themes (`src/index.css`).
Brand colours are shared with the website so the two cannot drift.

## Conventions

- Server state through TanStack Query; `refetchOnWindowFocus` is off because the
  database is remote and admin data mostly changes because this admin changed it.
- Forms hold their own state and render `error.fieldErrors` from the API against
  the matching input — the backend returns `{ error: { code, message, fields } }`.
- `Field` wires label, `aria-invalid` and `aria-describedby` so errors are
  announced, not just coloured red.
- Unbuilt screens appear in the sidebar greyed and marked "Soon" rather than
  being hidden, so the shape of the finished panel is visible and a dead link
  never looks like a bug. Drop the `soon` flag as each screen lands.

## Building

```bash
VITE_API_URL=https://api.arovalabs.com npm run build
```

`VITE_API_URL` is baked in at build time, so changing it needs a rebuild rather
than an env edit. `public/.htaccess` is copied into `dist/` and provides the SPA
history fallback, cache headers and `noindex` for Apache/LiteSpeed on cPanel;
Vercel ignores it. Deployment steps are in [`../backend/DEPLOY.md`](../backend/DEPLOY.md).
