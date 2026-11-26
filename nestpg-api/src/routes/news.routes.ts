import { Router } from 'express'

const router = Router()
const CACHE_MS = 10 * 60 * 1000
const MIN_UPSTREAM_INTERVAL_MS = 5 * 1000
const cache = new Map<string, { expiresAt: number; fetchedAt: string; articles: unknown[] }>()
const inFlight = new Map<string, Promise<{ articles: unknown[]; fetchedAt: string }>>()
let upstreamQueue: Promise<void> = Promise.resolve()
let lastUpstreamRequestAt = 0
const allowedLocalities = new Set(['Koramangala', 'HSR Layout', 'BTM Layout', 'Whitefield', 'Electronic City', 'Marathahalli', 'Indiranagar'])

function loadArticles(query: string) {
  const existing = inFlight.get(query)
  if (existing) return existing

  const request = upstreamQueue.then(async () => {
    const waitMs = MIN_UPSTREAM_INTERVAL_MS - (Date.now() - lastUpstreamRequestAt)
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs))

    lastUpstreamRequestAt = Date.now()
    const params = new URLSearchParams({ query, mode: 'artlist', format: 'json', maxrecords: '50', sort: 'datedesc' })
    const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(19000),
    })
    const responseBody = await response.text()
    if (!response.ok) {
      throw new Error(`GDELT returned HTTP ${response.status}: ${responseBody.slice(0, 500)}`)
    }
    let data: { articles?: unknown }
    try {
      data = JSON.parse(responseBody) as { articles?: unknown }
    } catch {
      throw new Error(`GDELT returned a non-JSON response (HTTP ${response.status}): ${responseBody.slice(0, 500)}`)
    }
    if (!Array.isArray(data.articles)) throw new Error('GDELT returned an unexpected response')

    const fetchedAt = new Date().toISOString()
    const result = { articles: data.articles, fetchedAt }
    cache.set(query, { expiresAt: Date.now() + CACHE_MS, ...result })
    return result
  })

  upstreamQueue = request.then(() => undefined, () => undefined)
  inFlight.set(query, request)
  request.then(() => inFlight.delete(query), () => inFlight.delete(query))
  return request
}

router.get('/', async (req, res) => {
  const locality = typeof req.query.locality === 'string' ? req.query.locality : ''
  if (locality && !allowedLocalities.has(locality)) {
    res.status(400).json({ message: 'Unsupported Bangalore locality' })
    return
  }

  const query = locality ? `"${locality}" AND (Bangalore OR Bengaluru)` : '(Bangalore OR Bengaluru)'
  const cached = cache.get(query)
  if (cached && cached.expiresAt > Date.now()) {
    res.setHeader('X-News-Cache', 'HIT')
    res.json({ articles: cached.articles, fetchedAt: cached.fetchedAt })
    return
  }

  try {
    const result = await loadArticles(query)
    res.setHeader('X-News-Cache', 'MISS')
    res.json(result)
  } catch (error) {
    console.error('[news] GDELT request failed:', error)
    if (error instanceof Error && error.message.includes('GDELT returned HTTP 429')) {
      res.setHeader('Retry-After', '5')
      res.status(503).json({ message: 'GDELT is limiting requests. Please wait a few seconds and try again.' })
      return
    }
    res.status(502).json({ message: 'News is temporarily unavailable. Please try again shortly.' })
  }
})

export default router
