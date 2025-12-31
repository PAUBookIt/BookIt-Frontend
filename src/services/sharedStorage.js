// src/services/sharedStorage.js

import * as api from "./apiService.js";
// import { isBackendOnline } from "./status.js"; // <--- COMMENTED OUT TO BYPASS CHECK

// --- FORCE ONLINE MODE ---
// We assume online by default so the app ALWAYS tries to fetch from the backend first.
const isBackendOnline = true;

// --- Local Storage Keys ---
const RESERVATION_KEY = "classroomReservations";
const CLASSROOM_KEY = "classroomData";

// --- NEW CONSTANTS (from Facility Dashboard) ---
export const ROOM_STATUS = {
  AVAILABLE: "AVAILABLE",
  CLEANING: "CLEANING",
  MAINTENANCE: "MAINTENANCE",
};

export const UTIL_STATE = {
  WORKING: "WORKING",
  FAULTY: "FAULTY",
};
// --- END NEW CONSTANTS ---

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
    // --- THIS SECTION IS UPDATED with new fields ---
    const classroomData = {
      SST: [
        {
          id: 1,
          name: "Engineering Drawing Studio",
          capacity: 80,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 2,
          name: "Electronics, Control and Telecomms Lab",
          capacity: 50,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 3,
          name: "Electrical Power and Machines Lab",
          capacity: 50,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 4,
          name: "Computer lab 01",
          capacity: 50,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 5,
          name: "Thermofluid lab",
          capacity: 50,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.FAULTY,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [{ text: "Projector not working", ts: Date.now() }],
        },
        {
          id: 6,
          name: "Mechanics of Machines",
          capacity: 20,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 7,
          name: "Classroom 1",
          capacity: 50,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 8,
          name: "Classroom 2",
          capacity: 50,
          status: ROOM_STATUS.MAINTENANCE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.FAULTY,
            power: UTIL_STATE.WORKING,
          },
          notes: [{ text: "AC unit is faulty.", ts: Date.now() }],
        },
        {
          id: 9,
          name: "Computer Lab 02",
          capacity: 50,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 10,
          name: "Chemistry lab",
          capacity: 50,
          status: ROOM_STATUS.CLEANING,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [{ text: "Cleaning in progress", ts: Date.now() }],
        },
        {
          id: 11,
          name: "Physics and Applied Electricity lab",
          capacity: 50,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 12,
          name: "Classroom 3",
          capacity: 50,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 13,
          name: "Classroom 4",
          capacity: 50,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 14,
          name: "Classroom 5",
          capacity: 50,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 15,
          name: "Strength of Materials",
          capacity: 15,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 16,
          name: "SST New Classroom (Year 4)",
          capacity: 25,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 17,
          name: "Syndicate Room 1",
          capacity: 10,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 18,
          name: "Syndicate Room 2",
          capacity: 10,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
      ],
      TYD: [
        {
          id: 19,
          name: "Maiduguri",
          capacity: 50,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 20,
          name: "Ado-Ekiti",
          capacity: 50,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 21,
          name: "Jalingo",
          capacity: 80,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 22,
          name: "Zaria",
          capacity: 80,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 23,
          name: "Jos",
          capacity: 50,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 24,
          name: "Enugu",
          capacity: 50,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 25,
          name: "Uyo",
          capacity: 30,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 26,
          name: "Lokoja",
          capacity: 30,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 27,
          name: "Bauchi",
          capacity: 80,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.FAULTY,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [{ text: "Projector bulb is dim.", ts: Date.now() }],
        },
        {
          id: 28,
          name: "Oshogbo",
          capacity: 30,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 29,
          name: "Umuahia",
          capacity: 30,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 30,
          name: "Art and Graphics Studio",
          capacity: 65,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 31,
          name: "Newsroom",
          capacity: 30,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 32,
          name: "Port-Harcourt",
          capacity: 80,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 33,
          name: "Computer Lab 2",
          capacity: 60,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 34,
          name: "Computer Lab 1",
          capacity: 60,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 35,
          name: "Abeokuta",
          capacity: 30,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 36,
          name: "Abakaliki",
          capacity: 80,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 37,
          name: "Ibadan",
          capacity: 65,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 38,
          name: "Asaba",
          capacity: 65,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
        {
          id: 39,
          name: "TYD New classroom",
          capacity: 80,
          status: ROOM_STATUS.AVAILABLE,
          utilities: {
            projector: UTIL_STATE.WORKING,
            ac: UTIL_STATE.WORKING,
            power: UTIL_STATE.WORKING,
          },
          notes: [],
        },
      ],
    };
    // --- END OF UPDATE ---
    localStorage.setItem(CLASSROOM_KEY, JSON.stringify(classroomData));
  }
}

// --- Data Functions (UPDATED: Always try API first) ---

export async function getReservations() {
  // Always try API first (Bypassing status check)
  try {
    const dataFromApi = await api.getReservations();
    localStorage.setItem(RESERVATION_KEY, JSON.stringify(dataFromApi));
    console.log("Fetched reservations from API");
    return dataFromApi;
  } catch (error) {
    console.warn(
      "API failed to get reservations, falling back to local.",
      error
    );
    return getLocalReservations();
  }
}

export async function getClassroomData() {
  // Always try API first (Bypassing status check)
  try {
    const dataFromApi = await api.getClassrooms();
    localStorage.setItem(CLASSROOM_KEY, JSON.stringify(dataFromApi));
    console.log("Fetched classrooms from API");
    return dataFromApi;
  } catch (error) {
    console.warn("API failed to get classrooms, falling back to local.", error);
    return getLocalClassroomData();
  }
}

// --- Helper functions for local-only access ---

export function getLocalReservations() {
  console.log("Fetched reservations from LOCAL");
  return (
    JSON.parse(localStorage.getItem(RESERVATION_KEY)) || {
      pending: [],
      approved: [],
      denied: [],
    }
  );
}

export function getLocalClassroomData() {
  console.log("Fetched classrooms from LOCAL");
  return JSON.parse(localStorage.getItem(CLASSROOM_KEY)) || {};
}

// --- NEW FUNCTION to save classroom data locally ---
export function saveClassroomLocally(updatedClassroom) {
  const localData = getLocalClassroomData();

  let notFound = true;
  for (const location in localData) {
    if (localData[location]) {
      const index = localData[location].findIndex(
        (c) => c.id === updatedClassroom.id
      );
      if (index !== -1) {
        localData[location][index] = updatedClassroom;
        notFound = false;
        break;
      }
    }
  }

  if (notFound) {
    console.error("Could not find classroom in local storage to update.");
    return false;
  }

  localStorage.setItem(CLASSROOM_KEY, JSON.stringify(localData));
  return true;
}
// --- END NEW FUNCTION ---

export function formatDate(dateString) {
  if (!dateString || new Date(dateString).toString() === "Invalid Date") {
    return "Invalid Date";
  }
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
}
