import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 seconds timeout
});

// Navigation callback for handling redirects from interceptors
// This will be set by the useAxiosInterceptor hook
let navigationCallback = null;

/**
 * Set navigation callback for axios interceptors
 * Call this from your App component with useNavigate
 */
export const setNavigationCallback = (callback) => {
  navigationCallback = callback;
};

// Request interceptor - Add JWT token to requests
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem("token");
    
    // If token exists, add it to Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    // Handle request error
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401 errors
api.interceptors.response.use(
  (response) => {
    // Return successful response
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Remove token from localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      // Use navigation callback if available, otherwise fallback to window.location
      if (navigationCallback) {
        navigationCallback("/login");
      } else {
        console.warn("Navigation callback not set. Falling back to window.location");
        window.location.href = "/login";
      }
    }
    
    // Return error for further handling
    return Promise.reject(error);
  }
);

export default api;