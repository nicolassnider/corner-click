import type { Auth } from 'firebase/auth';

export interface ApiClientConfig {
  auth: Auth;
  apiUrl: string;
}

export const createFetchWithAuth = (auth: Auth, apiUrl: string) => {
  return async (url: string, options: RequestInit = {}) => {
    const targetUrl = url.startsWith('/') ? `${apiUrl}${url}` : url;
    
    // Firebase caches the user token and auto-refreshes it if expired
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : '';

    const headers = new Headers(options.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Ensure Content-Type is set for JSON requests if not already set and body exists
    if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(targetUrl, {
      ...options,
      headers
    });
  };
};
