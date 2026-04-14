import { useCallback } from "react";
import { useAuthStore } from "../stores/authStore";
import { useElectronAPI } from "./useElectronAPI";
import type { LoginCredentials } from "../../shared/types";

export function useAuth() {
  const { user, isAuthenticated, isLoading, error, login, logout, setLoading, setError } =
    useAuthStore();
  const api = useElectronAPI();

  const handleLogin = useCallback(
    async (credentials: LoginCredentials) => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.auth.login(credentials);
        if (!result.success || !result.data) {
          throw new Error(result.error ?? "Login failed");
        }
        login(result.data.user, result.data.token);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [api, login, setLoading, setError]
  );

  const handleLogout = useCallback(async () => {
    setLoading(true);
    try {
      await api.auth.logout();
    } finally {
      logout();
      setLoading(false);
    }
  }, [api, logout, setLoading]);

  const restoreSession = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.auth.getCurrentUser();
      if (result.success && result.data) {
        // TODO: Restore user + token from secure storage
      }
    } catch {
      // No session to restore — silent
    } finally {
      setLoading(false);
    }
  }, [api, setLoading]);

  return { user, isAuthenticated, isLoading, error, login: handleLogin, logout: handleLogout, restoreSession };
}
