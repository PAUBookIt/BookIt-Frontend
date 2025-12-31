// src/pages/dashboards/UserDashboard.jsx

import React, { useState, useEffect, useCallback } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css"; // Import flatpickr theme

// --- IMPORTS ---
import * as api from "../../services/apiService.js";
import * as storage from "../../services/sharedStorage.js";
import { isBackendOnline } from "../../services/status.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import "../../index.css";

// --- Helper component for rendering reservations ---
const ReservationItem = ({ reservation, status, onEdit, onDelete }) => (
  <div className={`reservation-notification ${status}`}>
    <div className="reservation-content">
      {/* Display name if available, otherwise just ID for now (backend sends object) */}
      <div className="reservation-title">
        {typeof reservation.classroom === "object"
          ? reservation.classroom.name
          : reservation.classroom}
      </div>
      <div className="reservation-details">
        {storage.formatDate(reservation.startTime || reservation.date)} |
        {/* Helper to show time from ISO string or local string */}
        {reservation.startTime
          ? `${new Date(reservation.startTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })} - ${new Date(reservation.endTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : reservation.time}
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
  const { currentUser, loading, logout } = useAuth();
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
  const [currentReservation, setCurrentReservation] = useState(null);
  const [editId, setEditId] = useState(null);

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
    setTimeout(() => {
      setAlert({ show: false, message: "", type: "success" });
    }, 5000);
  }, []);

  // --- Data Loading Functions ---
  const loadAllClassrooms = useCallback(async () => {
    try {
      const data = await storage.getClassroomData();
      filterAndDisplayClassrooms(data, "ALL", false);
    } catch (error) {
      console.error("Failed to display classrooms:", error);
      showAlert("Error: Could not load classroom data.", "error");
    }
  }, [showAlert]);

  const loadAllReservations = useCallback(
    async (user) => {
      if (!user) return;
      try {
        const data = await storage.getReservations();
        if (!data) throw new Error("No reservation data found.");

        // NOTE: Backend returns all reservations. In a real app, backend filters by userId.
        // Here we filter client-side just to be safe if backend sends everything.
        const myPending = data.pending.filter(
          (r) => r.userId === user.id || r.studentId === user.studentId
        );
        const myApproved = data.approved.filter(
          (r) => r.userId === user.id || r.studentId === user.studentId
        );
        const myDenied = data.denied.filter(
          (r) => r.userId === user.id || r.studentId === user.studentId
        );

        setReservations({
          pending: myPending,
          approved: myApproved,
          denied: myDenied,
        });

        const historyItems = [...myApproved, ...myDenied].sort(
          (a, b) =>
            new Date(b.startTime || b.date) - new Date(a.startTime || a.date)
        );
        setHistory(historyItems);
      } catch (error) {
        console.error("Failed to load reservations:", error);
        showAlert("Error: Could not load your reservations.", "error");
      }
    },
    [showAlert]
  );

  // --- Load Data on Page Start ---
  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        navigate("/login");
        return;
      }
      storage.initializeLocalStorage();
      loadAllClassrooms();
      loadAllReservations(currentUser);

      const reminderInterval = setInterval(checkRecurrentReminders, 60000);
      return () => clearInterval(reminderInterval);
    }
  }, [loading, currentUser, navigate, loadAllClassrooms, loadAllReservations]);

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
    const datePicker = document.getElementById("date-picker");
    const startTime = document.getElementById("start-time");
    const endTime = document.getElementById("end-time");
    if (!datePicker.value || !startTime.value || !endTime.value) {
      return showAlert(
        "Please select date and time to check availability.",
        "error"
      );
    }

    try {
      let data = await storage.getLocalClassroomData();
      // Simulation of filtering
      for (const location in data) {
        data[location].forEach((classroom) => {
          classroom.available = Math.random() < 0.7;
        });
      }
      filterAndDisplayClassrooms(data, locationFilter, true);
    } catch (error) {
      showAlert("Could not load classroom data for filtering.", "error");
    }
  };

  // --- RESERVATION SUBMISSION LOGIC (FIXED) ---

  const handleReservationSubmit = async (e) => {
    e.preventDefault();

    // 1. Extract raw form values
    const formDate = e.target.elements["reservation-date"].value;
    const formTimeRange = e.target.elements["reservation-time"].value;
    const purpose = e.target.elements["reservation-purpose"].value;
    const attendees = parseInt(
      e.target.elements["reservation-attendees"].value
    );
    const recurrent = e.target.elements["recurrent"].value;

    // 2. Validate basic inputs
    if (!purpose || !attendees) {
      return showAlert("Please fill in all fields.", "error");
    }
    if (attendees > currentReservation.capacity) {
      return showAlert(`Attendees (${attendees}) exceeds capacity.`, "error");
    }

    // 3. PARSE DATES (Convert "09:00 - 11:00" to actual Date objects for Backend)
    let startTimeObj, endTimeObj;
    try {
      const [startStr, endStr] = formTimeRange.split(" - ");
      // Combine date + time string (e.g., "2025-10-10T09:00:00")
      startTimeObj = new Date(`${formDate}T${startStr}:00`);
      endTimeObj = new Date(`${formDate}T${endStr}:00`);
    } catch (err) {
      return showAlert("Invalid Date/Time format.", "error");
    }

    // 4. Construct API Payload (Strictly what backend expects)
    const apiPayload = {
      classroomId: currentReservation.id,
      startTime: startTimeObj.toISOString(),
      endTime: endTimeObj.toISOString(),
      purpose: purpose,
    };

    // 5. Construct UI Payload (For immediate local display fallback)
    const uiPayload = {
      studentName: currentUser.firstName + " " + currentUser.lastName,
      studentId: currentUser.studentId,
      email: currentUser.email,
      classroom: currentReservation.name,
      date: formDate,
      time: formTimeRange,
      purpose: purpose,
      attendees: attendees,
      status: "pending",
      recurrent: recurrent,
    };

    try {
      // Force check for true to attempt fetch
      // Note: isBackendOnline in sharedStorage.js should be set to true
      // if (!isBackendOnline) throw new Error("Offline mode forced.");

      if (editId) {
        await api.updateReservation(editId, apiPayload);
      } else {
        await api.createReservation(apiPayload);
      }

      showAlert(editId ? "Reservation updated!" : "Request submitted!");

      // Close modal immediately on success
      setIsReservationModalOpen(false);
      setEditId(null);
      await loadAllReservations(currentUser);
    } catch (error) {
      console.warn("API submission failed. Falling back to local.", error);

      // --- LOCAL FALLBACK LOGIC ---
      const localReservations = storage.getLocalReservations();
      if (editId) {
        const index = localReservations.pending.findIndex(
          (r) => r.id === editId
        );
        if (index !== -1)
          localReservations.pending[index] = {
            ...localReservations.pending[index],
            ...uiPayload,
            id: editId,
          };
      } else {
        uiPayload.id = "LOCAL-" + Date.now();
        localReservations.pending.push(uiPayload);
      }
      localStorage.setItem(
        "classroomReservations",
        JSON.stringify(localReservations)
      );

      showAlert("Backend error. Saved locally.", "success");
      setIsReservationModalOpen(false);
      setEditId(null);

      // We manually update state to show the new local item immediately
      setReservations((prev) => ({
        ...prev,
        pending: [...prev.pending, uiPayload],
      }));
    }
  };

  const handleEditReservation = async (id) => {
    // Try to find in state first
    let reservation = [...reservations.pending].find((res) => res.id === id);

    // If not found in state (rare), check storage
    if (!reservation) {
      const localReservations = storage.getLocalReservations();
      reservation = localReservations.pending.find((res) => res.id === id);
    }

    if (!reservation) {
      return showAlert("Could not find reservation to edit.", "error");
    }

    // Need to find the classroom object to repopulate the modal
    const allClassrooms = await storage.getLocalClassroomData();
    let classroomDetails = null;

    // Handle both string name (local) and object (backend)
    const roomName =
      typeof reservation.classroom === "object"
        ? reservation.classroom.name
        : reservation.classroom;

    for (const location in allClassrooms) {
      const found = allClassrooms[location].find((c) => c.name === roomName);
      if (found) {
        classroomDetails = found;
        break;
      }
    }

    if (!classroomDetails) {
      return showAlert("Could not find classroom details to edit.", "error");
    }

    setEditId(id);
    setCurrentReservation(classroomDetails);
    setIsReservationModalOpen(true);

    // Populate fields
    setTimeout(() => {
      // If it's a backend reservation, we need to format ISO dates back to form strings
      if (reservation.startTime) {
        const start = new Date(reservation.startTime);
        const end = new Date(reservation.endTime);
        const dateStr = start.toISOString().split("T")[0];
        const timeStr = `${start.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })} - ${end.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}`;

        document.getElementById("reservation-date").value = dateStr;
        document.getElementById("reservation-time").value = timeStr;
      } else {
        // Local format
        document.getElementById("reservation-date").value = reservation.date;
        document.getElementById("reservation-time").value = reservation.time;
      }

      document.getElementById("reservation-purpose").value =
        reservation.purpose || "";
      // Default attendees to 1 if missing in backend data
      document.getElementById("reservation-attendees").value =
        reservation.attendees || 1;

      const recVal = reservation.recurrent || "none";
      const rad = document.querySelector(
        `input[name="recurrent"][value="${recVal}"]`
      );
      if (rad) rad.checked = true;
    }, 100);
  };

  const handleDeleteReservation = async (id) => {
    if (window.confirm("Are you sure you want to delete this reservation?")) {
      try {
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
    console.log("Checking reminders...");
  };

  // --- Auth & Profile ---

  const performLogout = () => {
    logout();
    showAlert("Logging out...");
    setTimeout(() => {
      navigate("/login");
    }, 1000);
  };

  const handleAvatarUpload = (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("avatar-upload");
    if (fileInput.files.length === 0) {
      return showAlert("Please select a file.", "error");
    }
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      document.getElementById("user-avatar").src = event.target.result;
      showAlert("Profile picture updated locally!");
    };
    reader.readAsDataURL(file);
    setIsAvatarModalOpen(false);
  };

  // --- Render ---

  if (loading || !currentUser) {
    return <div>Loading...</div>;
  }

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
