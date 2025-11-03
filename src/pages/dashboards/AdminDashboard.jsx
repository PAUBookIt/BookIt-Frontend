import React, { useState, useEffect, useCallback } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import "../../index.css"; // <-- FIX THIS IMPORT

// Import our services
import * as api from "../../services/apiService";
import * as storage from "../../services/sharedStorage";
import { isBackendOnline, checkBackendStatus } from "../../services/status";

// Import Auth & Navigation
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

// Import EmailJS
import emailjs from "@emailjs/browser";

// --- Main Dashboard Component ---
function AdminDashboard() {
  // --- Auth & Navigation ---
  const { currentUser, loading, logout } = useAuth(); // Use the hook
  const navigate = useNavigate();

  // --- React State ---
  const [reservations, setReservations] = useState({
    pending: [],
    approved: [],
    denied: [],
  });
  const [allClassrooms, setAllClassrooms] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    denied: 0,
    total: 0,
  });

  // Filter State
  const [statusFilter, setStatusFilter] = useState("pending");
  const [dateFilter, setDateFilter] = useState(null);
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [viewTitle, setViewTitle] = useState("Pending Reservations");

  // Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [currentReservation, setCurrentReservation] = useState(null); // For modal data
  const [confirmModalData, setConfirmModalData] = useState({
    message: "",
    action: null,
  });

  // Alert State
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // --- Alert Function ---
  const showAlert = useCallback((message, type = "success") => {
    setAlert({ show: true, message, type });
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setAlert({ show: false, message: "", type: "success" });
    }, 5000);
  }, []); // Stable function

  // --- Data & UI Functions ---
  const applyFilters = useCallback((data, status, date, location) => {
    const all = [
      ...data.pending.map((r) => ({ ...r, status: "pending" })),
      ...data.approved.map((r) => ({ ...r, status: "approved" })),
      ...data.denied.map((r) => ({ ...r, status: "denied" })),
    ];

    const filtered = all.filter((res) => {
      if (status !== "all" && res.status !== status) return false;
      if (date && res.date !== date) return false;
      if (location !== "ALL") {
        const building = res.classroom.split(" ")[0];
        if (building !== location) return false;
      }
      return true;
    });

    setFilteredReservations(
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
    );

    // Update title
    switch (status) {
      case "pending":
        setViewTitle("Pending Reservations");
        break;
      case "approved":
        setViewTitle("Approved Reservations");
        break;
      case "denied":
        setViewTitle("Denied Reservations");
        break;
      default:
        setViewTitle("All Reservations");
    }
  }, []); // Stable function

  const updateStats = useCallback((data) => {
    const pendingCount = data.pending.length;
    const approvedCount = data.approved.length;
    const deniedCount = data.denied.length;
    setStats({
      pending: pendingCount,
      approved: approvedCount,
      denied: deniedCount,
      total: pendingCount + approvedCount + deniedCount,
    });
  }, []); // Stable function

  const updateRecentActivity = useCallback(() => {
    const activities =
      JSON.parse(localStorage.getItem("recentActivities")) || [];
    setRecentActivity(activities.slice(0, 5)); // Show 5 most recent
  }, []); // Stable function

  // --- Load Data on Page Start ---
  const loadData = useCallback(
    async (user) => {
      if (!user) return;
      try {
        const resData = await storage.getReservations();
        const roomData = await storage.getClassroomData();

        const allRooms = Object.values(roomData).flat();
        setAllClassrooms(allRooms);

        setReservations(resData);
        updateStats(resData);

        applyFilters(resData, "pending", null, "ALL");

        initializeActivities(resData);
        updateRecentActivity();
      } catch (error) {
        console.error("Failed to load data:", error);
        showAlert("Error: Could not load dashboard data.", "error");
      }
    },
    [showAlert, applyFilters, updateStats, updateRecentActivity]
  );

  useEffect(() => {
    // This replaces DOMContentLoaded
    const initialize = async () => {
      // 1. Check backend status (banner is in App.jsx)
      await checkBackendStatus();

      // 3. Init local storage & EmailJS
      storage.initializeLocalStorage();
      emailjs.init("O3K5dfZJQv5YP6W9V"); // Your EmailJS user ID
    };

    initialize();
  }, []); // Run basic init once

  useEffect(() => {
    // This runs when auth loading is done and user is guaranteed to be admin
    if (!loading && currentUser) {
      loadData(currentUser); // Pass the user from auth
    }
  }, [loading, currentUser, loadData]); // Re-run if auth state changes
  const handleApplyFilters = () => {
    const date = document.getElementById("date-filter")._flatpickr.input.value;
    applyFilters(reservations, statusFilter, date, locationFilter);
  };

  const clearFilters = () => {
    setStatusFilter("pending");
    setLocationFilter("ALL");
    const dateInput = document.getElementById("date-filter")._flatpickr;
    if (dateInput) dateInput.clear();
    setDateFilter(null);
    applyFilters(reservations, "pending", null, "ALL");
  };

  const refreshData = async () => {
    showAlert("Refreshing data from server...");
    if (isBackendOnline) {
      try {
        await api.getReservations(); // This fetches and updates localStorage
      } catch (error) {
        console.error("Failed to refresh data:", error);
        showAlert("Error refreshing data. Using local cache.", "error");
      }
    }
    const resData = storage.getLocalReservations(); // Get the (potentially) new data
    setReservations(resData);
    updateStats(resData);
    applyFilters(resData, statusFilter, dateFilter, locationFilter);
    updateRecentActivity();
    showAlert("Data refreshed successfully");
  };

  // --- Modal & Action Handlers ---

  const openReviewModal = (reservation) => {
    setCurrentReservation(reservation);
    setIsReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setIsReviewModalOpen(false);
    setCurrentReservation(null);
  };

  const openBookingModal = () => {
    setIsBookingModalOpen(true);
  };

  const closeBookingModal = () => {
    setIsBookingModalOpen(false);
  };

  const showConfirmModal = (action, reservation) => {
    const message =
      action === "approve"
        ? `Are you sure you want to approve reservation ${reservation.id}?`
        : `Are you sure you want to deny reservation ${reservation.id}?`;

    setConfirmModalData({
      message,
      action,
      reservation,
      adminComment: document.getElementById("admin-comment").value,
    });
    setIsConfirmModalOpen(true);
  };

  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
  };

  // --- THIS IS THE FIXED FUNCTION for Approve/Deny ---
  const proceedWithConfirmedAction = async () => {
    const { action, reservation, adminComment } = confirmModalData;
    const finalStatus = action === "approve" ? "approved" : "denied";

    // Get the latest local data
    const localReservations = storage.getLocalReservations(); // Get local data to modify
    const reservationIndex = localReservations.pending.findIndex(
      (r) => r.id === reservation.id
    );

    if (reservationIndex === -1) {
      showAlert("Error: Reservation not found.", "error");
      closeConfirmModal();
      return;
    }

    const reservationToUpdate = localReservations.pending[reservationIndex];

    try {
      if (!isBackendOnline) throw new Error("Offline. Falling back to local.");

      // --- TRY API FIRST ---
      await api.updateReservation(reservation.id, {
        status: finalStatus,
        adminComment: adminComment,
        processedAt: new Date().toISOString(),
      });

      if (finalStatus === "approved") {
        reservationToUpdate.adminComment = adminComment; // Add comment for email
        sendApprovalEmail(reservationToUpdate);
      }
      showAlert(`Reservation ${reservation.id} has been ${finalStatus}.`);
    } catch (error) {
      // --- API FAILED: FALLBACK TO LOCAL STORAGE ---
      console.warn(
        "API update failed, falling back to local storage.",
        error.message
      );

      reservationToUpdate.status = finalStatus;
      reservationToUpdate.adminComment = adminComment;
      reservationToUpdate.processedAt = new Date().toISOString();

      // Move from pending to new array
      localReservations.pending.splice(reservationIndex, 1);
      if (finalStatus === "approved") {
        localReservations.approved.push(reservationToUpdate);
      } else {
        localReservations.denied.push(reservationToUpdate);
      }

      localReservations.lastUpdate = new Date().getTime();
      localStorage.setItem(
        "classroomReservations",
        JSON.stringify(localReservations)
      );

      showAlert(
        `Backend not responding. Reservation ${finalStatus} locally.`,
        "success"
      );
    } finally {
      // --- ALWAYS RUN THIS ---
      recordActivity(reservationToUpdate, finalStatus); // Record local activity
      closeConfirmModal();
      closeReviewModal();

      // Update state from our modified localReservations object
      setReservations(localReservations);
      applyFilters(localReservations, statusFilter, dateFilter, locationFilter);
      updateStats(localReservations);
      updateRecentActivity();
    }
  };

  // --- THIS IS THE FIXED FUNCTION for Create Booking ---
  const handleCreateReservation = async (e) => {
    e.preventDefault();
    const form = e.target;

    const newReservation = {
      id: "ADMIN-" + Date.now(),
      studentName: currentUser.firstName || "Admin User",
      studentId: currentUser.studentId || "ADMIN01",
      email: currentUser.email || "admin@pau.edu.ng",
      classroom: form.elements["booking-classroom"].value,
      date: form.elements["booking-date"].value,
      time: `${form.elements["booking-start-time"].value} - ${form.elements["booking-end-time"].value}`,
      purpose: form.elements["booking-purpose"].value,
      attendees: parseInt(form.elements["booking-attendees"].value),
      status: "approved", // Admin bookings are auto-approved
      createdAt: new Date().toISOString(),
    };

    try {
      if (!isBackendOnline) throw new Error("Offline. Falling back to local.");

      // --- TRY API FIRST ---
      await api.createReservation(newReservation);
      showAlert(`Admin reservation ${newReservation.id} created.`);
    } catch (error) {
      // --- API FAILED: FALLBACK TO LOCAL STORAGE ---
      console.warn(
        "API create failed, falling back to local storage.",
        error.message
      );
      const localReservations = storage.getLocalReservations();
      localReservations.approved.push(newReservation); // Add to approved list
      localStorage.setItem(
        "classroomReservations",
        JSON.stringify(localReservations)
      );
      showAlert(
        `Backend not responding. Reservation created locally.`,
        "success"
      );
    } finally {
      // --- ALWAYS RUN THIS ---
      recordActivity(newReservation, "created");
      closeBookingModal();
      form.reset();

      const resData = storage.getLocalReservations(); // Get new local data
      setReservations(resData);
      applyFilters(resData, statusFilter, dateFilter, locationFilter);
      updateStats(resData);
      updateRecentActivity();
    }
  };

  const exportReservations = () => {
    // This logic is local and fine, but we'll use the state `filteredReservations`
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent +=
      "ID,Student Name,Student ID,Classroom,Date,Time,Purpose,Status,Attendees,Created At\n";

    filteredReservations.forEach((reservation) => {
      const row = [
        reservation.id,
        reservation.studentName,
        reservation.studentId,
        reservation.classroom,
        reservation.date,
        reservation.time,
        `"${(reservation.purpose || "").replace(/"/g, '""')}"`,
        reservation.status,
        reservation.attendees,
        reservation.createdAt,
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reservations_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert("Reservations exported to CSV successfully");
  };

  // --- Activity & Email ---

  const initializeActivities = (data) => {
    if (localStorage.getItem("recentActivities")) return; // Already init
    const activities = [...data.approved, ...data.denied]
      .map((res) => ({
        id: res.id,
        action: res.status,
        timestamp: res.processedAt || res.createdAt || new Date().toISOString(),
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const trimmed = activities.slice(0, 20);
    localStorage.setItem("recentActivities", JSON.stringify(trimmed));
  };

  const recordActivity = (reservation, action) => {
    const activities =
      JSON.parse(localStorage.getItem("recentActivities")) || [];
    const newActivity = {
      id: reservation.id,
      action: action,
      timestamp: new Date().toISOString(),
    };
    activities.unshift(newActivity); // Add to beginning
    const trimmed = activities.slice(0, 20); // Keep only 20
    localStorage.setItem("recentActivities", JSON.stringify(trimmed));
    updateRecentActivity(); // Refresh the UI
  };

  const sendApprovalEmail = (reservation) => {
    const safeReservation = {
      email: reservation.email || "student@pau.edu.ng",
      studentName: reservation.studentName || "Student",
      id: reservation.id,
      classroom: reservation.classroom,
      date: reservation.date,
      time: reservation.time,
      purpose: (reservation.purpose || "Academic Activity").substring(0, 100),
      adminComment: reservation.adminComment
        ? reservation.adminComment.substring(0, 200)
        : "N/A",
    };

    const templateParams = {
      to_email: safeReservation.email,
      to_name: safeReservation.studentName,
      reservation_id: safeReservation.id,
      classroom: safeReservation.classroom,
      date: storage.formatDate(safeReservation.date),
      time: safeReservation.time,
      purpose: safeReservation.purpose,
      admin_name: currentUser.firstName || "Administrator",
      admin_comment: safeReservation.adminComment,
      cc_security: "osagie.osazuwa@pau.edu.ng",
      cc_facility: "muizah.apampa@pau.edu.ng",
      cc_admin: currentUser.email || "admin@pau.edu.ng",
    };

    emailjs.send("service_y4hrfnh", "template_mkka46n", templateParams).then(
      (response) => {
        console.log("Email sent successfully:", response);
        showAlert("Approval notification email sent successfully");
      },
      (error) => {
        console.error("Email sending failed:", error);
        showAlert("Failed to send email notification", "error");
      }
    );
  };

  // --- Auth ---
  const performLogout = () => {
    logout(); // Use the logout function from AuthContext
    showAlert("Logging out...");
    setTimeout(() => {
      navigate("/login");
    }, 1000);
  };

  // --- Helpers ---
  const getTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return `${diffDay}d ago`;
  };

  const getIconByAction = (action) => {
    switch (action) {
      case "approved":
        return "fa-check";
      case "denied":
        return "fa-times";
      case "created":
        return "fa-calendar-check";
      default:
        return "fa-user";
    }
  };

  const truncateText = (text, maxLength) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // --- Render ---
  if (loading || !currentUser) {
    // Show a full-page loading spinner while auth is checking
    return <div>Loading Admin...</div>;
  }

  return (
    <>
      <header className="header">
        <a href="/#" className="logo" onClick={(e) => e.preventDefault()}>
          <i className="fas fa-calendar-check"></i>
          <span className="logo_differentiate">PAU</span>Bookit
          <span className="admin-badge">Admin</span>
        </a>
        <div className="user-info">
          <div className="user-details">
            Hello, <span id="user-name">{currentUser.firstName}</span> | Role:
            <span id="user-id">Administrator</span>
          </div>
          <button
            id="logout-btn"
            className="logout-btn"
            onClick={performLogout}
          >
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </header>

      <div className="dashboard-container">
        <main className="main-content">
          <div className="control-panel">
            <div className="panel-header">
              <h2>Reservation Management</h2>
              <button
                id="create-reservation-btn"
                className="create-btn"
                onClick={openBookingModal}
              >
                <i className="fas fa-plus"></i> Create Reservation
              </button>
            </div>
            <div className="filter-controls">
              <div className="filter-group">
                <label htmlFor="status-filter">Filter by Status</label>
                <select
                  id="status-filter"
                  className="filter-input"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Requests</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="denied">Denied</option>
                </select>
              </div>
              <div className="filter-group">
                <label htmlFor="date-filter">Filter by Date</label>
                <Flatpickr
                  id="date-filter"
                  className="filter-input"
                  placeholder="Select date"
                  options={{ dateFormat: "Y-m-d" }}
                  onChange={([date]) =>
                    setDateFilter(
                      date ? date.toISOString().split("T")[0] : null
                    )
                  }
                />
              </div>
              <div className="filter-group">
                <label htmlFor="location-filter">Filter by Location</label>
                <select
                  id="location-filter"
                  className="filter-input"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                >
                  <option value="ALL">All Locations</option>
                  <option value="SST">SST</option>
                  <option value="TYD">TYD</option>
                </select>
              </div>
              <div className="filter-actions">
                <button
                  id="apply-filters"
                  className="filter-btn"
                  onClick={handleApplyFilters}
                >
                  <i className="fas fa-filter"></i> Apply Filters
                </button>
                <button
                  id="clear-filters"
                  className="clear-filter-btn"
                  onClick={clearFilters}
                >
                  <i className="fas fa-times"></i> Clear Filters
                </button>
              </div>
            </div>
          </div>

          <div className="reservation-stats">
            <div
              className="stat-card pending"
              onClick={() => {
                setStatusFilter("pending");
                applyFilters(
                  reservations,
                  "pending",
                  dateFilter,
                  locationFilter
                );
              }}
            >
              <div className="stat-icon">
                <i className="fas fa-clock"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value" id="pending-count">
                  {stats.pending}
                </div>
                <div className="stat-label">Pending</div>
              </div>
            </div>
            <div
              className="stat-card approved"
              onClick={() => {
                setStatusFilter("approved");
                applyFilters(
                  reservations,
                  "approved",
                  dateFilter,
                  locationFilter
                );
              }}
            >
              <div className="stat-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value" id="approved-count">
                  {stats.approved}
                </div>
                <div className="stat-label">Approved</div>
              </div>
            </div>
            <div
              className="stat-card denied"
              onClick={() => {
                setStatusFilter("denied");
                applyFilters(
                  reservations,
                  "denied",
                  dateFilter,
                  locationFilter
                );
              }}
            >
              <div className="stat-icon">
                <i className="fas fa-times-circle"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value" id="denied-count">
                  {stats.denied}
                </div>
                <div className="stat-label">Denied</div>
              </div>
            </div>
            <div
              className="stat-card total"
              onClick={() => {
                setStatusFilter("all");
                applyFilters(reservations, "all", dateFilter, locationFilter);
              }}
            >
              <div className="stat-icon">
                <i className="fas fa-calendar-alt"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value" id="total-count">
                  {stats.total}
                </div>
                <div className="stat-label">Total</div>
              </div>
            </div>
          </div>

          <div className="reservations-section">
            <div className="section-header">
              <h2 id="current-view-title">{viewTitle}</h2>
              <div className="section-actions">
                <button
                  id="refresh-btn"
                  className="action-button"
                  onClick={refreshData}
                >
                  <i className="fas fa-sync-alt"></i> Refresh
                </button>
                <button
                  id="export-btn"
                  className="action-button"
                  onClick={exportReservations}
                >
                  <i className="fas fa-download"></i> Export
                </button>
              </div>
            </div>
            <div className="reservations-table-container">
              <table className="reservations-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Requestor</th>
                    <th>Classroom</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Purpose</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="reservations-list">
                  {filteredReservations.length > 0 ? (
                    filteredReservations.map((res) => (
                      <tr key={res.id}>
                        <td>{res.id}</td>
                        <td>{res.studentName}</td>
                        <td>{res.classroom}</td>
                        <td>{storage.formatDate(res.date)}</td>
                        <td>{res.time}</td>
                        <td>{truncateText(res.purpose, 30)}</td>
                        <td>
                          <span className={`status-badge ${res.status}`}>
                            {res.status.charAt(0).toUpperCase() +
                              res.status.slice(1)}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="table-action-btn view-btn"
                              data-id={res.id}
                              title="View details"
                              onClick={() => openReviewModal(res)}
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="8"
                        style={{ textAlign: "center", padding: "2rem" }}
                      >
                        No reservations match your filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        <aside className="admin-panel">
          <div className="admin-section">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div className="activity-item" key={activity.id}>
                    <div className={`activity-icon ${activity.action}`}>
                      <i
                        className={`fas ${getIconByAction(activity.action)}`}
                      ></i>
                    </div>
                    <div className="activity-content">
                      <div className="activity-text">{`Res #${activity.id.substring(
                        0,
                        7
                      )}... ${activity.action}`}</div>
                      <div className="activity-time">
                        {getTimeAgo(activity.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-activities">No recent activity</div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* --- MODALS --- */}

      {isReviewModalOpen && currentReservation && (
        <div className="modal" id="review-modal" style={{ display: "flex" }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Review Reservation</h2>
              <button
                className="close-btn"
                id="close-review-modal"
                onClick={closeReviewModal}
              >
                &times;
              </button>
            </div>
            <form id="review-form" onSubmit={(e) => e.preventDefault()}>
              <input
                type="hidden"
                id="reservation-id"
                value={currentReservation.id}
              />
              <div className="modal-info-group">
                <div className="info-item">
                  <span className="info-label">Student:</span>
                  <span id="student-name" className="info-value">
                    {currentReservation.studentName}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Student ID:</span>
                  <span id="student-id" className="info-value">
                    {currentReservation.studentId}
                  </span>
                </div>
              </div>
              <div className="modal-form-group">
                <label className="modal-label" htmlFor="review-classroom">
                  Classroom
                </label>
                <input
                  type="text"
                  id="review-classroom"
                  className="modal-input"
                  defaultValue={currentReservation.classroom}
                  readOnly
                />
              </div>
              <div className="modal-info-group two-columns">
                <div className="modal-form-group">
                  <label className="modal-label" htmlFor="review-date">
                    Date
                  </label>
                  <input
                    type="text"
                    id="review-date"
                    className="modal-input"
                    defaultValue={currentReservation.date}
                    readOnly
                  />
                </div>
                <div className="modal-form-group">
                  <label className="modal-label" htmlFor="review-time">
                    Time
                  </label>
                  <input
                    type="text"
                    id="review-time"
                    className="modal-input"
                    defaultValue={currentReservation.time}
                    readOnly
                  />
                </div>
              </div>
              <div className="modal-form-group">
                <label className="modal-label" htmlFor="review-purpose">
                  Purpose of Reservation
                </label>
                <textarea
                  id="review-purpose"
                  className="modal-textarea"
                  defaultValue={currentReservation.purpose}
                  readOnly
                ></textarea>
              </div>
              <div className="modal-form-group">
                <label className="modal-label" htmlFor="review-attendees">
                  Expected Number of Attendees
                </label>
                <input
                  type="number"
                  id="review-attendees"
                  className="modal-input"
                  defaultValue={currentReservation.attendees}
                  readOnly
                />
              </div>
              <div className="modal-form-group">
                <label className="modal-label" htmlFor="admin-comment">
                  Admin Comment
                </label>
                <textarea
                  id="admin-comment"
                  className="modal-textarea"
                  placeholder="Add any comments or reason for approval/denial"
                  defaultValue={currentReservation.adminComment || ""}
                ></textarea>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  id="deny-btn"
                  className="deny-btn"
                  onClick={() => showConfirmModal("deny", currentReservation)}
                >
                  <i className="fas fa-times"></i> Deny
                </button>
                <button
                  type="button"
                  id="approve-btn"
                  className="approve-btn"
                  onClick={() =>
                    showConfirmModal("approve", currentReservation)
                  }
                >
                  <i className="fas fa-check"></i> Approve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBookingModalOpen && (
        <div className="modal" id="booking-modal" style={{ display: "flex" }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create Reservation</h2>
              <button
                className="close-btn"
                id="close-booking-modal"
                onClick={closeBookingModal}
              >
                &times;
              </button>
            </div>
            <form id="booking-form" onSubmit={handleCreateReservation}>
              <div className="modal-form-group">
                <label className="modal-label" htmlFor="booking-classroom">
                  Classroom
                </label>
                <select
                  id="booking-classroom"
                  name="booking-classroom"
                  className="modal-input"
                  required
                >
                  <option value="">Select a classroom</option>
                  {allClassrooms.map((room) => (
                    <option key={room.id} value={room.name}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-info-group two-columns">
                <div className="modal-form-group">
                  <label className="modal-label" htmlFor="booking-date">
                    Date
                  </label>
                  <Flatpickr
                    id="booking-date"
                    name="booking-date"
                    className="modal-input"
                    placeholder="Select date"
                    options={{ minDate: "today", dateFormat: "Y-m-d" }}
                    required
                  />
                </div>
                <div className="modal-form-group two-columns">
                  <div className="modal-form-group">
                    <label className="modal-label" htmlFor="booking-start-time">
                      Start Time
                    </label>
                    <input
                      type="time"
                      id="booking-start-time"
                      name="booking-start-time"
                      className="modal-input"
                      required
                    />
                  </div>
                  <div className="modal-form-group">
                    <label className="modal-label" htmlFor="booking-end-time">
                      End Time
                    </label>
                    <input
                      type="time"
                      id="booking-end-time"
                      name="booking-end-time"
                      className="modal-input"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-form-group">
                <label className="modal-label" htmlFor="booking-purpose">
                  Purpose of Reservation
                </label>
                <textarea
                  id="booking-purpose"
                  name="booking-purpose"
                  className="modal-textarea"
                  placeholder="Describe the purpose of this reservation"
                  required
                ></textarea>
              </div>
              <div className="modal-form-group">
                <label className="modal-label" htmlFor="booking-attendees">
                  Expected Number of Attendees
                </label>
                <input
                  type="number"
                  id="booking-attendees"
                  name="booking-attendees"
                  className="modal-input"
                  min="1"
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  id="cancel-booking-btn"
                  className="deny-btn"
                  onClick={closeBookingModal}
                >
                  <i className="fas fa-times"></i> Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-booking-btn"
                  className="approve-btn"
                >
                  <i className="fas fa-check"></i> Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- THIS IS THE CORRECTED ALERT BLOCK --- */}
      {alert.show && (
        <div
          id="success-alert"
          className={`alert-popup ${alert.type === "error" ? "error" : ""}`}
        >
          <div className="alert-content">
            <i
              className={
                alert.type === "success"
                  ? "fas fa-check-circle"
                  : "fas fa-times-circle"
              }
            ></i>
            <div className="alert-message">
              <p id="alert-message">{alert.message}</p>
              <div className="alert-actions">
                <button
                  id="close-alert"
                  className="alert-button"
                  onClick={() => setAlert({ show: false, message: "" })}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isConfirmModalOpen && (
        <div
          className="confirm-modal"
          id="confirm-modal"
          style={{ display: "flex" }}
        >
          <div className="confirm-modal-content">
            <div className="confirm-modal-header">
              <h3>Confirm Action</h3>
              <button
                className="close-btn"
                id="close-confirm-modal"
                onClick={closeConfirmModal}
              >
                &times;
              </button>
            </div>
            <div className="confirm-modal-message" id="confirm-message">
              {confirmModalData.message}
            </div>
            <div className="confirm-modal-actions">
              <button
                className="confirm-cancel-btn"
                id="confirm-cancel"
                onClick={closeConfirmModal}
              >
                Cancel
              </button>
              <button
                className="confirm-proceed-btn"
                id="confirm-proceed"
                onClick={proceedWithConfirmedAction}
              >
                {confirmModalData.action === "approve" ? "Approve" : "Deny"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminDashboard;
