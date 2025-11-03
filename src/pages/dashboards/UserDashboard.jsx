// src/pages/dashboards/UserDashboard.jsx

import React, { useState, useEffect, useCallback } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css"; // Import flatpickr theme

// --- UPDATED IMPORTS ---
import * as api from "../../services/apiService.js";
import * as storage from "../../services/sharedStorage.js";
import { isBackendOnline } from "../../services/status.js";
// We get the user from the AuthContext now
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import "../../index.css"; // <-- Make sure global CSS is imported

// --- Helper component for rendering reservations ---
const ReservationItem = ({ reservation, status, onEdit, onDelete }) => (
  <div className={`reservation-notification ${status}`}>
    <div className="reservation-content">
      <div className="reservation-title">{reservation.classroom}</div>
      <div className="reservation-details">
        {storage.formatDate(reservation.date)} | {reservation.time}
        {reservation.recurrent && reservation.recurrent !== "none" && (
          <span className="recurrent-badge">
            {reservation.recurrent.charAt(0).toUpperCase() +
              reservation.recurrent.slice(1)}
          </span>
        )}
      </div>
      <div className="reservation-purpose">{reservation.purpose}</div>
      {status === "denied" && reservation.adminComment && (
        <div className="reservation-reason">
          Reason: {reservation.adminComment}
        </div>
      )}
    </div>
    {status === "pending" && (
      <div className="reservation-actions">
        <button
          className="action-btn edit-btn"
          title="Edit reservation"
          onClick={() => onEdit(reservation.id)}
        >
          <i className="fas fa-pencil-alt"></i>
        </button>
        <button
          className="action-btn delete-btn"
          title="Delete reservation"
          onClick={() => onDelete(reservation.id)}
        >
          <i className="fas fa-trash"></i>
        </button>
      </div>
    )}
  </div>
);

// --- Main Dashboard Component ---
function UserDashboard() {
  // --- Auth & Navigation ---
  const { currentUser, loading, logout } = useAuth(); // Use the hook
  const navigate = useNavigate();

  // --- React State ---
  const [displayedClassrooms, setDisplayedClassrooms] = useState([]);
  const [reservations, setReservations] = useState({
    pending: [],
    approved: [],
    denied: [],
  });
  const [history, setHistory] = useState([]);

  // Modal State
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [currentReservation, setCurrentReservation] = useState(null); // For modal data
  const [editId, setEditId] = useState(null); // To track if editing

  // Form Input State
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(
    new Date(new Date().setHours(new Date().getHours() + 1))
  );
  const [locationFilter, setLocationFilter] = useState("ALL");

  // Alert State
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [filterStatus, setFilterStatus] = useState({
    show: false,
    message: "Showing current availability",
  });

  // --- Alert Function ---
  const showAlert = useCallback((message, type = "success") => {
    setAlert({ show: true, message, type });
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setAlert({ show: false, message: "", type: "success" });
    }, 5000); // 5 seconds
  }, []); // <-- We wrap it in useCallback

  // --- Data Loading Functions ---
  const loadAllClassrooms = useCallback(async () => {
    try {
      const data = await storage.getClassroomData(); // Smart function
      filterAndDisplayClassrooms(data, "ALL", false); // Display all initially
    } catch (error) {
      console.error("Failed to display classrooms:", error);
      showAlert("Error: Could not load classroom data.", "error");
    }
  }, [showAlert]); // Add showAlert as dependency

  const loadAllReservations = useCallback(
    async (user) => {
      if (!user) return; // Don't run if user is not loaded
      try {
        const data = await storage.getReservations(); // Smart function
        if (!data) throw new Error("No reservation data found.");

        setReservations({
          pending: data.pending.filter((r) => r.studentId === user.studentId),
          approved: data.approved.filter((r) => r.studentId === user.studentId),
          denied: data.denied.filter((r) => r.studentId === user.studentId),
        });

        const historyItems = [...data.approved, ...data.denied]
          .filter((r) => r.studentId === user.studentId)
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        setHistory(historyItems);
      } catch (error) {
        console.error("Failed to load reservations:", error);
        showAlert("Error: Could not load your reservations.", "error");
      }
    },
    [showAlert]
  ); // Add showAlert as dependency

  // --- Load Data on Page Start ---
  useEffect(() => {
    // This runs when auth loading is done
    if (!loading) {
      if (!currentUser) {
        // If auth is done and still no user, redirect to login
        navigate("/login");
        return;
      }

      // 3. Init local storage
      storage.initializeLocalStorage();

      // 4. Load initial data
      loadAllClassrooms();
      loadAllReservations(currentUser); // Pass the user from auth

      // 5. Setup background tasks
      const reminderInterval = setInterval(checkRecurrentReminders, 60000);
      return () => clearInterval(reminderInterval); // Cleanup on unmount
    }
  }, [loading, currentUser, navigate, loadAllClassrooms, loadAllReservations]); // Re-run if auth state changes

  // --- UI Display Functions ---

  const filterAndDisplayClassrooms = (data, location, isFiltered) => {
    let roomsToShow = [];
    if (location === "ALL") {
      roomsToShow = Object.keys(data).map((loc) => ({
        location: loc,
        rooms: data[loc],
      }));
      if (document.querySelector(".location-title h2")) {
        document.querySelector(".location-title h2").textContent =
          "Available Classrooms";
      }
    } else {
      roomsToShow = [
        {
          location: location,
          rooms: data[location] || [],
        },
      ];
      if (document.querySelector(".location-title h2")) {
        document.querySelector(
          ".location-title h2"
        ).textContent = `${location} Classrooms`;
      }
    }
    setDisplayedClassrooms(roomsToShow);

    // Update filter status
    if (isFiltered) {
      setFilterStatus({
        show: true,
        message: '<i class="fas fa-filter"></i> Filtered view',
      });
    } else {
      setFilterStatus({
        show: false,
        message: '<i class="fas fa-clock"></i> Showing current availability',
      });
    }
  };

  const handleSearchAvailability = async () => {
    // This is still the simulation logic
    const datePicker = document.getElementById("date-picker");
    const startTime = document.getElementById("start-time");
    const endTime = document.getElementById("end-time");
    if (!datePicker.value || !startTime.value || !endTime.value) {
      // --- FIX 1 ---
      return showAlert(
        "Please select date and time to check availability.",
        "error"
      );
    }

    try {
      let data = await storage.getLocalClassroomData(); // Get fresh local data
      for (const location in data) {
        data[location].forEach((classroom) => {
          classroom.available = Math.random() < 0.7;
        });
      }
      // setClassroomData(data); // This line is not needed
      filterAndDisplayClassrooms(data, locationFilter, true); // Re-run filter
    } catch (error) {
      // --- FIX 2 ---
      showAlert("Could not load classroom data for filtering.", "error");
    }
  };

  // --- Reservation Logic ---

  const handleReservationSubmit = async (e) => {
    e.preventDefault();

    const reservationData = {
      studentName: currentUser.firstName + " " + currentUser.lastName,
      studentId: currentUser.studentId,
      email: currentUser.email,
      classroom: currentReservation.name, // From the classroom object
      date: e.target.elements["reservation-date"].value,
      time: e.target.elements["reservation-time"].value,
      purpose: e.target.elements["reservation-purpose"].value,
      attendees: parseInt(e.target.elements["reservation-attendees"].value),
      status: "pending",
      recurrent: e.target.elements["recurrent"].value,
    };

    if (!reservationData.purpose || !reservationData.attendees) {
      // --- FIX 3 ---
      return showAlert("Please fill in all fields.", "error");
    }
    if (reservationData.attendees > currentReservation.capacity) {
      // --- FIX 4 ---
      return showAlert(
        `Attendees (${reservationData.attendees}) exceeds capacity (${currentReservation.capacity}).`,
        "error"
      );
    }

    try {
      if (!isBackendOnline) throw new Error("Offline. Falling back to local.");

      if (editId) {
        await api.updateReservation(editId, reservationData);
      } else {
        await api.createReservation(reservationData);
      }
      showAlert(
        editId
          ? "Reservation updated successfully!"
          : "Reservation request submitted!"
      );
    } catch (error) {
      console.warn(
        "API submission failed. Falling back to local storage.",
        error.message
      );
      const localReservations = storage.getLocalReservations();

      if (editId) {
        const index = localReservations.pending.findIndex(
          (res) => res.id === editId
        );
        if (index !== -1) {
          localReservations.pending[index] = {
            ...localReservations.pending[index],
            ...reservationData,
            id: editId,
          };
        }
      } else {
        reservationData.id = "LOCAL-" + Date.now();
        localReservations.pending.push(reservationData);
      }

      localStorage.setItem(
        "classroomReservations",
        JSON.stringify(localReservations)
      );
      showAlert(
        editId
          ? "Backend not responding. Reservation updated locally."
          : "Backend not responding. Reservation saved locally.",
        "success"
      );
    } finally {
      setIsReservationModalOpen(false);
      setEditId(null);
      await loadAllReservations(currentUser);
    }
  };

  const handleEditReservation = async (id) => {
    const localReservations = storage.getLocalReservations();
    const reservation = localReservations.pending.find((res) => res.id === id);
    if (!reservation) {
      // --- FIX 5 ---
      return showAlert("Could not find reservation to edit.", "error");
    }

    const allClassrooms = await storage.getLocalClassroomData();
    let classroomDetails = null;
    for (const location in allClassrooms) {
      const found = allClassrooms[location].find(
        (c) => c.name === reservation.classroom
      );
      if (found) {
        classroomDetails = found;
        break;
      }
    }

    if (!classroomDetails) {
      // --- FIX 6 ---
      return showAlert("Could not find classroom details to edit.", "error");
    }

    setEditId(id);
    setCurrentReservation(classroomDetails);
    setIsReservationModalOpen(true);

    setTimeout(() => {
      document.getElementById("reservation-date").value = reservation.date;
      document.getElementById("reservation-time").value = reservation.time;
      document.getElementById("reservation-purpose").value =
        reservation.purpose;
      document.getElementById("reservation-attendees").value =
        reservation.attendees;
      document.querySelector(
        `input[name="recurrent"][value="${reservation.recurrent || "none"}"]`
      ).checked = true;
    }, 0);
  };

  const handleDeleteReservation = async (id) => {
    if (window.confirm("Are you sure you want to delete this reservation?")) {
      try {
        if (!isBackendOnline)
          throw new Error("Offline. Falling back to local.");
        await api.deleteReservation(id);
        showAlert("Reservation deleted successfully");
      } catch (error) {
        console.warn(
          "API delete failed, falling back to local.",
          error.message
        );
        const localReservations = storage.getLocalReservations();
        localReservations.pending = localReservations.pending.filter(
          (res) => res.id !== id
        );
        localStorage.setItem(
          "classroomReservations",
          JSON.stringify(localReservations)
        );
        showAlert(
          "Backend not responding. Reservation deleted locally.",
          "success"
        );
      } finally {
        await loadAllReservations(currentUser);
      }
    }
  };

  // --- Modal & Alert Handlers ---

  const openReservationModal = (classroom) => {
    if (!classroom.available) {
      showUnavailableAlert(classroom);
      return;
    }
    setEditId(null);
    setCurrentReservation(classroom);
    setIsReservationModalOpen(true);

    setTimeout(() => {
      const datePicker = document.getElementById("date-picker")._flatpickr;
      const startTimePicker = document.getElementById("start-time")._flatpickr;
      const endTimePicker = document.getElementById("end-time")._flatpickr;

      document.getElementById("reservation-date").value =
        datePicker.input.value;
      document.getElementById(
        "reservation-time"
      ).value = `${startTimePicker.input.value} - ${endTimePicker.input.value}`;
      document.getElementById("reservation-purpose").value = "";
      document.getElementById("reservation-attendees").value = "";
      document.querySelector(
        'input[name="recurrent"][value="none"]'
      ).checked = true;
    }, 0);
  };

  const closeReservationModal = () => {
    setIsReservationModalOpen(false);
    setEditId(null);
    setCurrentReservation(null);
  };

  const showUnavailableAlert = (classroom) => {
    showAlert(
      `${classroom.name} is currently unavailable for reservation.`,
      "error"
    );
  };

  const checkRecurrentReminders = () => {
    // This logic can stay the same for now
    console.log("Checking reminders...");
  };

  // --- Auth & Profile ---

  const performLogout = () => {
    logout(); // Use the logout function from AuthContext
    showAlert("Logging out...");
    setTimeout(() => {
      navigate("/login");
    }, 1000);
  };

  const handleAvatarUpload = (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("avatar-upload");
    if (fileInput.files.length === 0) {
      // --- FIX 7 ---
      return showAlert("Please select a file.", "error");
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      document.getElementById("user-avatar").src = event.target.result;
      // Here you would normally call an API to update the user's avatar
      // For now, we just update local state
      showAlert("Profile picture updated locally!");
    };
    reader.readAsDataURL(file);
    setIsAvatarModalOpen(false);
  };

  // --- Render ---

  if (loading || !currentUser) {
    // Show a full-page loading spinner while auth is checking
    return <div>Loading...</div>;
  }

  // Once loading is false and we have a user, render the dashboard
  return (
    <>
      <header className="header">
        <a href="/#" className="logo" onClick={(e) => e.preventDefault()}>
          <i className="fas fa-calendar-check"></i>
          <span className="logo_differentiate">PAU</span>Bookit
        </a>
        <div className="user-info">
          <div className="profile-container">
            <div className="profile-pic">
              <img
                id="user-avatar"
                src={currentUser.avatarUrl || "/profile.jpg"}
                alt="Profile"
              />
            </div>
            <button
              id="change-avatar"
              className="change-avatar-btn"
              onClick={() => setIsAvatarModalOpen(true)}
            >
              +
            </button>
          </div>
          <div className="user-details">
            Hello, <span id="user-name">{currentUser.firstName}</span> | ID:{" "}
            <span id="user-id">{currentUser.studentId}</span>
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
          <div className="date-picker-container">
            <h2>Check Classroom Availability</h2>
            <div className="date-time-selector">
              <div className="date-time-input">
                <label className="date-time-label" htmlFor="date-picker">
                  Date
                </label>
                <Flatpickr
                  id="date-picker"
                  className="date-time-field"
                  options={{ minDate: "today", dateFormat: "Y-m-d" }}
                  value={date}
                  onChange={([date]) => setDate(date)}
                />
              </div>
              <div className="date-time-input">
                <label className="date-time-label" htmlFor="start-time">
                  Start Time
                </label>
                <Flatpickr
                  id="start-time"
                  className="date-time-field"
                  options={{
                    enableTime: true,
                    noCalendar: true,
                    dateFormat: "H:i",
                    minTime: "08:00",
                    maxTime: "20:00",
                    time_24hr: true,
                  }}
                  value={startTime}
                  onChange={([date]) => setStartTime(date)}
                />
              </div>
              <div className="date-time-input">
                <label className="date-time-label" htmlFor="end-time">
                  End Time
                </label>
                <Flatpickr
                  id="end-time"
                  className="date-time-field"
                  options={{
                    enableTime: true,
                    noCalendar: true,
                    dateFormat: "H:i",
                    minTime: "08:00",
                    maxTime: "20:00",
                    time_24hr: true,
                  }}
                  value={endTime}
                  onChange={([date]) => setEndTime(date)}
                />
              </div>
              <div className="date-time-input">
                <label className="date-time-label" htmlFor="location-filter">
                  Location
                </label>
                <select
                  id="location-filter"
                  className="date-time-field"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                >
                  <option value="ALL">All Locations</option>
                  <option value="SST">SST</option>
                  <option value="TYD">TYD</option>
                </select>
              </div>
            </div>
            <button
              id="search-availability"
              className="search-btn"
              onClick={handleSearchAvailability}
            >
              <i className="fas fa-search"></i> Check Availability
            </button>
          </div>

          <div
            className="classroom-filter-status"
            id="filter-status"
            style={{ display: filterStatus.show ? "block" : "none" }}
            dangerouslySetInnerHTML={{ __html: filterStatus.message }}
          />

          <div className="location-title">
            <h2>Available Classrooms</h2>
            <span
              className="location-status"
              dangerouslySetInnerHTML={{ __html: filterStatus.message }}
            />
          </div>

          <div className="classrooms-grid" id="classrooms-container">
            {displayedClassrooms.map((group) => (
              <div key={group.location}>
                <div className="location-header">{group.location} Building</div>
                <div
                  className="classrooms-grid"
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "1rem",
                    marginBottom: "2rem",
                  }}
                >
                  {group.rooms.length > 0 ? (
                    group.rooms.map((room) => (
                      <div
                        key={room.id}
                        className={`classroom-card ${
                          room.available ? "available" : "unavailable"
                        }`}
                        style={{ width: "170px", margin: "0.5rem 0" }}
                        onClick={() =>
                          room.available
                            ? openReservationModal(room)
                            : showUnavailableAlert(room)
                        }
                      >
                        <div className="classroom-name">{room.name}</div>
                        <div className="classroom-capacity">
                          {room.capacity} seats
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No classrooms found for this location.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>

        <aside className="notifications-panel">
          <h3>Your Reservations</h3>
          <div className="notification-group" id="reminder-group">
            <h4>Reminders</h4>
            <div id="reminder-notifications">
              <p>No reminders</p>
            </div>
          </div>
          <div className="notification-group">
            <h4>Pending Approval</h4>
            <div id="pending-reservations">
              {reservations.pending.length === 0 ? (
                <p>No pending reservations</p>
              ) : (
                reservations.pending.map((res) => (
                  <ReservationItem
                    key={res.id}
                    reservation={res}
                    status="pending"
                    onEdit={handleEditReservation}
                    onDelete={handleDeleteReservation}
                  />
                ))
              )}
            </div>
          </div>
          <div className="notification-group">
            <h4>Approved</h4>
            <div id="approved-reservations">
              {reservations.approved.length === 0 ? (
                <p>No approved reservations</p>
              ) : (
                reservations.approved.map((res) => (
                  <ReservationItem
                    key={res.id}
                    reservation={res}
                    status="approved"
                  />
                ))
              )}
            </div>
          </div>
          <div className="notification-group">
            <h4>Denied</h4>
            <div id="denied-reservations">
              {reservations.denied.length === 0 ? (
                <p>No denied reservations</p>
              ) : (
                reservations.denied.map((res) => (
                  <ReservationItem
                    key={res.id}
                    reservation={res}
                    status="denied"
                  />
                ))
              )}
            </div>
          </div>
          <div className="notification-group">
            <h4>Reservation History</h4>
            <div id="history-reservations">
              {history.length === 0 ? (
                <p>No past reservations</p>
              ) : (
                history.map((res) => (
                  <ReservationItem
                    key={res.id}
                    reservation={res}
                    status={res.status}
                  />
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* --- MODALS --- */}

      {isReservationModalOpen && (
        <div
          className="modal"
          id="reservation-modal"
          style={{ display: "flex" }}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editId ? "Update" : "Reserve"} Classroom</h2>
              <button
                className="close-btn"
                id="close-modal"
                onClick={closeReservationModal}
              >
                &times;
              </button>
            </div>
            <div className="classroom-details">
              <h4>Classroom Details</h4>
              <ul>
                <li id="detail-projector">
                  <i className="fas fa-video"></i> Projector:{" "}
                  <span>
                    {currentReservation.hasProjector
                      ? "Available"
                      : "Not Available"}
                  </span>
                </li>
                <li id="detail-ac">
                  <i className="fas fa-snowflake"></i> Air Conditioner:{" "}
                  <span>
                    {currentReservation.isAcWorking ? "Working" : "Faulty"}
                  </span>
                </li>
                <li id="detail-note">
                  <i className="fas fa-sticky-note"></i> Facility Note:{" "}
                  <span>{currentReservation.facilityNote || "No notes."}</span>
                </li>
              </ul>
            </div>
            <form
              id="reservation-form"
              onSubmit={handleReservationSubmit}
              data-capacity={currentReservation.capacity}
              data-edit-id={editId}
            >
              <div className="modal-form-group">
                <label className="modal-label" htmlFor="classroom-name">
                  Classroom
                </label>
                <input
                  type="text"
                  id="classroom-name"
                  name="classroom-name"
                  className="modal-input"
                  defaultValue={currentReservation.name}
                  readOnly
                />
              </div>
              <div className="modal-form-group">
                <label className="modal-label" htmlFor="reservation-date">
                  Date
                </label>
                <input
                  type="text"
                  id="reservation-date"
                  name="reservation-date"
                  className="modal-input"
                  readOnly
                />
              </div>
              <div className="modal-form-group">
                <label className="modal-label" htmlFor="reservation-time">
                  Time
                </label>
                <input
                  type="text"
                  id="reservation-time"
                  name="reservation-time"
                  className="modal-input"
                  readOnly
                />
              </div>
              <div className="modal-form-group">
                <label className="modal-label" htmlFor="reservation-purpose">
                  Purpose of Reservation
                </label>
                <textarea
                  id="reservation-purpose"
                  name="reservation-purpose"
                  className="modal-textarea"
                  placeholder="Please describe the purpose of your reservation"
                ></textarea>
              </div>
              <div className="modal-form-group">
                <label className="modal-label" htmlFor="reservation-attendees">
                  Expected Number of Attendees
                </label>
                <input
                  type="number"
                  id="reservation-attendees"
                  name="reservation-attendees"
                  className="modal-input"
                  min="1"
                  max={currentReservation.capacity}
                  placeholder={`Enter number (max ${currentReservation.capacity})`}
                />
              </div>
              <div className="modal-form-group">
                <label className="modal-label">Recurrent Reservation</label>
                <div className="recurrent-options">
                  <label className="recurrent-option">
                    <input
                      type="radio"
                      name="recurrent"
                      value="none"
                      defaultChecked
                    />
                    <span>One-time only</span>
                  </label>
                  <label className="recurrent-option">
                    <input type="radio" name="recurrent" value="daily" />
                    <span>Daily</span>
                  </label>
                  <label className="recurrent-option">
                    <input type="radio" name="recurrent" value="weekly" />
                    <span>Weekly</span>
                  </label>
                </div>
              </div>
              <button type="submit" className="reserve-btn">
                {editId ? "Update Reservation" : "Submit Reservation Request"}
              </button>
            </form>
          </div>
        </div>
      )}

      {isAvatarModalOpen && (
        <div className="modal" id="avatar-modal" style={{ display: "flex" }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Change Profile Picture</h2>
              <button
                className="close-btn"
                id="close-avatar-modal"
                onClick={() => setIsAvatarModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <form id="avatar-form" onSubmit={handleAvatarUpload}>
              <div className="modal-form-group">
                <label className="modal-label" htmlFor="avatar-upload">
                  Select Image
                </label>
                <input
                  type="file"
                  id="avatar-upload"
                  className="modal-input"
                  accept="image/*"
                />
              </div>
              <button type="submit" className="reserve-btn">
                Upload
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- THIS IS THE CORRECTED ALERT BLOCK --- */}
      {/* It is now at the top level, not inside another component */}
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
    </>
  );
}

export default UserDashboard;
