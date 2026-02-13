import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login as loginApi, initiateGoogleAuth } from "../api";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Get the page user was trying to access before redirect
  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginApi(formData);
      
      // Use AuthContext login function to save auth state
      login(data, data.token);
      
      // Navigate to the page they were trying to access, or dashboard
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    initiateGoogleAuth();
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Login to War Room
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-4">
          <button
            onClick={handleGoogleLogin}
            className="w-full py-2 px-4 bg-white text-gray-700 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition"
          >
            Login with Google
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <button
            onClick={() => navigate("/register")}
            className="text-blue-600 hover:underline font-semibold"
          >
            Register
          </button>
        </p>

        <p className="mt-2 text-center text-sm">
          <button
            onClick={() => navigate("/forgot-password")}
            className="text-blue-600 hover:underline"
          >
            Forgot password?
          </button>
        </p>
      </div>
    </div>
  );
}