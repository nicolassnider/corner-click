export interface FirebaseSettings {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
  databaseURL?: string;
}

export interface Settings {
  port: string | number;
  firebase: FirebaseSettings;
}

const settings: Settings = {
  port: process.env.PORT || 4000,
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY 
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
      : undefined,
    databaseURL: process.env.FIREBASE_DATABASE_URL
  }
};

if (!settings.firebase.projectId || !settings.firebase.privateKey || !settings.firebase.clientEmail) {
  console.warn('⚠️  WARNING: Firebase credentials are not fully configured in the environment variables.');
}

export default settings;
