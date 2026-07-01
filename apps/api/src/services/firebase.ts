import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'
import { getFirestore } from 'firebase-admin/firestore'
import settings from '../config/settings.js'

if (process.env.USE_FIREBASE_EMULATOR === 'true') {
  try {
    initializeApp({
      projectId: 'demo-corner-click',
      databaseURL: 'http://127.0.0.1:9000/?ns=demo-corner-click',
    })
    console.log('Firebase Admin initialized for Emulator.')
  } catch (err: unknown) {
    console.error('Error initializing Firebase Admin Emulator:', (err as Error).message)
  }
} else if (
  settings.firebase.projectId &&
  settings.firebase.privateKey &&
  settings.firebase.clientEmail
) {
  try {
    initializeApp({
      credential: cert({
        projectId: settings.firebase.projectId,
        clientEmail: settings.firebase.clientEmail,
        privateKey: settings.firebase.privateKey,
      }),
      databaseURL: settings.firebase.databaseURL,
    })
    console.log('Firebase Admin initialized successfully.')
  } catch (err: unknown) {
    console.error('Error initializing Firebase Admin:', (err as Error).message)
  }
} else {
  console.warn('⚠️  Firebase Admin initialization skipped due to missing credentials.')
}

export const db = getApps().length > 0 ? getFirestore() : null
export const auth = getApps().length > 0 ? getAuth() : null
export const rtdb = getApps().length > 0 ? getDatabase() : null
