/**
 * Example App.jsx setup with axios interceptor hook
 * 
 * This shows how to properly integrate the axios navigation callback
 * with React Router's useNavigate hook.
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAxiosInterceptor } from "./hooks/useAxiosInterceptor";

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
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/board/:id" element={<Board />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
