// This is the new sharedStorage.js

import * as api from "./apiService.js";
import { isBackendOnline } from "./status.js";

// --- Local Storage Keys ---
const RESERVATION_KEY = "classroomReservations";
const CLASSROOM_KEY = "classroomData";

// --- Initialization ---

// This function now just initializes the *local* copy
export function initializeLocalStorage() {
  if (!localStorage.getItem(RESERVATION_KEY)) {
    const initialReservations = {
      pending: [],
      approved: [],
      denied: [],
      lastUpdate: new Date().getTime(),
    };
    localStorage.setItem(RESERVATION_KEY, JSON.stringify(initialReservations));
  }

  if (!localStorage.getItem(CLASSROOM_KEY)) {
    // --- THIS SECTION IS UPDATED with new classrooms and fields ---
    const classroomData = {
      SST: [
        {
          id: 1,
          name: "Engineering Drawing Studio",
          available: true,
          capacity: 80,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 2,
          name: "Electronics, Control and Telecomms Lab",
          available: true,
          capacity: 50,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 3,
          name: "Electrical Power and Machines Lab",
          available: true,
          capacity: 50,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 4,
          name: "Computer lab 01",
          available: true,
          capacity: 50,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 5,
          name: "Thermofluid lab",
          available: true,
          capacity: 50,
          hasProjector: false,
          isAcWorking: true,
          facilityNote: "No projector available.",
        },
        {
          id: 6,
          name: "Mechanics of Machines",
          available: true,
          capacity: 20,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 7,
          name: "Classroom 1",
          available: true,
          capacity: 50,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 8,
          name: "Classroom 2",
          available: true,
          capacity: 50,
          hasProjector: true,
          isAcWorking: false,
          facilityNote: "AC unit is faulty.",
        },
        {
          id: 9,
          name: "Computer Lab 02",
          available: true,
          capacity: 50,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 10,
          name: "Chemistry lab",
          available: true,
          capacity: 50,
          hasProjector: false,
          isAcWorking: true,
          facilityNote: "Lab equipment in use.",
        },
        {
          id: 11,
          name: "Physics and Applied Electricity lab",
          available: true,
          capacity: 50,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 12,
          name: "Classroom 3",
          available: true,
          capacity: 50,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 13,
          name: "Classroom 4",
          available: true,
          capacity: 50,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 14,
          name: "Classroom 5",
          available: true,
          capacity: 50,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 15,
          name: "Strength of Materials",
          available: true,
          capacity: 15,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 16,
          name: "SST New Classroom (Year 4)",
          available: true,
          capacity: 25,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 17,
          name: "Syndicate Room 1",
          available: true,
          capacity: 10,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 18,
          name: "Syndicate Room 2",
          available: true,
          capacity: 10,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
      ],
      TYD: [
        {
          id: 19,
          name: "Maiduguri",
          available: true,
          capacity: 50,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 20,
          name: "Ado-Ekiti",
          available: true,
          capacity: 50,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 21,
          name: "Jalingo",
          available: true,
          capacity: 80,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 22,
          name: "Zaria",
          available: true,
          capacity: 80,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 23,
          name: "Jos",
          available: true,
          capacity: 50,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 24,
          name: "Enugu",
          available: true,
          capacity: 50,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 25,
          name: "Uyo",
          available: true,
          capacity: 30,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 26,
          name: "Lokoja",
          available: true,
          capacity: 30,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 27,
          name: "Bauchi",
          available: true,
          capacity: 80,
          hasProjector: true,
          isAcWorking: false,
          facilityNote: "Projector bulb is dim.",
        },
        {
          id: 28,
          name: "Oshogbo",
          available: true,
          capacity: 30,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 29,
          name: "Umuahia",
          available: true,
          capacity: 30,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 30,
          name: "Art and Graphics Studio",
          available: true,
          capacity: 65,
          hasProjector: false,
          isAcWorking: true,
          facilityNote: "Special equipment present.",
        },
        {
          id: 31,
          name: "Newsroom",
          available: true,
          capacity: 30,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 32,
          name: "Port-Harcourt",
          available: true,
          capacity: 80,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 33,
          name: "Computer Lab 2",
          available: true,
          capacity: 60,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 34,
          name: "Computer Lab 1",
          available: true,
          capacity: 60,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 35,
          name: "Abeokuta",
          available: true,
          capacity: 30,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 36,
          name: "Abakaliki",
          available: true,
          capacity: 80,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 37,
          name: "Ibadan",
          available: true,
          capacity: 65,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 38,
          name: "Asaba",
          available: true,
          capacity: 65,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
        {
          id: 39,
          name: "TYD New classroom",
          available: true,
          capacity: 80,
          hasProjector: true,
          isAcWorking: true,
          facilityNote: "All systems nominal.",
        },
      ],
    };
    // --- END OF UPDATE ---
    localStorage.setItem(CLASSROOM_KEY, JSON.stringify(classroomData));
  }
}

// --- Data Functions (Now "Smart") ---

/**
 * Gets reservations.
 * Tries API first, falls back to local storage.
 */
export async function getReservations() {
  if (isBackendOnline) {
    try {
      const dataFromApi = await api.getReservations();
      // NOTE: Your API data structure must match the local one.
      // This assumes your API returns an object like: { pending: [], approved: [], denied: [] }
      // If it doesn't, we'll need to transform it here.

      // Sync local storage with the fresh data
      localStorage.setItem(RESERVATION_KEY, JSON.stringify(dataFromApi));
      console.log("Fetched reservations from API");
      return dataFromApi;
    } catch (error) {
      console.error(
        "API failed to get reservations, falling back to local.",
        error
      );
      return getLocalReservations();
    }
  } else {
    // Offline, just get local data
    return getLocalReservations();
  }
}

/**
 * Gets classrooms.
 * Tries API first, falls back to local storage.
 */
export async function getClassroomData() {
  if (isBackendOnline) {
    try {
      const dataFromApi = await api.getClassrooms();
      // NOTE: Your API data must match the local one: { SST: [...], TYD: [...] }
      // If it doesn't, we'll need to transform it.

      localStorage.setItem(CLASSROOM_KEY, JSON.stringify(dataFromApi));
      console.log("Fetched classrooms from API");
      return dataFromApi;
    } catch (error) {
      console.error(
        "API failed to get classrooms, falling back to local.",
        error
      );
      return getLocalClassroomData();
    }
  } else {
    // Offline, just get local data
    return getLocalClassroomData();
  }
}

// --- Helper functions for local-only access ---

// --- THIS IS THE FIX: ADD 'export' ---
export function getLocalReservations() {
  console.log("Fetched reservations from LOCAL");
  return JSON.parse(localStorage.getItem(RESERVATION_KEY));
}

// --- THIS IS THE FIX: ADD 'export' ---
export function getLocalClassroomData() {
  console.log("Fetched classrooms from LOCAL");
  return JSON.parse(localStorage.getItem(CLASSROOM_KEY));
}

// --- Helper function to format date (unchanged) ---
export function formatDate(dateString) {
  // Added a check for invalid date string
  if (!dateString || new Date(dateString).toString() === "Invalid Date") {
    return "Invalid Date";
  }
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
}
