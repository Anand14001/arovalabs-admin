import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import { Skeleton } from './components/ui/Skeleton';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Account from './pages/Account';
import NotFound from './pages/NotFound';
import ProductList from './pages/products/ProductList';
import ProductEditor from './pages/products/ProductEditor';
import Categories from './pages/catalog/Categories';
import Media from './pages/catalog/Media';
import OrderList from './pages/orders/OrderList';
import OrderDetail from './pages/orders/OrderDetail';
import Prescriptions from './pages/files/Prescriptions';
import Reports from './pages/files/Reports';
import PostList from './pages/content/PostList';
import PostEditor from './pages/content/PostEditor';
import ContentBlocks from './pages/content/ContentBlocks';
import Navigation from './pages/content/Navigation';
import Leads from './pages/leads/Leads';
import Coupons from './pages/coupons/Coupons';
import Centers from './pages/centers/Centers';

function FullScreenLoader() {
  return (
    <div role="status" aria-label="Loading dashboard" className="min-h-dvh">
      <span className="sr-only">Loading dashboard</span>
      <header className="flex h-14 items-center justify-between border-b px-5">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-32" />
      </header>
      <div className="grid min-h-[calc(100dvh-3.5rem)] lg:grid-cols-[256px_minmax(0,1fr)]">
        <aside className="hidden border-r p-5 lg:block">
          <div className="space-y-4">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        </aside>
        <main className="space-y-4 p-4 sm:p-6">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </main>
      </div>
    </div>
  );
}

/*
 * Both guards wait for the session bootstrap to finish.
 *
 * The access token is memory-only, so on every page load the app has to try the
 * refresh cookie before it knows who is signed in. Redirecting during that
 * window would throw an authenticated admin out to the login screen whenever
 * they reloaded a page.
 */
function RequireAuth({ children }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullScreenLoader />;
  if (!isAuthenticated) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (user?.mustChangePassword && location.pathname !== '/account') {
    return <Navigate to="/account" replace />;
  }
  return children;
}

/*
 * Owns the post-login redirect.
 *
 * Login does not navigate on success — it just signs in. Doing both meant this
 * guard and Login's own navigate() raced, and because this one re-rendered
 * first, it sent people to the dashboard instead of the page they originally
 * asked for. One owner, no race.
 */
function RedirectIfAuthed({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullScreenLoader />;
  if (isAuthenticated) {
    return <Navigate to={location.state?.from ?? '/'} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <Login />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <RedirectIfAuthed>
            <ForgotPassword />
          </RedirectIfAuthed>
        }
      />
      {/* Not wrapped: a reset link may well be opened in a logged-in browser. */}
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="/products" element={<ProductList />} />
        {/* "new" is handled inside the editor, so both paths share one screen. */}
        <Route path="/products/:id" element={<ProductEditor />} />
        <Route path="/orders" element={<OrderList />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/prescriptions" element={<Prescriptions />} />
        <Route path="/centers" element={<Centers />} />
        <Route path="/coupons" element={<Coupons />} />
        <Route path="/posts" element={<PostList />} />
        {/* "new" is handled inside the editor, so both paths share one screen. */}
        <Route path="/posts/:id" element={<PostEditor />} />
        <Route path="/content-blocks" element={<ContentBlocks />} />
        <Route path="/navigation" element={<Navigation />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/media" element={<Media />} />
        <Route path="/account" element={<Account />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
