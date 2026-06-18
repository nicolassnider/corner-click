import { auth } from '../lib/firebase';

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
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

  return fetch(url, {
    ...options,
    headers
  });
};
