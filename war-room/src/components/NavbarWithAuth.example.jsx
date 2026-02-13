/**
 * Example Navbar component using AuthContext
 * Shows how to display user info and handle logout
 */

import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NavbarWithAuth() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-xl font-bold text-gray-800 hover:text-blue-600 transition"
            >
              War Room
            </button>
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Welcome, <span className="font-semibold">{user?.name}</span>
            </span>
            
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
