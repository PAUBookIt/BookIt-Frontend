// src/components/ProtectedRoute.jsx

import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";

/**
 * This component checks if a user is logged in before rendering the page.
 * If they aren't, it redirects them to /login.
 * It also handles role-based protection (e.g., only 'admin' can see /admin).
 */
const ProtectedRoute = ({ children, role }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // If auth is still loading, show a blank page (or a spinner)
    // This prevents the redirect-loop
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    // If auth is done and there's no user, redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && currentUser.role !== role) {
    // If the route requires a specific role (like 'admin') and the user is not that role
    // send them to their default dashboard.
    const defaultPath =
      currentUser.role === "admin"
        ? "/admin"
        : currentUser.role === "facility"
        ? "/facility"
        : "/dashboard";
    return <Navigate to={defaultPath} replace />;
  }

  // If all checks pass, show the page
  return children;
};

export default ProtectedRoute;
