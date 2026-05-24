import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in'
import { GoogleAuthProvider, signInWithCredential, type UserCredential } from 'firebase/auth'
import { auth } from '@/infra/cloud/firebase'

let initializedClientId: string | null = null

function getGoogleWebClientId(): string | undefined {
  return import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined
}

export async function signInWithNativeGoogle(): Promise<UserCredential> {
  if (!auth) {
    throw new Error('Firebase belum dikonfigurasi. Tambahkan VITE_FIREBASE_* ke .env.local')
  }

  const clientId = getGoogleWebClientId()
  if (!clientId) {
    throw new Error(
      'Google Login APK belum lengkap. Tambahkan VITE_GOOGLE_WEB_CLIENT_ID, lalu pastikan SHA-1/SHA-256 dan OAuth client Android sudah diset di Firebase Console.',
    )
  }

  if (initializedClientId !== clientId) {
    await GoogleSignIn.initialize({ clientId })
    initializedClientId = clientId
  }

  const result = await GoogleSignIn.signIn()
  if (!result.idToken) {
    throw new Error('Google idToken tidak ditemukan dari native sign-in.')
  }

  const credential = GoogleAuthProvider.credential(result.idToken)
  return signInWithCredential(auth, credential)
}

export async function signOutNativeGoogle(): Promise<void> {
  await GoogleSignIn.signOut()
}
