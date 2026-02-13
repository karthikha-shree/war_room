/**
 * Example App.jsx setup with AuthProvider and ProtectedRoute
 * Shows how to use authentication and protected routes together
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAxiosInterceptor } from "./hooks/useAxiosInterceptor";
import ProtectedRoute from "./components/ProtectedRoute";

// Import your pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Board from "./pages/Board";

// Layout component that uses the axios interceptor hook
function AppLayout() {
  // Setup axios navigation interceptor
  useAxiosInterceptor();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/board/:id"
        element={
          <ProtectedRoute>
            <Board />
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
