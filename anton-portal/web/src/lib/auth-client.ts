import { jwtClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

const authBaseURL = 'https://anton-anton-auth.hrvnvm.easypanel.host'

export const authClient = createAuthClient({
  baseURL: authBaseURL,
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [jwtClient()],
})
