import { auth } from "../lib/firebase";
import { createFetchWithAuth, syncOfflineQueue } from "@corner-click/api-client";

const CONFIGURED_API_URL =
  import.meta.env.PUBLIC_API_URL || "http://localhost:4000";

export const getDynamicApiUrl = (configuredUrl: string): string => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname);

    if (isLocal) {
      if (window.location.port === "4321" || window.location.port === "4322") {
        return `http://${hostname}:4000`;
      }
      return window.location.origin;
    }
  }
  return configuredUrl;
};

export const API_URL = getDynamicApiUrl(CONFIGURED_API_URL);

// Pass true to enable offline-first queueing for mutations in the judge UI
export const fetchWithAuth = createFetchWithAuth(auth, API_URL, true);

if (typeof window !== "undefined") {
  window.addEventListener('online', () => {
    console.log('[Network] Back online, syncing queue...');
    syncOfflineQueue(fetchWithAuth);
  });
}
