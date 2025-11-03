import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import logo from "../../assets/logo.jpeg";
import "../../index.css"; // <-- FIX THIS IMPORT

/**
 * ForgotPassword Component
 *
 * Handles password reset functionality:
 * - Email validation (PAU domain)
 * - Password reset request to backend API
 * - Reset token verification
 * - New password setting
 * - Error handling and user feedback
 * - Progress indication through multi-step process
 */
const ForgotPassword = () => {
  // State for different steps in the password reset process
  const [currentStep, setCurrentStep] = useState("request"); // 'request', 'verify', 'reset', 'success'

  // State for form inputs
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // State for UI management
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Timer for auto-redirect
  const [countdown, setCountdown] = useState(0);

  // Get authentication context and navigation
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Redirect if user is already authenticated
  useEffect(() => {
    if (currentUser) {
      navigate(
        currentUser.role === "admin" ? "/admin/dashboard" : "/dashboard"
      );
    }
  }, [currentUser, navigate]);

  // Handle countdown for auto-redirect
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0 && currentStep === "success") {
      navigate("/login");
    }
    return () => clearTimeout(timer);
  }, [countdown, currentStep, navigate]);

  /**
   * Validate email format
   * @param {string} email - User email to validate
   * @returns {boolean} - Whether email is valid
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
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {boolean} - Whether password is valid
   */
  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (password.length < minLength) {
      setErrors((prev) => ({
        ...prev,
        newPassword: "Password must be at least 8 characters long",
      }));
      return false;
    }

    if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
      setErrors((prev) => ({
        ...prev,
        newPassword: "Password must contain uppercase, lowercase, and numbers",
      }));
      return false;
    }

    return true;
  };

  /**
   * Validate reset token format
   * @param {string} token - Reset token to validate
   * @returns {boolean} - Whether token is valid format
   */
  const validateResetToken = (token) => {
    // Assuming token is 6-digit code
    const tokenPattern = /^\d{6}$/;

    if (!tokenPattern.test(token)) {
      setErrors((prev) => ({
        ...prev,
        resetToken: "Reset code must be 6 digits",
      }));
      return false;
    }
    return true;
  };

  /**
   * Handle password reset request
   * @param {Event} e - Form submit event
   */
  const handleResetRequest = async (e) => {
    e.preventDefault();

    // Reset errors and messages
    setErrors({});
    setMessage({ text: "", type: "" });

    // Validate email
    if (!validateEmail(email)) {
      return;
    }

    setIsLoading(true);

    try {
      // Request password reset from backend
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/forgot-password`,
        {
          email: email.toLowerCase().trim(),
        }
      );

      console.error("Response:", response.data);
      setIsLoading(false);

      // Handle successful request
      setMessage({
        text: "Password reset code sent to your email. Please check your inbox.",
        type: "success",
      });

      // Move to verification step
      setTimeout(() => {
        setCurrentStep("verify");
        setMessage({ text: "", type: "" });
      }, 2000);
    } catch (error) {
      setIsLoading(false);

      // Handle different error cases
      if (error.response) {
        const { status, data } = error.response;

        switch (status) {
          case 404:
            // User not found
            setMessage({
              text: "No account found with this email address.",
              type: "error",
            });
            break;
          case 429:
            // Too many requests
            setMessage({
              text: "Too many reset requests. Please wait before trying again.",
              type: "error",
            });
            break;
          default:
            // Other server errors
            setMessage({
              text: data.message || "An error occurred. Please try again.",
              type: "error",
            });
        }
      } else {
        // Network or other errors
        setMessage({
          text: "Unable to connect to the server. Please check your connection.",
          type: "error",
        });
      }
    }
  };

  /**
   * Handle reset token verification
   * @param {Event} e - Form submit event
   */
  const handleTokenVerification = async (e) => {
    e.preventDefault();

    // Reset errors and messages
    setErrors({});
    setMessage({ text: "", type: "" });

    // Validate token
    if (!validateResetToken(resetToken)) {
      return;
    }

    setIsLoading(true);

    try {
      // Verify reset token with backend
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/verify-reset-token`,
        {
          email: email.toLowerCase().trim(),
          token: resetToken,
        }
      );

      // Handle successful verification
      setMessage({
        text: "Code verified successfully! You can now set your new password.",
        type: "success",
      });

      // Move to password reset step
      setTimeout(() => {
        setCurrentStep("reset");
        setMessage({ text: "", type: "" });
      }, 1500);
    } catch (error) {
      setIsLoading(false);

      // Handle different error cases
      if (error.response) {
        const { status, data } = error.response;

        switch (status) {
          case 400:
            // Invalid or expired token
            setMessage({
              text: "Invalid or expired reset code. Please request a new one.",
              type: "error",
            });
            break;
          case 404:
            // Token not found
            setMessage({
              text: "Reset code not found. Please request a new password reset.",
              type: "error",
            });
            break;
          default:
            // Other server errors
            setMessage({
              text: data.message || "Verification failed. Please try again.",
              type: "error",
            });
        }
      } else {
        // Network or other errors
        setMessage({
          text: "Unable to connect to the server. Please check your connection.",
          type: "error",
        });
      }
    }
  };

  /**
   * Handle password reset
   * @param {Event} e - Form submit event
   */
  const handlePasswordReset = async (e) => {
    e.preventDefault();

    // Reset errors and messages
    setErrors({});
    setMessage({ text: "", type: "" });

    // Validate passwords
    if (!validatePassword(newPassword)) {
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    setIsLoading(true);

    try {
      // Reset password with backend
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/reset-password`,
        {
          email: email.toLowerCase().trim(),
          token: resetToken,
          newPassword: newPassword,
        }
      );

      // Handle successful reset
      setCurrentStep("success");
      setCountdown(5); // 5 second countdown before redirect
    } catch (error) {
      setIsLoading(false);

      // Handle different error cases
      if (error.response) {
        const { status, data } = error.response;

        switch (status) {
          case 400:
            // Invalid token or password
            setMessage({
              text: "Invalid reset code or password requirements not met.",
              type: "error",
            });
            break;
          case 410:
            // Token expired
            setMessage({
              text: "Reset code has expired. Please request a new password reset.",
              type: "error",
            });
            break;
          default:
            // Other server errors
            setMessage({
              text: data.message || "Password reset failed. Please try again.",
              type: "error",
            });
        }
      } else {
        // Network or other errors
        setMessage({
          text: "Unable to connect to the server. Please check your connection.",
          type: "error",
        });
      }
    }
  };

  /**
   * Handle input changes
   * @param {Event} e - Input change event
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Update appropriate state based on input name
    switch (name) {
      case "email":
        setEmail(value);
        break;
      case "resetToken":
        setResetToken(value);
        break;
      case "newPassword":
        setNewPassword(value);
        break;
      case "confirmPassword":
        setConfirmPassword(value);
        break;
      default:
        break;
    }

    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  /**
   * Request new reset code
   */
  const handleRequestNewCode = () => {
    setCurrentStep("request");
    setResetToken("");
    setErrors({});
    setMessage({ text: "", type: "" });
  };

  /**
   * Render the appropriate form based on current step
   */
  const renderForm = () => {
    switch (currentStep) {
      case "request":
        return (
          <form
            id="resetRequestForm"
            className="form active"
            onSubmit={handleResetRequest}
          >
            <div className="input-group">
              <label htmlFor="email">University Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your university email"
                value={email}
                onChange={handleInputChange}
                required
              />
              {errors.email && (
                <p className="error-message visible">{errors.email}</p>
              )}
            </div>

            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? "Sending Reset Code..." : "Send Reset Code"}
            </button>

            <div
              style={{
                textAlign: "center",
                marginTop: "1rem",
                fontSize: "0.9rem",
              }}
            >
              Remember your password?{" "}
              <Link
                to="/login"
                style={{
                  color: "var(--color-medium-blue)",
                  textDecoration: "none",
                }}
              >
                Back to Login
              </Link>
            </div>
          </form>
        );

      case "verify":
        return (
          <form
            id="tokenVerifyForm"
            className="form active"
            onSubmit={handleTokenVerification}
          >
            <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
              <p style={{ color: "var(--color-dark)", fontSize: "0.9rem" }}>
                We've sent a 6-digit code to <strong>{email}</strong>
              </p>
            </div>

            <div className="input-group">
              <label htmlFor="resetToken">Reset Code</label>
              <input
                type="text"
                id="resetToken"
                name="resetToken"
                placeholder="Enter 6-digit code"
                value={resetToken}
                onChange={handleInputChange}
                maxLength="6"
                style={{
                  textAlign: "center",
                  fontSize: "1.2rem",
                  letterSpacing: "0.5rem",
                }}
                required
              />
              {errors.resetToken && (
                <p className="error-message visible">{errors.resetToken}</p>
              )}
            </div>

            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? "Verifying Code..." : "Verify Code"}
            </button>

            <div
              style={{
                textAlign: "center",
                marginTop: "1rem",
                fontSize: "0.9rem",
              }}
            >
              Didn't receive the code?
              <button
                type="button"
                onClick={handleRequestNewCode}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-medium-blue)",
                  textDecoration: "underline",
                  cursor: "pointer",
                  marginLeft: "5px",
                }}
              >
                Request new code
              </button>
            </div>
          </form>
        );

      case "reset":
        return (
          <form
            id="passwordResetForm"
            className="form active"
            onSubmit={handlePasswordReset}
          >
            <div className="input-group">
              <label htmlFor="newPassword">New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="newPassword"
                  name="newPassword"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={handleInputChange}
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
              {errors.newPassword && (
                <p className="error-message visible">{errors.newPassword}</p>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={handleInputChange}
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
                <p className="error-message visible">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? "Resetting Password..." : "Reset Password"}
            </button>
          </form>
        );

      case "success":
        return (
          <div className="form active" style={{ textAlign: "center" }}>
            <div style={{ marginBottom: "2rem" }}>
              <div
                style={{
                  fontSize: "3rem",
                  color: "var(--color-success)",
                  marginBottom: "1rem",
                }}
              >
                ✅
              </div>
              <h2 style={{ color: "var(--color-dark)", marginBottom: "1rem" }}>
                Password Reset Successful!
              </h2>
              <p style={{ color: "var(--color-dark)", marginBottom: "1.5rem" }}>
                Your password has been successfully reset. You can now log in
                with your new password.
              </p>
              <p
                style={{
                  color: "var(--color-medium-blue)",
                  fontSize: "0.9rem",
                }}
              >
                Redirecting to login page in {countdown} seconds...
              </p>
            </div>

            <Link
              to="/login"
              className="submit-btn"
              style={{
                display: "inline-block",
                textDecoration: "none",
                textAlign: "center",
                marginTop: "1rem",
              }}
            >
              Go to Login Now
            </Link>
          </div>
        );

      default:
        return null;
    }
  };

  /**
   * Get sidebar content based on current step
   */
  const getSidebarContent = () => {
    switch (currentStep) {
      case "request":
        return {
          title: "Forgot Password?",
          description:
            "Don't worry! Enter your university email and we'll send you a reset code.",
        };
      case "verify":
        return {
          title: "Check Your Email",
          description:
            "We sent a 6-digit verification code to your email address.",
        };
      case "reset":
        return {
          title: "Set New Password",
          description: "Choose a strong password for your account security.",
        };
      case "success":
        return {
          title: "All Set!",
          description: "Your password has been successfully reset.",
        };
      default:
        return {
          title: "Reset Password",
          description: "Secure your account with a new password.",
        };
    }
  };

  const sidebarContent = getSidebarContent();

  return (
    <div className="container">
      {/* Sidebar with logo and contextual message */}
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
          <h1>{sidebarContent.title}</h1>
          <p>{sidebarContent.description}</p>
        </div>
      </div>

      {/* Form container with dynamic content */}
      <div className="form-container">
        {renderForm()}

        {/* Loading spinner */}
        {isLoading && (
          <div className="loading visible">
            <div className="spinner"></div>
          </div>
        )}
      </div>

      {/* Message container for notifications */}
      {message.text && (
        <div className="message-container">
          <div className={`message ${message.type}`}>{message.text}</div>
        </div>
      )}
    </div>
  );
};

export default ForgotPassword;
