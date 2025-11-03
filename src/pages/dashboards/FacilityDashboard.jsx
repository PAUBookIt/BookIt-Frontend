import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarCheck } from "@fortawesome/free-solid-svg-icons";
import "../../index.css"; // Use the global CSS

// Import our services
import * as api from "../../services/apiService";
import * as storage from "../../services/sharedStorage";
import { isBackendOnline, checkBackendStatus } from "../../services/status";

// --- Constants ---
const ROOM_STATUS = {
  AVAILABLE: "AVAILABLE",
  CLEANING: "CLEANING",
  MAINTENANCE: "MAINTENANCE",
};

const UTIL_STATE = {
  WORKING: "WORKING",
  FAULTY: "FAULTY",
};

const statusMeta = {
  AVAILABLE: { label: "Available", cls: "status-pill status-available" },
  CLEANING: { label: "Cleaning", cls: "status-pill status-cleaning" },
  MAINTENANCE: { label: "Maintenance", cls: "status-pill status-maintenance" },
};

const utilMeta = {
  WORKING: { label: "Working" },
  FAULTY: { label: "Faulty" },
};

// --- Helper: Convert our storage data to the new component's state format ---
function transformStorageRooms(data) {
  const allRooms = [];
  const roomsState = {};

  // Loop through locations (SST, TYD)
  for (const building in data) {
    // Loop through rooms in that location
    data[building].forEach((room) => {
      // --- THIS WAS THE FIX ---
      // Add the building property to the room object
      allRooms.push({ ...room, building: building });
      // --- END FIX ---

      // Create the state entry for the room
      roomsState[room.id] = {
        status: room.status || ROOM_STATUS.AVAILABLE,
        utilities: room.utilities || {
          projector: UTIL_STATE.WORKING,
          ac: UTIL_STATE.WORKING,
          power: UTIL_STATE.WORKING,
        },
        notes: room.notes || [],
      };
    });
  }

  return { allRooms, roomsState };
}

// --- RoomCard Component (from your new file) ---
function RoomCard({ room, state, onChange }) {
  const [noteInput, setNoteInput] = useState("");

  const cycleStatus = () => {
    const order = [
      ROOM_STATUS.AVAILABLE,
      ROOM_STATUS.CLEANING,
      ROOM_STATUS.MAINTENANCE,
    ];
    const idx = order.indexOf(state.status);
    const next = order[(idx + 1) % order.length];
    onChange({ ...state, status: next });
  };

  const cycleUtil = (key) => {
    const order = [UTIL_STATE.WORKING, UTIL_STATE.FAULTY];
    const idx = order.indexOf(state.utilities[key]);
    const next = order[(idx + 1) % order.length];
    onChange({ ...state, utilities: { ...state.utilities, [key]: next } });
  };

  const addNote = () => {
    if (!noteInput.trim()) return;
    // Add new note to the top of the list
    onChange({
      ...state,
      notes: [{ text: noteInput.trim(), ts: Date.now() }, ...state.notes],
    });
    setNoteInput("");
  };

  return (
    <div className="room-card">
      <div className="room-top">
        <div>
          <div className="room-name">{room.name}</div>
          <div className="room-meta">
            {room.building} • {room.capacity} seats
          </div>
        </div>
        <span className={statusMeta[state.status].cls}>
          {statusMeta[state.status].label}
        </span>
      </div>

      <div className="utilities">
        {Object.keys(state.utilities).map((k) => {
          const v = state.utilities[k];
          const utilCls =
            v === UTIL_STATE.WORKING
              ? "utility-chip utility-working"
              : "utility-chip utility-faulty";
          return (
            <button key={k} onClick={() => cycleUtil(k)} className={utilCls}>
              {k} • {utilMeta[v].label}
            </button>
          );
        })}
      </div>

      <div className="status-actions">
        <button
          type="button"
          onClick={cycleStatus}
          className="status-btn active"
          title="Click to cycle: Available → Cleaning → Maintenance"
        >
          {statusMeta[state.status].label} <h6>(click to change)</h6>
        </button>
      </div>

      <div className="note-input-row">
        <input
          className="note-input"
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          placeholder="Add any extra information..."
        />
        <button className="note-add-btn" onClick={addNote}>
          Add
        </button>
      </div>

      {state.notes.length > 0 && (
        <ul className="note-list">
          {state.notes.slice(0, 5).map(
            (
              n,
              i // Show 5 most recent
            ) => (
              <li key={i} className="note-item">
                <span>{n.text}</span>
                <span className="note-time">
                  {new Date(n.ts).toLocaleDateString()}
                </span>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

// --- Main FacilityDashboard Component ---
export default function FacilityDashboard() {
  // --- Auth & Navigation ---
  const { currentUser, loading, logout } = useAuth();
  const navigate = useNavigate();

  // --- State ---
  const [allRooms, setAllRooms] = useState([]); // This will have { ...room, building: 'SST' }
  const [roomsState, setRoomsState] = useState({}); // The editable state
  const [buildingDraft, setBuildingDraft] = useState("ALL");
  const [buildingApplied, setBuildingApplied] = useState("ALL");
  const [issueFilter, setIssueFilter] = useState("ALL"); // New filter for issues

  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // --- Alert Function ---
  const showAlert = useCallback((message, type = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: "", type: "success" });
    }, 5000);
  }, []);

  // --- Data Loading ---
  const loadData = useCallback(async () => {
    try {
      const data = await storage.getClassroomData();
      const { allRooms, roomsState } = transformStorageRooms(data); // Use the fixed function
      setAllRooms(allRooms);
      setRoomsState(roomsState);
    } catch (error) {
      console.error("Failed to load data:", error);
      showAlert("Error: Could not load classroom data.", "error");
    }
  }, [showAlert]);

  // --- Load Data on Page Start ---
  useEffect(() => {
    const initialize = async () => {
      await checkBackendStatus();
      storage.initializeLocalStorage();
    };
    initialize();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!currentUser || currentUser.role !== "facility") {
        navigate("/login");
        return;
      }
      loadData();
    }
  }, [loading, currentUser, navigate, loadData]);

  // --- Memoized Filtering Logic ---
  const filteredRooms = useMemo(() => {
    const grouped = {}; // Start with an empty object

    allRooms.forEach((room) => {
      // 1. Filter by Building
      if (buildingApplied !== "ALL" && room.building !== buildingApplied) {
        return; // Skip this room
      }

      // 2. Filter by Issue
      const state = roomsState[room.id];
      if (!state) return; // Skip if state isn't loaded

      let hasIssue = false;
      if (
        issueFilter === "PROJECTOR" &&
        state.utilities.projector === UTIL_STATE.FAULTY
      )
        hasIssue = true;
      if (issueFilter === "AC" && state.utilities.ac === UTIL_STATE.FAULTY)
        hasIssue = true;
      if (
        issueFilter === "POWER" &&
        state.utilities.power === UTIL_STATE.FAULTY
      )
        hasIssue = true;
      if (
        issueFilter === "MAINTENANCE" &&
        state.status === ROOM_STATUS.MAINTENANCE
      )
        hasIssue = true;

      if (issueFilter !== "ALL" && !hasIssue) {
        return; // Skip this room if it doesn't match the issue filter
      }

      // 3. Add to its building group
      if (!grouped[room.building]) {
        grouped[room.building] = [];
      }
      grouped[room.building].push(room);
    });

    return grouped;
  }, [buildingApplied, issueFilter, allRooms, roomsState]);

  // --- FIXED KPI Counts ---
  const counts = useMemo(() => {
    const c = { AVAILABLE: 0, CLEANING: 0, MAINTENANCE: 0 };

    allRooms.forEach((room) => {
      // Only count rooms that match the building filter
      if (buildingApplied === "ALL" || room.building === buildingApplied) {
        const state = roomsState[room.id];
        if (state) {
          // Check if the key exists before incrementing
          if (c.hasOwnProperty(state.status)) {
            c[state.status] += 1;
          }
        }
      }
    });
    return c;
  }, [roomsState, allRooms, buildingApplied]);

  // --- Handlers ---
  const applyFilters = () => {
    setBuildingApplied(buildingDraft);
    // issueFilter is already set by its own onChange,
    // which triggers the useMemo to re-filter.
  };

  const clearFilters = () => {
    setBuildingDraft("ALL");
    setBuildingApplied("ALL");
    setIssueFilter("ALL");
  };

  // This is the core save function
  const updateRoomState = async (roomId, nextState) => {
    // 1. Update UI instantly
    setRoomsState((s) => ({ ...s, [roomId]: nextState }));

    // 2. Find the full classroom object to save
    const roomToSave = allRooms.find((r) => r.id === roomId);
    if (!roomToSave) return;

    // 3. Create the data payload for storage/API
    const updatedClassroom = {
      ...roomToSave,
      status: nextState.status,
      utilities: nextState.utilities,
      notes: nextState.notes,
    };

    // 4. Try API, fall back to local
    try {
      if (!isBackendOnline) throw new Error("Offline. Falling back to local.");

      // --- TRY API FIRST ---
      await api.updateClassroom(roomId, updatedClassroom);
      showAlert("Classroom status updated on server!");
    } catch (error) {
      // --- API FAILED: FALLBACK TO LOCAL STORAGE ---
      console.warn(
        "API update failed, saving to local storage.",
        error.message
      );
      const success = storage.saveClassroomLocally(updatedClassroom);
      if (success) {
        showAlert("Backend not responding. Status saved locally.", "success");
      } else {
        showAlert("Failed to save status locally.", "error");
      }
    }
  };

  const performLogout = () => {
    logout();
    showAlert("Logging out...");
    setTimeout(() => {
      navigate("/login");
    }, 1000);
  };

  // --- Render ---
  if (loading || !currentUser) {
    return <div>Loading Facility Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="header">
        <a className="logo" href="/#" onClick={(e) => e.preventDefault()}>
          <FontAwesomeIcon icon={faCalendarCheck} />
          <span className="logo_differentiate">PAU</span>BookIt
        </a>
        <div className="user-info">
          <p className="facility-user">Hello, {currentUser.firstName}</p>
          <button className="logout-btn" onClick={performLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main
        className="dashboard-container"
        style={{ gridTemplateColumns: "1fr", maxWidth: "1200px" }}
      >
        <section className="main-content" style={{ maxWidth: "none" }}>
          <div className="control-panel">
            <div className="panel-header">
              <h2>Classroom Status</h2>
            </div>

            <div className="filter-controls">
              <div className="filter-group">
                <label htmlFor="location-filter">Filter by Location</label>
                <select
                  id="location-filter"
                  value={buildingDraft}
                  onChange={(e) => setBuildingDraft(e.target.value)}
                  className="filter-select"
                >
                  <option value="ALL">All Locations</option>
                  <option value="SST">SST</option>
                  <option value="TYD">TYD</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="issue-filter">Filter by Issue</label>
                <select
                  id="issue-filter"
                  value={issueFilter}
                  onChange={(e) => setIssueFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="ALL">All Issues</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="PROJECTOR">Projector Faulty</option>
                  <option value="AC">A/C Faulty</option>
                  <option value="POWER">Power Faulty</option>
                </select>
              </div>

              <div className="filter-actions">
                <button
                  className="filter-btn"
                  type="button"
                  onClick={applyFilters}
                >
                  <i className="fas fa-filter"></i> Apply Filters
                </button>
                <button
                  className="clear-filter-btn"
                  type="button"
                  onClick={clearFilters}
                >
                  <i className="fas fa-times"></i> Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* KPI cards - NOW INTERACTIVE */}
          <div className="kpi-cards">
            <div
              className="kpi-card kpi available"
              style={{ borderColor: "#28a745" }}
              onClick={() => {
                setIssueFilter("ALL");
                // You could also make this filter by "Available" if you add it to the dropdown
              }}
            >
              <div>
                <div className="kpi-value">{counts.AVAILABLE}</div>
                <div className="kpi-label">Available</div>
              </div>
            </div>
            <div
              className="kpi-card kpi cleaning"
              style={{ borderColor: "#ffc107" }}
              onClick={() => setIssueFilter("ALL")} // Clicks do nothing yet
            >
              <div className="kpi-value" style={{ color: "#856404" }}>
                {counts.CLEANING}
              </div>
              <div className="kpi-label">Cleaning</div>
            </div>
            <div
              className="kpi-card kpi maintenance"
              style={{ borderColor: "#dc3545" }}
              onClick={() => setIssueFilter("MAINTENANCE")} // Click to filter by Maintenance
            >
              <div className="kpi-value" style={{ color: "#721c24" }}>
                {counts.MAINTENANCE}
              </div>
              <div className="kpi-label">Maintenance</div>
            </div>
          </div>
        </section>

        {/* Boards by building - FIXED */}
        {Object.entries(filteredRooms).map(([building, rooms]) => (
          <section key={building}>
            <div className="section-header">
              <h2>{building} Building</h2>
            </div>
            <div className="rooms-grid">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  state={roomsState[room.id]}
                  onChange={(nextState) => updateRoomState(room.id, nextState)}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* --- Global Alert --- */}
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
    </div>
  );
}
