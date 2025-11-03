import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import logo from "../../assets/logo.jpeg";
import "../../index.css"; // <-- FIX THIS IMPORT

// Default storage for dev mode users
let DEFAULT_USERS_STORAGE = [
  {
    id: 1,
    email: "admin@pau.edu.ng",
    password: "Admin123",
    name: "Admin User",
    role: "admin",
    normalType: "admin",
    studentId: "ADM12345",
    isActive: true,
    isDevMode: true,
  },
  {
    id: 2,
    email: "student@pau.edu.ng",
    password: "Student123",
    name: "John Doe",
    role: "normal_user",
    adminType: "student_affairs",
    normalType: "student",
    studentId: "STU12345",
    isActive: true,
    isDevMode: true,
  },
  {
    id: 3,
    email: "jane.smith@pau.edu.ng",
    password: "Student456",
    name: "Jane Smith",
    role: "normal_user",
    adminType: "student_affairs",
    normalType: "student",
    studentId: "STU12346",
    isActive: true,
    isDevMode: true,
  },
  {
    id: 4,
    email: "facility@pau.edu.ng",
    password: "Facility123",
    firstName: "Facility",
    lastName: "Staff",
    role: "facility",
    studentId: "FAC12345",
    isActive: true,
  },
];

/**
 * Signup Component
 *
 * Handles user registration through the signup process:
 * - Email, password, name, and role validation
 * - Registration with backend API (with fallback to default storage)
 * - Error handling and user feedback
 * - Email verification process (simulated in dev mode)
 */
const Signup = () => {
  // State for form inputs and errors
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    normalType: "student", // Default to student
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

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

  /**
   * Handle input changes
   * @param {Event} e - Input change event
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

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
        password: "Password must be at least 8 characters long",
      }));
      return false;
    }

    if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
      setErrors((prev) => ({
        ...prev,
        password: "Password must contain uppercase, lowercase, and numbers",
      }));
      return false;
    }

    return true;
  };

  /**
   * Validate form inputs
   * @returns {boolean} - Whether form is valid
   */
  const validateForm = () => {
    const newErrors = {};

    // Required field validation
    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      return false;
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!validatePassword(formData.password)) {
      return false;
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.normalType) {
      newErrors.normalType = "Please select a role";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Generate auto student ID for dev mode
   * @param {string} normalType - User type
   * @returns {string} - Generated student ID
   */
  const generateStudentId = (normalType) => {
    const prefix =
      {
        student: "STU",
        club: "CLB",
        lecturers: "LEC",
      }[normalType] || "USR";

    const randomNumber = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}${randomNumber}`;
  };

  /**
   * Create user with default storage (dev mode)
   * @param {Object} userData - User data to store
   * @returns {Object} - Created user with token
   */
  const createUserWithDefaults = (userData) => {
    // Check if user already exists
    const existingUser = DEFAULT_USERS_STORAGE.find(
      (u) => u.email === userData.email
    );

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Create new user with auto-generated student ID
    const newUser = {
      id: DEFAULT_USERS_STORAGE.length + 1,
      ...userData,
      studentId: generateStudentId(userData.normalType),
      isActive: true,
      isDevMode: true,
      createdAt: new Date().toISOString(),
    };

    // Add to storage
    DEFAULT_USERS_STORAGE.push(newUser);

    return {
      access_token: `dev_token_${newUser.id}_${Date.now()}`,
      user: newUser,
    };
  };

  /**
   * Handle form submission
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset messages
    setMessage({ text: "", type: "" });

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Prepare signup data according to the exact backend requirements
      const signupData = {
        role: "normal_user",
        adminType: "student_affairs", // Always set to student_affairs as requested
        normalType: formData.normalType,
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
      };

      try {
        // First, try to signup with backend
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/auth/signup`,
          signupData
        );

        setIsLoading(false);

        // Handle successful backend signup
        console.log("Backend signup successful:", response.data);
        setMessage({
          text: "Account created successfully! Please check your email to verify your account.",
          type: "success",
        });

        // Clear form
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          normalType: "student",
        });

        // Redirect to login after delay
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } catch (backendError) {
        // If backend fails, use default storage
        console.warn(
          "Backend signup failed, using default storage...",
          backendError.message
        );

        try {
          const defaultSignup = createUserWithDefaults(signupData);
          setIsDevMode(true);
          setIsLoading(false);

          // Handle successful default signup
          console.log("Default signup successful:", defaultSignup);
          setMessage({
            text: "Account created successfully (Dev Mode)! You can now log in.",
            type: "success",
          });

          // Clear form
          setFormData({
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
            normalType: "student",
          });

          // Redirect to login after delay
          setTimeout(() => {
            navigate("/login");
          }, 2000);
        } catch (defaultError) {
          setIsLoading(false);
          setMessage({
            text: defaultError.message,
            type: "error",
          });
        }
      }
    } catch (error) {
      setIsLoading(false);

      // Handle validation or other errors
      setMessage({
        text: "An unexpected error occurred. Please try again.",
        type: "error",
      });
    }
  };

  return (
    <div className="container">
      {/* Sidebar with logo and welcome message */}
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
          <p>
            Create your account to start booking classrooms at Pan-Atlantic
            University.
          </p>
          {isDevMode && (
            <div
              style={{
                marginTop: "1rem",
                padding: "0.5rem",
                backgroundColor: "#e8f4fd",
                borderRadius: "4px",
                fontSize: "0.8rem",
                border: "1px solid #bee5eb",
              }}
            >
              <strong>Dev Mode Active</strong>
              <br />
              Backend unavailable - using local storage
            </div>
          )}
        </div>
      </div>

      {/* Signup form */}
      <div className="form-container">
        <form id="signupForm" className="form active" onSubmit={handleSubmit}>
          {/* Full Name input */}
          <div className="input-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            {errors.name && (
              <p className="error-message visible">{errors.name}</p>
            )}
          </div>

          {/* Email input */}
          <div className="input-group">
            <label htmlFor="email">University Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your university email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
            {errors.email && (
              <p className="error-message visible">{errors.email}</p>
            )}
          </div>

          {/* Role dropdown */}
          <div className="input-group">
            <label htmlFor="normalType">Role</label>
            <select
              id="normalType"
              name="normalType"
              value={formData.normalType}
              onChange={handleInputChange}
              required
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "16px",
                backgroundColor: "white",
              }}
            >
              <option value="">Select your role</option>
              <option value="student">Student</option>
              <option value="club">Club</option>
              <option value="lecturers">Lecturer</option>
            </select>
            {errors.normalType && (
              <p className="error-message visible">{errors.normalType}</p>
            )}
          </div>

          {/* Password input */}
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                placeholder="Create a strong password"
                value={formData.password}
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
            {errors.password && (
              <p className="error-message visible">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password input */}
          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
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
              <p className="error-message visible">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Submit button */}
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? "Creating Account..." : "Create Account"}
          </button>

          {/* Login link */}
          <div
            style={{
              textAlign: "center",
              marginTop: "1rem",
              fontSize: "0.9rem",
            }}
          >
            Already have an account?{" "}
            <Link
              to="/login"
              style={{
                color: "var(--color-medium-blue)",
                textDecoration: "none",
              }}
            >
              Log in here
            </Link>
          </div>

          {/* Loading spinner */}
          {isLoading && (
            <div className="loading visible">
              <div className="spinner"></div>
            </div>
          )}
        </form>
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

export default Signup;
