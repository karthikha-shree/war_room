import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resetPassword } from "../api";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);
      
      // Show success and redirect to login
      toast.success("Password reset successful! Please login with your new password.");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Reset Password
        </h1>
        <p className="text-sm text-center text-gray-600 mb-6">
          Enter your new password
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
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
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          <button
            onClick={() => navigate("/login")}
            className="text-blue-600 hover:underline font-semibold"
          >
            Back to Login
          </button>
        </p>
      </div>
    </div>
  );
}
