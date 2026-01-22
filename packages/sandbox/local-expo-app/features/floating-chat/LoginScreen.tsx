// IMPORTANT: DO NOT DELETE OR EDIT THIS COMPONENT  is part of capsule app core
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useGoogleAuth, exchangeCodeForSession } from './lib/auth/client'
import { useAuth } from '@/contexts/AuthContext'
import { X } from 'lucide-react-native'

interface LoginScreenProps {
  onClose: () => void
}

export function LoginScreen({ onClose }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { request, response, promptAsync, redirectUri } = useGoogleAuth()
  const { refreshSession } = useAuth()

  // Log the auth request when it's created
  useEffect(() => {
    if (request) {
      console.log('[LoginScreen] Auth request created!')
      console.log('[LoginScreen] Auth URL:', request.url)
      console.log('[LoginScreen] Redirect URI:', redirectUri)
    }
  }, [request, redirectUri])

  // Handle the OAuth response
  useEffect(() => {
    console.log('[LoginScreen] OAuth response received:', JSON.stringify(response, null, 2))

    if (response?.type === 'success') {
      console.log('[LoginScreen] OAuth success!')
      console.log('[LoginScreen] Response params:', response.params)

      // Check if we have a code in the params
      if (response.params?.code) {
        handleOAuthSuccess(response.params.code)
      } else {
        console.error('[LoginScreen] No code in response params:', response.params)
        setError('No authorization code received')
        setIsLoading(false)
      }
    } else if (response?.type === 'error') {
      console.error('[LoginScreen] OAuth error:', response.error)
      setError(response.error?.message || 'Authentication failed')
      setIsLoading(false)
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      console.log('[LoginScreen] OAuth cancelled or dismissed')
      setIsLoading(false)
    } else if (response) {
      console.log('[LoginScreen] Unexpected response type:', response.type)
      setIsLoading(false)
    }
  }, [response])

  const handleOAuthSuccess = async (code: string) => {
    try {
      console.log('[LoginScreen] Exchanging code for session...')
      setIsLoading(true)

      // Get the code verifier from the request (needed for PKCE)
      const codeVerifier = request?.codeVerifier
      if (!codeVerifier) {
        throw new Error('Code verifier not found in auth request')
      }

      console.log('[LoginScreen] Code verifier:', codeVerifier)

      // Exchange the code for a session
      await exchangeCodeForSession(code, redirectUri, codeVerifier)

      // Refresh the session in the context
      await refreshSession()

      console.log('[LoginScreen] User logged in successfully!')
    } catch (err) {
      console.error('[LoginScreen] Error during code exchange:', err)
      setError(err instanceof Error ? err.message : 'Failed to complete sign in')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log('[LoginScreen] Starting OAuth flow...')

      // Prompt the user to authenticate
      await promptAsync()
    } catch (err) {
      console.error('[LoginScreen] Login error:', err)
      setError(err instanceof Error ? err.message : 'Failed to sign in')
      setIsLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Header with title and close button */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Welcome to Capsule Dot</Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          activeOpacity={0.7}
        >
          <X size={22} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Sign in to access your projects and chat
        </Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>Sign in with Google</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    backgroundColor: 'black',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonIcon: {
    fontSize: 20,
    fontWeight: '700',
    marginRight: 12,
    backgroundColor: '#fff',
    color: 'rgba(0,0,0,0.8)',
    width: 32,
    height: 32,
    borderRadius: 16,
    textAlign: 'center',
    lineHeight: 32,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
    textAlign: 'center',
  },
})
