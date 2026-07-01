export interface FirebaseSettings {
  projectId?: string
  clientEmail?: string
  privateKey?: string
  databaseURL?: string
}

export interface AppSettings {
  name: string
  version: string
  description: string
  apiPrefix: string
  environment: string
  isVercel: boolean
  isRender: boolean
}

export interface Settings {
  port: string | number
  app: AppSettings
  firebase: FirebaseSettings
  redis: {
    url?: string
  }
}

const settings: Settings = {
  port: process.env.PORT || 4000,
  app: {
    name: 'Corner Click API',
    version: '1.0.0',
    description: 'Backend API for the Corner Click Taekwondo Scoring System',
    apiPrefix: '/api',
    environment: process.env.NODE_ENV || 'development',
    isVercel: !!process.env.VERCEL,
    isRender: !!process.env.RENDER,
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
}

if (
  !settings.firebase.projectId ||
  !settings.firebase.privateKey ||
  !settings.firebase.clientEmail
) {
  console.warn(
    '⚠️  WARNING: Firebase credentials are not fully configured in the environment variables.'
  )
}

export default settings
