import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useAxiosInterceptor } from "./hooks/useAxiosInterceptor";
import { initializeSocket, disconnectSocket } from "./socket";
import { ProtectedRoute } from "./components";
import {
  Login,
  Register,
  ForgotPassword,
  ResetPassword,
  OAuthSuccess,
  Dashboard,
  Board,
  Profile,
} from "./pages";
import { Toaster } from "sonner";

// Socket management component
function SocketManager({ children }) {
  const { user, token } = useAuth();

  useEffect(() => {
    if (user && token) {
      initializeSocket(token);
    }

    return () => {
      if (!user || !token) {
        disconnectSocket();
      }
    };
  }, [user, token]);

  return children;
}

// Layout component that uses the axios interceptor hook
function AppLayout() {
  // Setup axios navigation interceptor
  useAxiosInterceptor();

  return (
    <SocketManager>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/oauth-success" element={<OAuthSuccess />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/boards/:id"
          element={
            <ProtectedRoute>
              <Board />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* 404 - Redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </SocketManager>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
