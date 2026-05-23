/**
 * Inisialisasi Firebase — guard bila env var tidak dikonfigurasi.
 * App tetap berjalan offline-first meski Firebase belum dikonfigurasi.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

/**
 * true jika env var minimum (apiKey + projectId) sudah diisi.
 * Gunakan sebagai guard sebelum memanggil service cloud.
 * Tidak memerlukan storageBucket karena backup disimpan langsung di Firestore.
 */
export const isFirebaseConfigured: boolean =
  !!firebaseConfig.apiKey && !!firebaseConfig.projectId

let app: FirebaseApp | null = null
let auth: Auth | null = null
let firestore: Firestore | null = null

if (isFirebaseConfigured) {
  // Safe cast: semua properti sudah dijamin string oleh guard di atas
  app = initializeApp(firebaseConfig as Record<string, string>)
  auth = getAuth(app)
  firestore = getFirestore(app)
}

export { app, auth, firestore }
