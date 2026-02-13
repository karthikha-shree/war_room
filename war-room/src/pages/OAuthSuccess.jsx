import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCurrentUser } from "../api/authApi";

export default function OAuthSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    
    const token = searchParams.get("token");

    if (token) {
      hasProcessed.current = true;
      
      // Store token temporarily and fetch user data
      localStorage.setItem("token", token);
      
      // Fetch user data from backend
      getCurrentUser()
        .then((userData) => {
          login(userData, token);
          navigate("/dashboard", { replace: true });
        })
        .catch((error) => {
          console.error("Failed to fetch user data:", error);
          // Even if fetch fails, proceed with token
          const userData = { token };
          login(userData, token);
          navigate("/dashboard", { replace: true });
        });
    } else {
      // No token found, redirect to login with error
      navigate("/login?error=oauth_failed", { replace: true });
    }
  }, [searchParams, login, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
