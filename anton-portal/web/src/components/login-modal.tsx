import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthModal } from '@/context/auth-modal-context'
import { authClient } from '@/lib/auth-client'

export function LoginModal() {
  const { loginOpen, closeLogin } = useAuthModal()
  const navigate = useNavigate()
  const titleId = useId()
  const { data: session } = authClient.useSession()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!loginOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [loginOpen])

  useEffect(() => {
    if (!loginOpen || !session?.user) return
    closeLogin()
    navigate('/dashboard', { replace: true })
  }, [loginOpen, session?.user, closeLogin, navigate])

  useEffect(() => {
    if (!loginOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLogin()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loginOpen, closeLogin])

  async function onGoogle() {
    setError(null)
    setLoading(true)
    try {
      const { error: err } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/dashboard',
      })
      if (err) {
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : ''
        const msg = err.message ?? 'Google sign-in failed'
        if (
          code === 'PROVIDER_NOT_FOUND' ||
          msg.toLowerCase().includes('provider not found')
        ) {
          setError(
            'Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to auth-server/.env, then restart the auth server (port 3005).',
          )
        } else {
          setError(msg)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name || (email.split('@')[0] ?? 'User'),
        })
        if (err) {
          setError(err.message ?? 'Sign up failed')
          return
        }
      } else {
        const { error: err } = await authClient.signIn.email({
          email,
          password,
        })
        if (err) {
          setError(err.message ?? 'Sign in failed')
          return
        }
      }
      closeLogin()
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (!loginOpen) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-md"
        aria-label="Close sign-in"
        onClick={() => closeLogin()}
      />
      <Card
        className="relative z-10 w-full max-w-md border-border/80 bg-card/95 shadow-2xl backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 rounded-full text-muted-foreground hover:text-foreground"
          onClick={() => closeLogin()}
          aria-label="Close"
        >
          <X className="size-4" />
        </Button>
        <CardHeader className="pr-12">
          <CardTitle
            id={titleId}
            className="text-2xl font-normal"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Email and password — stored securely with Better Auth in MongoDB.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full border-border/80 bg-background/50"
            disabled={loading}
            onClick={() => void onGoogle()}
          >
            <svg
              className="mr-2 size-4 shrink-0"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>
          <p className="text-center text-xs text-muted-foreground">or</p>
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="login-modal-name">Name</Label>
                <Input
                  id="login-modal-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="login-modal-email">Email</Label>
              <Input
                id="login-modal-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-modal-password">Password</Label>
              <Input
                id="login-modal-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={
                  mode === 'signup' ? 'new-password' : 'current-password'
                }
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
            </Button>
          </form>
          <button
            type="button"
            className="mt-2 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
            }}
          >
            {mode === 'signin'
              ? 'Need an account? Sign up'
              : 'Have an account? Sign in'}
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
