/**
 * AuthService — Google OAuth via Firebase Auth.
 * Login bersifat OPSIONAL. Tidak ada fitur kasir yang bergantung pada login.
 */
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth } from '@/infra/cloud/firebase'
import { isAndroidNative } from '@/native/platform'
import { signInWithNativeGoogle, signOutNativeGoogle } from '@/native/googleSignIn'

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

function mapUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  }
}

export class AuthService {
  /**
   * Buka popup Google Sign-In.
   * Lempar Error jika Firebase belum dikonfigurasi.
   */
  async signInWithGoogle(): Promise<AuthUser> {
    if (!auth) {
      throw new Error('Firebase belum dikonfigurasi. Tambahkan VITE_FIREBASE_* ke .env.local')
    }

    if (isAndroidNative()) {
      try {
        const result = await signInWithNativeGoogle()
        return mapUser(result.user)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Google Login APK gagal.'
        throw new Error(
          `${message} Jika konfigurasi native belum lengkap, cek VITE_GOOGLE_WEB_CLIENT_ID, SHA-1/SHA-256, dan OAuth client Android di Firebase Console.`,
        )
      }
    }

    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    return mapUser(result.user)
  }

  async signOut(): Promise<void> {
    if (!auth) return
    if (isAndroidNative()) {
      await signOutNativeGoogle().catch(() => undefined)
    }
    await firebaseSignOut(auth)
  }

  getCurrentUser(): AuthUser | null {
    if (!auth?.currentUser) return null
    return mapUser(auth.currentUser)
  }

  /**
   * Subscribe perubahan status auth.
   * Mengembalikan fungsi unsubscribe.
   * Bila Firebase tidak dikonfigurasi, langsung callback(null) dan tidak subscribe.
   */
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    if (!auth) {
      callback(null)
      return () => undefined
    }
    return firebaseOnAuthStateChanged(auth, (user) => {
      callback(user ? mapUser(user) : null)
    })
  }
}

export const authService = new AuthService()
