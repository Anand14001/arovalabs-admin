/*
 * Session state.
 *
 * The access token is held in memory by lib/api.js, so a page reload loses it.
 * That is deliberate — see the note there. The consequence is that every load
 * has to try the refresh cookie before deciding whether anyone is signed in,
 * which is the `status: 'loading'` state below. Routing must wait for it, or a
 * refresh on /orders would bounce a signed-in admin to the login screen.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth, refreshSession, setAccessToken, setSessionLostHandler } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  // api.js calls this when a refresh fails mid-request, so a session that dies
  // while the app is open drops straight to the login screen.
  useEffect(() => {
    setSessionLostHandler(clearSession);
    return () => setSessionLostHandler(null);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { user: me } = await refreshSession();
        if (!cancelled) {
          setUser(me);
          setStatus('authenticated');
        }
      } catch {
        // No cookie, or it has expired. Not an error — just nobody signed in.
        if (!cancelled) {
          setAccessToken(null);
          setStatus('anonymous');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { user: me, accessToken } = await auth.login(email, password);
    setAccessToken(accessToken);
    setUser(me);
    setStatus('authenticated');
    return me;
  }, []);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } catch {
      // Even if the call fails, the local session must go — otherwise the UI
      // claims the user is still signed in after they asked to leave.
    }
    clearSession();
  }, [clearSession]);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const { accessToken } = await auth.changePassword(currentPassword, newPassword);
    // The server rotates every other session; this one is handed a new token.
    setAccessToken(accessToken);
    setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      login,
      logout,
      changePassword,
    }),
    [user, status, login, logout, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
