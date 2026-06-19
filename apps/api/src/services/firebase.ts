import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import settings from '../config/settings.js';

if (settings.firebase.projectId && settings.firebase.privateKey && settings.firebase.clientEmail) {
  try {
    initializeApp({
      credential: cert({
        projectId: settings.firebase.projectId,
        clientEmail: settings.firebase.clientEmail,
        privateKey: settings.firebase.privateKey,
      }),
      databaseURL: settings.firebase.databaseURL
    });
    console.log('Firebase Admin initialized successfully.');
  } catch (err: any) {
    console.error('Error initializing Firebase Admin:', err.message);
  }
} else {
  console.warn('⚠️  Firebase Admin initialization skipped due to missing credentials.');
}

export const db = getApps().length > 0 ? getFirestore() : null;
export const auth = getApps().length > 0 ? getAuth() : null;
export const rtdb = getApps().length > 0 ? getDatabase() : null;
