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
import FacilityDashboard from "./pages/dashboards/FacilityDashboard"; // <-- ADD THIS
import Login from "./pages/auth/Login";

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
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/facility" element={<FacilityDashboard />} />{" "}
        {/* <-- ADD THIS */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
