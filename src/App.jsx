// src/App.jsx

import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Import our pages
import UserDashboard from "./pages/dashboards/UserDashboard";
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import FacilityDashboard from "./pages/dashboards/FacilityDashboard";
import Login from "./pages/auth/Login";
import SignUp from "./pages/auth/SignUp"; // <-- ADD THIS
import ForgotPassword from "./pages/auth/ForgotPassword"; // <-- ADD THIS

// Import our new ProtectedRoute
import ProtectedRoute from "./components/ProtectedRoute"; // <-- ADD THIS

// Import our status logic
import { checkBackendStatus } from "./services/status";

function App() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const isOnline = await checkBackendStatus();
      setIsOffline(!isOnline);
    };
    checkStatus();
  }, []);

  return (
    <Router>
      {isOffline && (
        <div
          id="offline-banner"
          className="offline-banner"
          style={{ display: "block" }}
        >
          <i className="fas fa-wifi"></i>
          <strong>You are in offline mode.</strong> Data may be outdated.
        </div>
      )}

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} /> {/* <-- ADD THIS */}
        <Route path="/forgot-password" element={<ForgotPassword />} />{" "}
        {/* <-- ADD THIS */}
        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute role="student">
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/facility"
          element={
            <ProtectedRoute role="facility">
              <FacilityDashboard />
            </ProtectedRoute>
          }
        />
        {/* Default route */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
