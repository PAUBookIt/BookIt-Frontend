// src/services/apiService.js

// Using 127.0.0.1 to avoid macOS localhost issues
const BASE_URL = "http://127.0.0.1:5001/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

// Generic fetch wrapper with better error handling and longer timeout
async function fetchWithTimeout(url, options = {}) {
  const { timeout = 15000 } = options; // Increased to 15 seconds

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// --- DATA FETCHING ---

export async function pingBackend() {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.warn("Backend ping failed:", error);
    return false;
  }
}

export async function login(credentials) {
  const response = await fetchWithTimeout(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Login failed");
  }
  return await response.json();
}

export async function signup(userData) {
  const response = await fetchWithTimeout(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Signup failed");
  }
  return await response.json();
}

export async function getReservations() {
  const response = await fetchWithTimeout(`${BASE_URL}/reservations`);
  if (!response.ok) throw new Error("Failed to fetch reservations");
  return await response.json();
}

export async function getClassrooms() {
  const response = await fetchWithTimeout(`${BASE_URL}/classrooms`);
  if (!response.ok) throw new Error("Failed to fetch classrooms");
  return await response.json();
}

export async function createReservation(reservationData) {
  const response = await fetchWithTimeout(`${BASE_URL}/reservations`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(reservationData),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to create reservation");
  }
  return await response.json();
}

export async function updateReservation(id, reservationData) {
  const response = await fetchWithTimeout(`${BASE_URL}/reservations/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(reservationData),
  });
  if (!response.ok) throw new Error("Failed to update reservation");
  return await response.json();
}

export async function deleteReservation(id) {
  const response = await fetchWithTimeout(`${BASE_URL}/reservations/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete reservation");
  return await response.json();
}

export async function updateClassroom(id, classroomData) {
  const response = await fetchWithTimeout(`${BASE_URL}/classrooms/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(classroomData),
  });
  if (!response.ok) throw new Error("Failed to update classroom");
  return await response.json();
}
