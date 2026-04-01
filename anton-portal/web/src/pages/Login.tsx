import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuthModal } from '@/context/auth-modal-context'
import { authClient } from '@/lib/auth-client'

/** Sends users home and opens the sign-in modal over the hero (no full-page login). */
export function Login() {
  const navigate = useNavigate()
  const { openLogin } = useAuthModal()
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (isPending) return
    if (session?.user) {
      navigate('/dashboard', { replace: true })
      return
    }
    openLogin()
    navigate('/', { replace: true })
  }, [isPending, session?.user, openLogin, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      Loading…
    </div>
  )
}
