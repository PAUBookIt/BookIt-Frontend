// src/pages/dashboards/AdminDashboard.jsx

import React, { useState, useEffect, useCallback } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import "../../index.css";

// Import our services
import * as api from "../../services/apiService";
import * as storage from "../../services/sharedStorage";
// Import Auth & Navigation
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
// Import EmailJS
import emailjs from "@emailjs/browser";

function AdminDashboard() {
  const { currentUser, loading, logout } = useAuth();
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
  const [currentReservation, setCurrentReservation] = useState(null);
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

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: "", type: "success" });
    }, 5000);
  }, []);

  // --- HELPER: Safely get classroom name ---
  const getRoomName = (classroomData) => {
    if (!classroomData) return "Unknown Room";
    return typeof classroomData === "object"
      ? classroomData.name
      : classroomData;
  };

  // --- Data & UI Functions ---
  const applyFilters = useCallback((data, status, date, location) => {
    const all = [
      ...data.pending.map((r) => ({ ...r, status: "pending" })),
      ...data.approved.map((r) => ({ ...r, status: "approved" })),
      ...data.denied.map((r) => ({ ...r, status: "denied" })),
    ];

    const filtered = all.filter((res) => {
      if (status !== "all" && res.status !== status) return false;
      if (date && res.date !== date) return false; // Note: Backend uses startTime ISO, might need adjusting if filtering by backend date

      if (location !== "ALL") {
        const roomName = getRoomName(res.classroom);
        const building = roomName.split(" ")[0];
        if (building !== location && !roomName.startsWith(location))
          return false;
      }
      return true;
    });

    setFilteredReservations(
      filtered.sort(
        (a, b) =>
          new Date(b.date || b.startTime) - new Date(a.date || a.startTime)
      )
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
  }, []);

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
  }, []);

  const updateRecentActivity = useCallback(() => {
    const activities =
      JSON.parse(localStorage.getItem("recentActivities")) || [];
    setRecentActivity(activities.slice(0, 5));
  }, []);

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

        // Init activities if needed
        if (!localStorage.getItem("recentActivities")) {
          const activities = [...resData.approved, ...resData.denied].map(
            (r) => ({
              id: r.id,
              action: r.status,
              timestamp: r.processedAt || new Date().toISOString(),
            })
          );
          localStorage.setItem(
            "recentActivities",
            JSON.stringify(activities.slice(0, 20))
          );
        }
        updateRecentActivity();
      } catch (error) {
        console.error("Failed to load data:", error);
        showAlert("Error: Could not load dashboard data.", "error");
      }
    },
    [showAlert, applyFilters, updateStats, updateRecentActivity]
  );

  useEffect(() => {
    const initialize = async () => {
      storage.initializeLocalStorage();
      emailjs.init("O3K5dfZJQv5YP6W9V");
    };
    initialize();
  }, []);

  useEffect(() => {
    if (!loading && currentUser) {
      loadData(currentUser);
    }
  }, [loading, currentUser, loadData]);

  const handleApplyFilters = () => {
    const dateInput = document.getElementById("date-filter");
    const date =
      dateInput && dateInput._flatpickr
        ? dateInput._flatpickr.input.value
        : null;
    applyFilters(reservations, statusFilter, date, locationFilter);
  };

  const clearFilters = () => {
    setStatusFilter("pending");
    setLocationFilter("ALL");
    const dateInput = document.getElementById("date-filter");
    if (dateInput && dateInput._flatpickr) dateInput._flatpickr.clear();
    setDateFilter(null);
    applyFilters(reservations, "pending", null, "ALL");
  };

  const refreshData = async () => {
    showAlert("Refreshing data from server...");
    try {
      await api.getReservations();
      const resData = await storage.getReservations();
      setReservations(resData);
      updateStats(resData);
      applyFilters(resData, statusFilter, dateFilter, locationFilter);
      updateRecentActivity();
      showAlert("Data refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh data:", error);
      showAlert("Error refreshing data. Using local cache.", "error");
    }
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
      adminComment: document.getElementById("admin-comment")?.value || "",
    });
    setIsConfirmModalOpen(true);
  };

  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
  };

  const proceedWithConfirmedAction = async () => {
    const { action, reservation, adminComment } = confirmModalData;

    // FIX: Send UPPERCASE to match Database/Prisma Enums
    const finalStatus = action === "approve" ? "APPROVED" : "DENIED";

    try {
      // 1. Send update to Backend
      await api.updateReservation(reservation.id, {
        status: finalStatus,
        // Optional: Pass the comment if you add that field to schema later
      });

      if (finalStatus === "APPROVED") {
        sendApprovalEmail({ ...reservation, adminComment });
      }
      showAlert(`Reservation ${reservation.id} has been ${finalStatus}.`);

      // 2. Refresh UI Data
      await refreshData();
    } catch (error) {
      console.warn("API update failed:", error.message);
      showAlert("Failed to update status. Check backend connection.", "error");
    } finally {
      closeConfirmModal();
      closeReviewModal();
    }
  };

  const handleCreateReservation = async (e) => {
    e.preventDefault();
    const form = e.target;

    const dateVal = form.elements["booking-date"].value;
    const startTimeVal = form.elements["booking-start-time"].value;
    const endTimeVal = form.elements["booking-end-time"].value;

    // Create ISO dates for backend
    const startISO = new Date(`${dateVal}T${startTimeVal}:00`).toISOString();
    const endISO = new Date(`${dateVal}T${endTimeVal}:00`).toISOString();

    const roomName = form.elements["booking-classroom"].value;
    const roomObj = allClassrooms.find((r) => r.name === roomName);

    if (!roomObj) return showAlert("Invalid classroom selected", "error");

    const payload = {
      classroomId: roomObj.id,
      startTime: startISO,
      endTime: endISO,
      purpose: form.elements["booking-purpose"].value,
    };

    try {
      await api.createReservation(payload);
      showAlert(`Reservation created successfully.`);
      await refreshData();
      closeBookingModal();
      form.reset();
    } catch (error) {
      console.warn("API create failed:", error.message);
      showAlert("Failed to create reservation. Check backend.", "error");
    }
  };

  const exportReservations = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent +=
      "ID,Student Name,Classroom,Date,Time,Purpose,Status,Attendees\n";

    filteredReservations.forEach((reservation) => {
      const row = [
        reservation.id,
        reservation.studentName || "N/A",
        getRoomName(reservation.classroom), // <-- FIXED HERE
        storage.formatDate(reservation.date || reservation.startTime),
        reservation.time,
        `"${(reservation.purpose || "").replace(/"/g, '""')}"`,
        reservation.status,
        reservation.attendees || 0,
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

  const sendApprovalEmail = (reservation) => {
    const templateParams = {
      to_email: reservation.email || "student@pau.edu.ng",
      to_name: reservation.studentName || "Student",
      reservation_id: reservation.id,
      classroom: getRoomName(reservation.classroom), // <-- FIXED HERE
      date: storage.formatDate(reservation.date || reservation.startTime),
      time: reservation.time,
      purpose: reservation.purpose,
      admin_name: currentUser.firstName || "Administrator",
      admin_comment: reservation.adminComment || "N/A",
      cc_security: "osagie.osazuwa@pau.edu.ng",
      cc_facility: "muizah.apampa@pau.edu.ng",
      cc_admin: currentUser.email || "admin@pau.edu.ng",
    };

    emailjs.send("service_y4hrfnh", "template_mkka46n", templateParams).then(
      (response) => console.log("Email sent successfully"),
      (error) => console.error("Email sending failed:", error)
    );
  };

  const performLogout = () => {
    logout();
    setTimeout(() => {
      navigate("/login", { replace: true });
    }, 100);
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
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

  if (loading || !currentUser) return <div>Loading Admin...</div>;

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
                <div className="stat-value">{stats.pending}</div>
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
                <div className="stat-value">{stats.approved}</div>
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
                <div className="stat-value">{stats.denied}</div>
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
                <div className="stat-value">{stats.total}</div>
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
                        {/* FIX IS HERE: Render name string, not object */}
                        <td>{getRoomName(res.classroom)}</td>
                        <td>{storage.formatDate(res.date || res.startTime)}</td>
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
                      <div className="activity-text">{`Res #${String(
                        activity.id
                      ).substring(0, 7)}... ${activity.action}`}</div>
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

      {isReviewModalOpen && currentReservation && (
        <div className="modal" id="review-modal" style={{ display: "flex" }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Review Reservation</h2>
              <button className="close-btn" onClick={closeReviewModal}>
                &times;
              </button>
            </div>
            <form id="review-form" onSubmit={(e) => e.preventDefault()}>
              <div className="modal-info-group">
                <div className="info-item">
                  <span className="info-label">Student:</span>
                  <span className="info-value">
                    {currentReservation.studentName}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Student ID:</span>
                  <span className="info-value">
                    {currentReservation.studentId || "N/A"}
                  </span>
                </div>
              </div>
              <div className="modal-form-group">
                <label className="modal-label">Classroom</label>
                {/* FIX IS HERE ALSO */}
                <input
                  type="text"
                  className="modal-input"
                  defaultValue={getRoomName(currentReservation.classroom)}
                  readOnly
                />
              </div>
              {/* ... Rest of modal ... */}
              <div className="modal-info-group two-columns">
                <div className="modal-form-group">
                  <label className="modal-label">Date</label>
                  <input
                    type="text"
                    className="modal-input"
                    defaultValue={storage.formatDate(
                      currentReservation.date || currentReservation.startTime
                    )}
                    readOnly
                  />
                </div>
                <div className="modal-form-group">
                  <label className="modal-label">Time</label>
                  <input
                    type="text"
                    className="modal-input"
                    defaultValue={currentReservation.time}
                    readOnly
                  />
                </div>
              </div>
              <div className="modal-form-group">
                <label className="modal-label">Purpose</label>
                <textarea
                  className="modal-textarea"
                  defaultValue={currentReservation.purpose}
                  readOnly
                ></textarea>
              </div>
              <div className="modal-form-group">
                <label className="modal-label">Admin Comment</label>
                <textarea
                  id="admin-comment"
                  className="modal-textarea"
                  placeholder="Add comment..."
                ></textarea>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="deny-btn"
                  onClick={() => showConfirmModal("deny", currentReservation)}
                >
                  <i className="fas fa-times"></i> Deny
                </button>
                <button
                  type="button"
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
              <button className="close-btn" onClick={closeBookingModal}>
                &times;
              </button>
            </div>
            <form id="booking-form" onSubmit={handleCreateReservation}>
              <div className="modal-form-group">
                <label className="modal-label">Classroom</label>
                <select
                  id="booking-classroom"
                  name="booking-classroom"
                  className="modal-input"
                  required
                >
                  <option value="">Select...</option>
                  {allClassrooms.map((room) => (
                    <option key={room.id} value={room.name}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-info-group two-columns">
                <div className="modal-form-group">
                  <label className="modal-label">Date</label>
                  <Flatpickr
                    name="booking-date"
                    className="modal-input"
                    options={{ minDate: "today", dateFormat: "Y-m-d" }}
                    required
                  />
                </div>
                <div className="modal-form-group two-columns">
                  <div className="modal-form-group">
                    <label className="modal-label">Start</label>
                    <input
                      type="time"
                      name="booking-start-time"
                      className="modal-input"
                      required
                    />
                  </div>
                  <div className="modal-form-group">
                    <label className="modal-label">End</label>
                    <input
                      type="time"
                      name="booking-end-time"
                      className="modal-input"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-form-group">
                <label className="modal-label">Purpose</label>
                <textarea
                  name="booking-purpose"
                  className="modal-textarea"
                  required
                ></textarea>
              </div>
              <div className="modal-form-group">
                <label className="modal-label">Attendees</label>
                <input
                  type="number"
                  name="booking-attendees"
                  className="modal-input"
                  min="1"
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="deny-btn"
                  onClick={closeBookingModal}
                >
                  Cancel
                </button>
                <button type="submit" className="approve-btn">
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              <p>{alert.message}</p>
            </div>
          </div>
        </div>
      )}

      {isConfirmModalOpen && (
        <div className="confirm-modal" style={{ display: "flex" }}>
          <div className="confirm-modal-content">
            <h3>Confirm Action</h3>
            <div className="confirm-modal-message">
              {confirmModalData.message}
            </div>
            <div className="confirm-modal-actions">
              <button
                className="confirm-cancel-btn"
                onClick={closeConfirmModal}
              >
                Cancel
              </button>
              <button
                className="confirm-proceed-btn"
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
