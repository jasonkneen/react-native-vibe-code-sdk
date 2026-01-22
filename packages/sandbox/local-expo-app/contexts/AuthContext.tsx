import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { getSession, Session, User } from '@/features/floating-chat/lib/auth/client'

interface AuthContextType {
  session: Session | null
  isLoading: boolean
  user: User | null
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshSession = async () => {
    try {
      setIsLoading(true)
      const currentSession = await getSession()
      setSession(currentSession)
    } catch (error) {
      console.error('[AuthContext] Error refreshing session:', error)
      setSession(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshSession()

    // Refresh session every minute to check expiry
    const interval = setInterval(refreshSession, 60000)
    return () => clearInterval(interval)
  }, [])

  const value = {
    session,
    isLoading,
    user: session?.user || null,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
