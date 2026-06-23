import { initializeApp } from "firebase/app";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.PUBLIC_FIREBASE_DATABASE_URL || "http://127.0.0.1:9000/?ns=demo-corner-click",
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID || "demo-corner-click",
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:1234567890",
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const auth = getAuth(app);

if (import.meta.env.PUBLIC_USE_EMULATOR === "true") {
  connectDatabaseEmulator(database, "127.0.0.1", 9000);
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
}
