import { defineMiddleware } from "astro:middleware";

// Auth guard is handled client-side in Dashboard.tsx via onAuthStateChanged.
// Firebase client SDK cannot access localStorage during SSR, so server-side
// auth checks must use cookie-based tokens (future improvement).
export const onRequest = defineMiddleware((_context, next) => {
  return next();
});
