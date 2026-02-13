import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCurrentUser, updateUserProfile } from "../api/authApi";

export default function Profile() {
  const navigate = useNavigate();
  const { user: authUser, logout, login, token } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError("");
      const userData = await getCurrentUser();
      setUser(userData);
      setName(userData.name || "");
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("Name cannot be empty");
      return;
    }

    try {
      setUpdating(true);
      setError("");
      setSuccess("");
      
      const updatedUser = await updateUserProfile({ name: name.trim() });
      
      setUser(updatedUser);
      setEditing(false);
      setSuccess("Profile updated successfully!");
      
      // Update auth context with new user data
      login(updatedUser, token);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(typeof err === "string" ? err : "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setName(user?.name || "");
    setError("");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800">War Room</h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
              >
                Back to Dashboard
              </button>
              
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

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-linear-to-r from-blue-600 to-blue-700 px-8 py-12">
            <div className="flex items-center space-x-6">
              <div className="shrink-0">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl font-bold text-blue-600 shadow-lg">
                  {user?.name?.charAt(0).toUpperCase() || "?"}
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white">{user?.name || "User"}</h2>
                <p className="text-blue-100 mt-1">{user?.email}</p>
                <div className="mt-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-800 text-blue-100">
                    {user?.authProvider === "google" ? "Google Account" : "Local Account"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mx-8 mt-6">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {success}
              </div>
            </div>
          )}

          {error && (
            <div className="mx-8 mt-6">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
                <button onClick={() => setError("")} className="text-red-700 hover:text-red-900">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Profile Information */}
          <div className="px-8 py-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Profile Information</h3>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit Profile
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    autoFocus
                    disabled={updating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={updating || !name.trim()}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={updating}
                    className="px-6 py-3 bg-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-400 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800">
                    {user?.name || "Not set"}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800">
                    {user?.email}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Type
                  </label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800">
                    {user?.authProvider === "google" ? "Google Account" : "Local Account"}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Member Since
                  </label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    }) : "Unknown"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
