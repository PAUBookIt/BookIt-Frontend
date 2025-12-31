// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
// We don't need axios here anymore for session management,
// we trust the token until an API call fails.

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state on component mount
  useEffect(() => {
    const initializeAuth = () => {
      const token = localStorage.getItem("authToken");
      const userData = localStorage.getItem("currentUser");

      if (token && userData) {
        try {
          // SIMPLE & ROBUST: Trust local storage on load.
          // If the token is invalid, the specific API calls (Dashboard/Reservations)
          // will return 401/403 and handle the logout there.
          const user = JSON.parse(userData);
          setCurrentUser(user);
        } catch (error) {
          console.error("Failed to parse user data:", error);
          logout(); // Corrupted data? Kill session.
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (user) => {
    setCurrentUser(user);
    // Note: LocalStorage is already set in Login.jsx before calling this
  };

  // Logout function
  const logout = () => {
    // 1. Clear Storage IMMEDIATELY
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");

    // 2. Clear State
    setCurrentUser(null);

    // 3. Optional: specific redirect logic if needed
    // (Usually handled by the component calling logout)
  };

  const value = {
    currentUser,
    loading,
    login,
    logout,
    isAuthenticated: !!currentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
