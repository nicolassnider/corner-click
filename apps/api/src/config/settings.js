// Settings Pattern
// Centralizes configuration and avoids scattered process.env calls

const settings = {
  port: process.env.PORT || 4000,
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Handle the private key properly by replacing literal \n with actual newlines
    privateKey: process.env.FIREBASE_PRIVATE_KEY 
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
      : undefined,
    databaseURL: process.env.FIREBASE_DATABASE_URL
  }
};

// Validate critical settings
if (!settings.firebase.projectId || !settings.firebase.privateKey || !settings.firebase.clientEmail) {
  console.warn('⚠️  WARNING: Firebase credentials are not fully configured in the environment variables.');
}

module.exports = settings;
