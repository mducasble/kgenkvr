import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { LobbyPage } from "./pages/LobbyPage";
import { SessionSetupPage } from "./pages/SessionSetupPage";
import { RecordingPage } from "./pages/RecordingPage";
import { ReviewPage } from "./pages/ReviewPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuthStore } from "./stores/authStore";

export const ROUTES = {
  LOGIN: "/login",
  LOBBY: "/lobby",
  SESSION_SETUP: "/session/setup",
  RECORDING: "/session/:sessionId/recording",
  REVIEW: "/review/:recordingId",
} as const;

export function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <HashRouter>
      <Routes>
        <Route
          path={ROUTES.LOGIN}
          element={
            isAuthenticated ? <Navigate to={ROUTES.LOBBY} replace /> : <LoginPage />
          }
        />
        <Route
          path={ROUTES.LOBBY}
          element={
            <ProtectedRoute>
              <LobbyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.SESSION_SETUP}
          element={
            <ProtectedRoute>
              <SessionSetupPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.RECORDING}
          element={
            <ProtectedRoute>
              <RecordingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.REVIEW}
          element={
            <ProtectedRoute>
              <ReviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? ROUTES.LOBBY : ROUTES.LOGIN} replace />}
        />
      </Routes>
    </HashRouter>
  );
}
