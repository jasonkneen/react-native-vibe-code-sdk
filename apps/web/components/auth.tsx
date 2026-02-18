'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authClient, signInWithGoogle } from '@/lib/auth/client'
import { AlertCircle, Loader2, Mail } from 'lucide-react'
import React, { useState } from 'react'
import * as SimpleIcons from 'simple-icons'

interface AuthProps {
  onSuccess?: () => void
  onError?: (error: string) => void
  callbackURL?: string
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      dangerouslySetInnerHTML={{ __html: SimpleIcons.siGoogle.svg }}
    />
  )
}

const enableEmailAuth = process.env.NEXT_PUBLIC_ENABLE_EMAIL_AUTH === 'true'

export default function Auth({ onSuccess, onError, callbackURL }: AuthProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState('')

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await signInWithGoogle(callbackURL)
      if (result?.error) {
        throw new Error(result.error.message || 'Failed to sign in with Google')
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err)
      const errorMessage = err.message || 'Failed to sign in with Google'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)

      if (isSignUp) {
        const result = await authClient.signUp.email({
          email,
          password,
          name: name || email.split('@')[0],
          callbackURL: callbackURL || '/',
        })
        if (result?.error) throw new Error(result.error.message || 'Failed to sign up')
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
          callbackURL: callbackURL || '/',
        })
        if (result?.error) throw new Error(result.error.message || 'Invalid email or password')
      }

      onSuccess?.()
    } catch (err: any) {
      const errorMessage = err.message || 'Authentication failed'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground">
          Sign in to continue to your account
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {enableEmailAuth ? (
        <form onSubmit={handleEmailAuth} className="space-y-3">
          {isSignUp && (
            <Input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <Button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create account' : 'Sign in with Email')}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
              className="underline hover:text-foreground transition-colors"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </form>
      ) : (
        <Button
          onClick={handleGoogleSignIn}
          disabled={loading}
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-4 w-4" />}
          {loading ? 'Signing in...' : 'Continue with Google'}
        </Button>
      )}

      <p className="text-xs text-center text-muted-foreground">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  )
}
