import { jwtClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

const authBaseURL = import.meta.env.VITE_AUTH_URL || (typeof window !== 'undefined' ? window.location.origin : '')

export const authClient = createAuthClient({
  baseURL: authBaseURL,
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [jwtClient()],
})
