const admin = require('firebase-admin');
const settings = require('../config/settings');

// Initialize Firebase Admin
if (settings.firebase.projectId && settings.firebase.privateKey && settings.firebase.clientEmail) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: settings.firebase.projectId,
      clientEmail: settings.firebase.clientEmail,
      privateKey: settings.firebase.privateKey,
    }),
    databaseURL: settings.firebase.databaseURL
  });
  console.log('Firebase Admin initialized successfully.');
} else {
  console.warn('⚠️  Firebase Admin initialization skipped due to missing credentials.');
}

const db = admin.apps.length ? admin.firestore() : null;
const auth = admin.apps.length ? admin.auth() : null;

module.exports = {
  admin,
  db,
  auth
};
