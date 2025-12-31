// src/pages/auth/Login.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// We use our centralized API service now (which has the 15s timeout fix)
import * as api from "../../services/apiService";
import { useAuth } from "../../contexts/AuthContext";
import logo from "../../assets/logo.jpeg";
import "../../index.css";

/**
 * Login Component - STRICT MODE (No Fake Users)
 */
const Login = () => {
  // State for form inputs and errors
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Get authentication context and navigation
  const { login } = useAuth();
  const navigate = useNavigate();

  /**
   * Validate email format
   */
  const validateEmail = (email) => {
    if (!email.endsWith("@pau.edu.ng")) {
      setErrors((prev) => ({
        ...prev,
        email: "Please use your university email address (@pau.edu.ng)",
      }));
      return false;
    }
    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setMessage({ text: "", type: "" });

    if (!validateEmail(email)) {
      return;
    }

    setIsLoading(true);

    try {
      // 1. ATTEMPT REAL BACKEND LOGIN
      // This uses the new 15-second timeout from apiService.js
      const data = await api.login({
        email: email.toLowerCase().trim(),
        password: password,
      });

      // 2. IF SUCCESSFUL:
      const { access_token: token, user } = data;

      // Save to local storage
      localStorage.setItem("authToken", token);
      localStorage.setItem("currentUser", JSON.stringify(user));

      // Update Auth Context
      await login(user);

      console.log("Login successful:", user.role);
      setMessage({
        text: "Login successful! Redirecting...",
        type: "success",
      });

      // Redirect based on role
      const targetPath =
        user.role === "admin"
          ? "/admin"
          : user.role === "facility"
          ? "/facility"
          : "/dashboard";

      setTimeout(() => {
        navigate(targetPath);
      }, 1000);
    } catch (error) {
      console.error("Login failed:", error);
      setIsLoading(false);

      // SHOW THE REAL ERROR (No falling back to fake users)
      setMessage({
        text: error.message || "Connection failed. Please check your backend.",
        type: "error",
      });
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    navigate("/forgot-password");
  };

  const handleSignup = (e) => {
    e.preventDefault();
    navigate("/signup");
  };

  return (
    <div className="container">
      <div className="sidebar">
        <div className="logo-container">
          <div className="logo">
            <img src={logo} alt="PAU Bookit Logo" />
          </div>
          <div className="app-name">
            <span className="app_name_differentiate">PAU</span> Bookit
          </div>
        </div>
        <div className="sidebar-content">
          <h1>Welcome!</h1>
          <p>Book a class in Pan-Atlantic University's SST or TYD.</p>
        </div>
      </div>
      <div className="form-container">
        <form id="loginForm" className="form active" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              type="email"
              id="login-email"
              placeholder="Enter your university email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {errors.email && (
              <p className="error-message visible">{errors.email}</p>
            )}
          </div>
          <div className="input-group">
            <label htmlFor="login-password">Password</label>
            <input
              type="password"
              id="login-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {errors.password && (
              <p className="error-message visible">{errors.password}</p>
            )}
          </div>
          <div className="links-div">
            <div className="forgot-pass">
              <a href="/#" onClick={handleSignup}>
                Signup
              </a>
            </div>
            <div className="forgot-pass">
              <a href="/#" onClick={handleForgotPassword}>
                Forgot password?
              </a>
            </div>
          </div>
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Log In"}
          </button>
          {isLoading && (
            <div className="loading visible">
              <div className="spinner"></div>
            </div>
          )}
        </form>
      </div>
      {message.text && (
        <div className="message-container">
          <div className={`message ${message.type}`}>{message.text}</div>
        </div>
      )}
    </div>
  );
};

export default Login;
