const API_BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export async function trackEvent(
  bearerToken: string,
  name: string,
  properties?: Record<string, unknown>,
) {
  const res = await fetch(`${API_BASE}/analytics/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify({ name, properties: properties ?? {} }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `track failed: ${res.status}`)
  }
  return res.json() as Promise<{ id: string }>
}

export async function fetchAnalyticsSummary(bearerToken: string) {
  const res = await fetch(`${API_BASE}/analytics/summary`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{
    total_events: number
    by_name: { _id: string; count: number }[]
  }>
}
