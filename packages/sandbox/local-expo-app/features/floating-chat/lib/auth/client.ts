import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { fetch as expoFetch } from 'expo/fetch'
import { AUTH_CONFIG } from './config'

// This is required for the AuthSession to work properly
WebBrowser.maybeCompleteAuthSession()

const STORAGE_KEY = 'capsule_session'

export interface User {
  id: string
  name: string
  email: string
  image?: string
}

export interface Session {
  user: User
  accessToken: string
  refreshToken?: string
  expiresAt: number
}

// Session storage helpers
export const sessionStorage = {
  async get(): Promise<Session | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY)
      if (!data) return null

      const session = JSON.parse(data) as Session

      // Check if session is expired
      if (session.expiresAt < Date.now()) {
        await this.clear()
        return null
      }

      return session
    } catch (error) {
      console.error('[Session] Error getting session:', error)
      return null
    }
  },

  async set(session: Session): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } catch (error) {
      console.error('[Session] Error saving session:', error)
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('[Session] Error clearing session:', error)
    }
  },
}

// Create the redirect URI for OAuth callbacks
export const makeRedirectUri = () => {
  return AuthSession.makeRedirectUri({
    scheme: AUTH_CONFIG.scheme,
    path: 'auth-callback',
  })
}

// Google OAuth discovery
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
}

// Sign in with Google using AuthSession
export const useGoogleAuth = () => {
  // Create the Expo Go return URL that the backend will redirect back to
  const expoReturnUrl = AuthSession.makeRedirectUri({
    scheme: AUTH_CONFIG.scheme,
    path: 'auth-callback',
  })

  // Use the web callback URL for Google OAuth (Google doesn't accept exp:// URLs)
  // Our backend will handle the OAuth callback and redirect back to the app
  const redirectUri = `${AUTH_CONFIG.baseUrl}/api/auth/callback/mobile`

  // Encode the return URL in the state parameter so the backend knows where to redirect
  const state = JSON.stringify({
    returnUrl: expoReturnUrl,
  })

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: AUTH_CONFIG.googleClientId,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      // PKCE is enabled by default, but we can explicitly configure it
      usePKCE: true,
      state,
    },
    discovery
  )

  return { request, response, promptAsync, redirectUri }
}

// Exchange auth code for session
export const exchangeCodeForSession = async (code: string, redirectUri: string, codeVerifier: string): Promise<Session> => {
  console.log('[Auth] Exchanging code for session...')
  console.log('[Auth] Code:', code)
  console.log('[Auth] Redirect URI:', redirectUri)
  console.log('[Auth] Code Verifier:', codeVerifier)

  try {
    // Call our custom endpoint to exchange the code for tokens
    const response = await expoFetch(`${AUTH_CONFIG.baseUrl}/api/auth/exchange-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirectUri,
        codeVerifier,
      }),
    })

    console.log('[Auth] Exchange response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Auth] Exchange failed:', errorText)
      console.error('[Auth] Response status:', response.status)
      console.error('[Auth] Response headers:', Object.fromEntries(response.headers.entries()))

      // Try to parse as JSON for better error details
      try {
        const errorJson = JSON.parse(errorText)
        console.error('[Auth] Error details:', errorJson)
        throw new Error(`Failed to exchange code: ${errorJson.error || response.status}`)
      } catch (parseErr) {
        throw new Error(`Failed to exchange code: ${response.status} - ${errorText}`)
      }
    }

    const data = await response.json()
    console.log('[Auth] Exchange successful!')
    console.log('[Auth] User:', data.user)
    console.log('[Auth] Has access token:', !!data.accessToken)

    // Create session from response
    const session: Session = {
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + (data.expiresIn || 3600) * 1000,
    }

    // Store the session
    console.log('[Auth] Storing session...')
    await sessionStorage.set(session)
    console.log('[Auth] Session stored successfully!')

    return session
  } catch (error) {
    console.error('[Auth] Exchange error:', error)
    console.error('[Auth] Error type:', typeof error)
    console.error('[Auth] Error message:', error instanceof Error ? error.message : String(error))
    throw error
  }
}

// Fetch current session from Better Auth backend
export const fetchSession = async (accessToken: string): Promise<User | null> => {
  try {
    const response = await expoFetch(`${AUTH_CONFIG.baseUrl}/api/auth/session`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.user
  } catch (error) {
    console.error('[Auth] Error fetching session:', error)
    return null
  }
}

// Sign out
export const signOut = async () => {
  try {
    console.log('[Auth] Starting sign out...')
    const session = await sessionStorage.get()
    console.log('[Auth] Current session:', session ? 'exists' : 'null')

    if (session?.accessToken) {
      console.log('[Auth] Calling sign-out endpoint...')
      // Call Better Auth sign out endpoint
      try {
        const response = await expoFetch(`${AUTH_CONFIG.baseUrl}/api/auth/sign-out`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        })
        console.log('[Auth] Sign-out endpoint response:', response.status)
      } catch (endpointError) {
        console.error('[Auth] Sign-out endpoint error (continuing anyway):', endpointError)
        // Continue to clear local session even if endpoint fails
      }
    }

    // Clear local session
    console.log('[Auth] Clearing local session...')
    await sessionStorage.clear()
    console.log('[Auth] Local session cleared')

    return { success: true }
  } catch (error) {
    console.error('[Auth] Sign out error:', error)
    await sessionStorage.clear() // Clear local session anyway
    return { success: false, error }
  }
}

// Get current session
export const getSession = async (): Promise<Session | null> => {
  return await sessionStorage.get()
}
