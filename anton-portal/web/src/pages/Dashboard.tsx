import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchAnalyticsSummary, trackEvent } from '@/lib/api'
import { authClient } from '@/lib/auth-client'

export function Dashboard() {
  const { data: session, isPending } = authClient.useSession()
  const [token, setToken] = useState<string | null>(null)
  const [summary, setSummary] = useState<{
    total_events: number
    by_name: { _id: string; count: number }[]
  } | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user) return
    let cancelled = false
    void (async () => {
      const { data, error } = await authClient.token()
      if (cancelled) return
      if (error || !data?.token) {
        setApiError(error?.message ?? 'Could not load API token')
        return
      }
      setToken(data.token)
    })()
    return () => {
      cancelled = true
    }
  }, [session?.user])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    void (async () => {
      try {
        await trackEvent(token, 'dashboard_open', {
          path: '/dashboard',
        })
      } catch (e) {
        if (!cancelled)
          setApiError(e instanceof Error ? e.message : 'Analytics failed')
      }
      try {
        const s = await fetchAnalyticsSummary(token)
        if (!cancelled) setSummary(s)
      } catch (e) {
        if (!cancelled)
          setApiError(e instanceof Error ? e.message : 'Summary failed')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading session…
      </div>
    )
  }

  if (!session?.user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-normal"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Anton workspace
            </h1>
            <p className="text-sm text-muted-foreground">
              Signed in as {session.user.email ?? session.user.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/">Home</Link>
            </Button>
            <Button
              variant="ghost"
              onClick={() => void authClient.signOut({ fetchOptions: { credentials: 'include' } })}
            >
              Sign out
            </Button>
          </div>
        </div>

        {/* Thank you card with feature image */}
        <Card className="overflow-hidden">
          <div className="relative h-48 w-full overflow-hidden">
            <img
              src="/feature2.jpg"
              alt="Thank you"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h2
                className="text-2xl font-normal text-white"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Welcome to the future of work
              </h2>
            </div>
          </div>
          <CardContent className="p-6">
            <p className="text-lg leading-relaxed text-foreground">
              Thank you <span className="font-medium">{session.user.name || session.user.email?.split('@')[0] || 'there'}</span> for joining the Anton waitlist. 
              We're building something profound: a single space where your agent, files, and context breathe together—
              without turning work into a slot machine. Your attention deserves a shoreline.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product analytics</CardTitle>
            <p className="text-sm text-muted-foreground">
              Events stored in MongoDB via the Python API, authorized with your
              Better Auth JWT.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {apiError && (
              <output className="block text-sm text-amber-200">{apiError}</output>
            )}
            {summary ? (
              <>
                <p className="text-lg">
                  Total events:{' '}
                  <span className="font-medium text-foreground">
                    {summary.total_events}
                  </span>
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {summary.by_name.map((row) => (
                    <li
                      key={row._id}
                      className="flex justify-between border-b border-border/50 py-1"
                    >
                      <span>{row._id}</span>
                      <span>{row.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              !apiError && <p className="text-sm text-muted-foreground">Loading…</p>
            )}
            {token && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void trackEvent(token, 'button_ping', {
                    at: new Date().toISOString(),
                  }).then(() =>
                    fetchAnalyticsSummary(token).then(setSummary).catch(console.error),
                  )
                }
              >
                Send test event
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
