import { auth } from '../lib/firebase';
import { createFetchWithAuth } from '@corner-click/api-client';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

export const fetchWithAuth = createFetchWithAuth(auth, API_URL);

