import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setNavigationCallback } from "../api/axios";

/**
 * Hook to setup axios navigation interceptor with React Router
 * Call this in your App component or top-level layout
 * 
 * @example
 * function App() {
 *   useAxiosInterceptor();
 *   return <Routes>...</Routes>
 * }
 */
export const useAxiosInterceptor = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Set navigation callback for axios interceptors
    setNavigationCallback((path) => {
      navigate(path, { replace: true });
    });

    // Cleanup on unmount
    return () => {
      setNavigationCallback(null);
    };
  }, [navigate]);
};
