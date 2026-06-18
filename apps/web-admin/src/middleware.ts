import { defineMiddleware } from 'astro:middleware';
import { auth } from './lib/firebase';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Allow login page and static assets without authentication
  if (pathname === '/login' || pathname.startsWith('/_astro') || pathname.startsWith('/favicon')) {
    return next();
  }

  // Check if user is authenticated
  const user = auth.currentUser;

  if (!user) {
    // Redirect to login if not authenticated
    return context.redirect('/login');
  }

  // User is authenticated, proceed to the requested page
  return next();
});
