// src/pages/auth/Signup.jsx

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
// Use the centralized API service
import * as api from "../../services/apiService";
import { useAuth } from "../../contexts/AuthContext";
import logo from "../../assets/logo.jpeg";
import "../../index.css";

const Signup = () => {
  // State for form inputs
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { login } = useAuth(); // We'll auto-login after signup
  const navigate = useNavigate();

  // Handle input changes
  const handleChange = (e) => {
    const { id, value } = e.target;
    // Map input IDs to state keys manually to be safe
    let stateKey = "";
    if (id === "signup-first-name") stateKey = "firstName";
    else if (id === "signup-last-name") stateKey = "lastName";
    else if (id === "signup-email") stateKey = "email";
    else if (id === "signup-password") stateKey = "password";
    else if (id === "signup-confirm-password") stateKey = "confirmPassword";

    if (stateKey) {
      setFormData((prev) => ({
        ...prev,
        [stateKey]: value,
      }));
    }
  };

  // Validation
  const validateForm = () => {
    const newErrors = {};

    // Check Email
    if (!formData.email.endsWith("@pau.edu.ng")) {
      newErrors.email = "Must use a valid PAU email (@pau.edu.ng)";
    }

    // Check Password
    const minLength = 6;
    if (formData.password.length < minLength) {
      newErrors.password = `Password must be at least ${minLength} characters`;
    }

    // Confirm Password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setMessage({ text: "", type: "" });

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // 1. Call Real API
      const response = await api.signup({
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      // 2. Success - Auto Login
      const { access_token, user } = response;

      localStorage.setItem("authToken", access_token);
      localStorage.setItem("currentUser", JSON.stringify(user));

      await login(user);

      setMessage({
        text: "Account created successfully! Redirecting...",
        type: "success",
      });

      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (error) {
      console.error("Signup error:", error);
      setMessage({
        text: error.message || "Failed to create account. Try again.",
        type: "error",
      });
    } finally {
      setIsLoading(false); // Stop loading spinner no matter what
    }
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
          <h1>Join Us!</h1>
          <p>Create an account to book spaces in SST or TYD.</p>
        </div>
      </div>
      <div className="form-container">
        <form id="signupForm" className="form active" onSubmit={handleSubmit}>
          <h2>Create Account</h2>

          <div className="input-group two-columns">
            <div>
              <label htmlFor="signup-first-name">First Name</label>
              <input
                type="text"
                id="signup-first-name"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="signup-last-name">Last Name</label>
              <input
                type="text"
                id="signup-last-name"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="signup-email">Email Address</label>
            <input
              type="email"
              id="signup-email"
              placeholder="name@pau.edu.ng"
              value={formData.email}
              onChange={handleChange}
              required
            />
            {errors.email && (
              <p className="error-message visible">{errors.email}</p>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="signup-password">Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                id="signup-password"
                placeholder="Min 6 chars"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: "#666",
                }}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            {errors.password && (
              <p className="error-message visible">{errors.password}</p>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="signup-confirm-password">Confirm Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="signup-confirm-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: "#666",
                }}
              >
                {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="error-message visible">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="links-div">
            <div className="forgot-pass">
              <Link to="/login">Already have an account? Login</Link>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? "Creating Account..." : "Sign Up"}
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

export default Signup;
