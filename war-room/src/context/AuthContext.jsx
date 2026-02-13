import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getCurrentUser } from "../api/authApi";

const AuthContext = createContext(null);

/**
 * AuthProvider component
 * Manages authentication state and provides auth methods
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Decode JWT token to get user ID
  const decodeToken = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Failed to decode token:", error);
      return null;
    }
  };

  // Load user and token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken) {
      setToken(storedToken);
      
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // If user object is missing _id, try to get it from token
          if (!parsedUser._id && !parsedUser.id) {
            const decoded = decodeToken(storedToken);
            if (decoded?.id) {
              parsedUser._id = decoded.id;
            }
          }
          setUser(parsedUser);
        } catch (error) {
          console.error("Failed to parse user data:", error);
          // Try to decode from token as fallback
          const decoded = decodeToken(storedToken);
          if (decoded?.id) {
            setUser({ _id: decoded.id, token: storedToken });
          }
        }
      } else {
        // No user data, try to decode from token
        const decoded = decodeToken(storedToken);
        if (decoded?.id) {
          setUser({ _id: decoded.id, token: storedToken });
        }
      }
    }
    
    setLoading(false);
  }, []);

  // Fetch user data from backend if name is missing
  useEffect(() => {
    const fetchUserIfIncomplete = async () => {
      // Only fetch if we have token but user is missing name
      if (token && user && !user.name) {
        try {
          const userData = await getCurrentUser();
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
        } catch (error) {
          console.error("Failed to fetch user data:", error);
        }
      }
    };

    fetchUserIfIncomplete();
  }, [token, user]);

  // Login function
  const login = useCallback((userData, authToken) => {
    console.log("AuthContext Login - userData:", userData);
    console.log("AuthContext Login - authToken:", authToken);
    
    // Ensure user data has an ID
    let finalUserData = { ...userData };
    if (!finalUserData._id && !finalUserData.id && authToken) {
      const decoded = decodeToken(authToken);
      if (decoded?.id) {
        finalUserData._id = decoded.id;
      }
    }
    
    console.log("AuthContext Login - final user data:", finalUserData);
    
    setUser(finalUserData);
    setToken(authToken);
    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(finalUserData));
  }, []);

  // Logout function
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * useAuth hook
 * Access authentication context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
};

export default AuthContext;