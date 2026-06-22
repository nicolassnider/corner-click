import type { Auth } from "firebase/auth";

export interface ApiClientConfig {
  auth: Auth;
  apiUrl: string;
}

import { enqueueTransaction } from "./queue";

export const createFetchWithAuth = (auth: Auth, apiUrl: string, defaultOfflineFirst = false) => {
  return async (url: string, options: RequestInit & { offlineFirst?: boolean } = {}) => {
    const targetUrl = url.startsWith("/") ? `${apiUrl}${url}` : url;

    // Firebase caches the user token and auto-refreshes it if expired
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : "";

    const headers = new Headers(options.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (
      options.body &&
      typeof options.body === "string" &&
      !headers.has("Content-Type")
    ) {
      headers.set("Content-Type", "application/json");
    }

    const isMutation = options.method && ["POST", "PUT", "DELETE", "PATCH"].includes(options.method.toUpperCase());
    const useOfflineQueue = options.offlineFirst ?? defaultOfflineFirst;

    if (useOfflineQueue && isMutation) {
      try {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          throw new Error("Offline");
        }
        const response = await fetch(targetUrl, { ...options, headers });
        if (!response.ok) {
           throw new Error(`HTTP ${response.status}`);
        }
        return response;
      } catch (err) {
        console.warn(`[Offline Sync] Network/Server failed for ${targetUrl}. Queueing transaction. Error:`, err);
        // Queue the transaction
        let bodyParsed = options.body;
        if (typeof options.body === "string") {
          try { bodyParsed = JSON.parse(options.body); } catch(e) {}
        }
        await enqueueTransaction(targetUrl, options.method || "POST", bodyParsed);
        // Return a mock successful response so the caller thinks it succeeded
        return new Response(JSON.stringify({ queued: true }), { status: 202, headers: { "Content-Type": "application/json" } });
      }
    }

    return fetch(targetUrl, {
      ...options,
      headers,
    });
  };
};

export * from "./queue";
