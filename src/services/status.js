// src/services/status.js
import { pingBackend } from "./apiService.js";

// This variable will be shared across our app
export let isBackendOnline = false;

// We REMOVED the setOfflineBanner function. App.jsx handles this.

// This is the main function we'll call on page load
export async function checkBackendStatus() {
  const isOnline = await pingBackend();

  if (isOnline) {
    console.log("Backend is ONLINE");
    isBackendOnline = true;
  } else {
    console.warn("Backend is OFFLINE. Using fallback storage.");
    isBackendOnline = false;
  }

  return isOnline; // This just returns true/false
}
