import api from "./axios";

/**
 * Auth API service
 * All authentication-related API calls
 */

// Register new user
export const register = async (userData) => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};

// Login user
export const login = async (credentials) => {
  const response = await api.post("/auth/login", credentials);
  return response.data;
};

// Forgot password
export const forgotPassword = async (email) => {
  const response = await api.post("/auth/forgot-password", { email });
  return response.data;
};

// Reset password
export const resetPassword = async (token, password) => {
  const response = await api.put(`/auth/reset-password/${token}`, { password });
  return response.data;
};

/**
 * Initiate Google OAuth flow
 * Note: OAuth requires a full page redirect, so window.location is necessary here
 * This is different from navigation within the app which should use useNavigate
 */
export const initiateGoogleAuth = () => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  window.location.href = `${apiUrl}/auth/google`;
};

// Get current user data
export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

// Update user profile
export const updateUserProfile = async (userData) => {
  const response = await api.put("/auth/profile", userData);
  return response.data;
};
