// This is apiService.js

// !!! IMPORTANT: Change this to your actual backend URL
const BASE_URL = "http://your-postgres-backend-url.com/api";

// A simple function to check if the backend is alive
export async function pingBackend() {
  // We use a controller to "time out" the request after 3 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${BASE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId); // Clear the timeout if the request was successful
    return response.ok;
  } catch (error) {
    clearTimeout(timeoutId); // Clear the timeout if it failed
    console.warn("Backend ping failed:", error.name);
    return false;
  }
}

// --- DATA FETCHING (GET) ---

export async function getReservations() {
  const response = await fetch(`${BASE_URL}/reservations`);
  if (!response.ok) throw new Error("Failed to fetch reservations");
  return await response.json();
}

export async function getClassrooms() {
  const response = await fetch(`${BASE_URL}/classrooms`);
  if (!response.ok) throw new Error("Failed to fetch classrooms");
  return await response.json();
}

// --- DATA WRITING (POST, PUT, DELETE) ---

export async function createReservation(reservationData) {
  const response = await fetch(`${BASE_URL}/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reservationData),
  });
  if (!response.ok) throw new Error("Failed to create reservation");
  return await response.json();
}

export async function updateReservation(id, reservationData) {
  const response = await fetch(`${BASE_URL}/reservations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reservationData),
  });
  if (!response.ok) throw new Error("Failed to update reservation");
  return await response.json();
}

export async function deleteReservation(id) {
  const response = await fetch(`${BASE_URL}/reservations/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete reservation");
  return await response.json();
}

// --- ADD THIS FUNCTION TO THE BOTTOM of apiService.js ---

export async function updateClassroom(id, classroomData) {
  const response = await fetch(`${BASE_URL}/classrooms/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(classroomData),
  });
  if (!response.ok) throw new Error("Failed to update classroom");
  return await response.json();
}
