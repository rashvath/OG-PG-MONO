import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowLeft, ArrowRight, Clock3, MapPin, RefreshCw, Search, Newspaper } from 'lucide-react'
import { Link } from 'react-router-dom'

type Article = {
  title?: string
  url?: string
  seendate?: string
  domain?: string
  sourcecountry?: string
  socialimage?: string
  language?: string
}

const categories = [
  'All News', 'Bangalore City', 'Metro & Transport', 'Traffic Updates', 'Jobs & Careers',
  'Education', 'Weather & Safety', 'Lifestyle & Events', 'PG & Rental News',
]
const localities = ['Koramangala', 'HSR Layout', 'BTM Layout', 'Whitefield', 'Electronic City', 'Marathahalli', 'Indiranagar']
const categoryTerms: Record<string, string[]> = {
  'Bangalore City': ['bangalore', 'bengaluru'],
  'Metro & Transport': ['metro', 'namma metro', 'rail', 'bus', 'transport', 'airport', 'tunnel'],
  'Traffic Updates': ['traffic', 'road', 'congestion', 'flyover', 'commute'],
  'Jobs & Careers': ['job', 'career', 'hiring', 'recruitment', ' ಉದ್ಯೋಗ'],
  Education: ['education', 'school', 'college', 'university', 'exam', 'neet', 'kpsc', 'upsc'],
  'Weather & Safety': ['weather', 'rain', 'safety', '警', 'fire', '事故', 'accident'],
  'Lifestyle & Events': ['event', 'festival', 'food', 'culture', 'concert', 'lifestyle', 'drama'],
  'PG & Rental News': ['rental', 'tenant', 'deposit', 'housing', 'accommodation', 'paying guest', 'pg '],
}
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1'

function categoryFor(article: Article) {
  const text = `${article.title ?? ''} ${article.url ?? ''}`.toLowerCase()
  for (const name of categories.slice(1)) {
    if (categoryTerms[name].some((term) => text.includes(term))) return name
  }
  return text.includes('bangalore') || text.includes('bengaluru') ? 'Bangalore City' : 'Other coverage'
}

function formatDate(value?: string) {
  if (!value) return 'Date unavailable'
  const parsed = /^\d{8}T\d{6}Z$/.test(value)
    ? new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`)
    : new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed)
}

function safeArticleUrl(value?: string) {
  if (!value) return undefined
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined } catch { return undefined }
}

function NewsCard({ article, featured = false }: { article: Article; featured?: boolean }) {
  const image = safeArticleUrl(article.socialimage)
  const url = safeArticleUrl(article.url)
  return (
    <article className={`bulletin-card${featured ? ' bulletin-featured-card' : ''}`}>
      {image ? <img className="bulletin-card-image" src={image} alt="" loading="lazy" onError={(event) => { const fallback = document.createElement('div'); fallback.className = 'bulletin-image-fallback'; fallback.textContent = 'Bangalore Bulletin'; event.currentTarget.replaceWith(fallback) }} /> : <div className="bulletin-image-fallback"><Newspaper size={30} /><span>Bangalore Bulletin</span></div>}
      <div className="bulletin-card-copy">
        <span className="bulletin-category">{categoryFor(article)}</span>
        <h2>{article.title || 'Untitled article'}</h2>
        <div className="bulletin-meta"><span>{article.domain || 'Publisher unavailable'}</span><span>{formatDate(article.seendate)}</span></div>
        {url ? <a className="bulletin-read-link" href={url} target="_blank" rel="noopener noreferrer">{featured ? 'Read full story' : 'Read article'} <ArrowDownRight size={16} /></a> : <span className="bulletin-unavailable">Original link unavailable</span>}
      </div>
    </article>
  )
}

export function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [fetchedAt, setFetchedAt] = useState('')
  const [category, setCategory] = useState('All News')
  const [search, setSearch] = useState('')
  const [locality, setLocality] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [visibleCount, setVisibleCount] = useState(9)

  const refresh = useCallback(async (force = false) => {
    if (force) setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (locality) params.set('locality', locality)
      const response = await fetch(`${API_BASE}/news?${params.toString()}`, { headers: { Accept: 'application/json' } })
      if (!response.ok) {
        const failure = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(failure.message || 'News is temporarily unavailable. Please try again shortly.')
      }
      const data = await response.json() as { articles?: Article[]; fetchedAt?: string }
      const unique = new Map<string, Article>()
      for (const article of Array.isArray(data.articles) ? data.articles : []) {
        const key = (article.url || article.title || '').trim().toLowerCase()
        if (key) unique.set(key, article)
      }
      setArticles([...unique.values()])
      setFetchedAt(data.fetchedAt || new Date().toISOString())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load news right now.')
    } finally { setLoading(false) }
  }, [locality])

  useEffect(() => { void refresh(true) }, [refresh])
  useEffect(() => {
    const timer = window.setInterval(() => { void refresh() }, 12 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const filtered = useMemo(() => articles.filter((article) => {
    const matchesCategory = category === 'All News' || categoryFor(article) === category
    return matchesCategory && (article.title ?? '').toLowerCase().includes(search.trim().toLowerCase())
  }), [articles, category, search])
  const topics = useMemo(() => {
    const counts = new Map<string, number>()
    for (const article of articles) for (const term of ['Metro', 'Traffic', 'Education', 'Jobs', 'Rental', 'Weather', 'Events']) {
      if ((article.title ?? '').toLowerCase().includes(term.toLowerCase())) counts.set(term, (counts.get(term) ?? 0) + 1)
    }
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([term]) => term)
  }, [articles])
  const featured = filtered[0]
  const cards = filtered.slice(1, visibleCount)

  return (
    <div className="bulletin-page">
      <header className="bulletin-masthead">
        <div className="bulletin-topline"><Link to="/" className="bulletin-home"><ArrowLeft size={16} /> OG Stays</Link><span>Powered by OG Stays</span></div>
        <div className="bulletin-heading-wrap"><p className="bulletin-kicker">THE BANGALORE EDITION · {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p><h1>Bangalore <em>Bulletin.</em></h1><p className="bulletin-subtitle">Your city. Your neighbourhood. Everything happening around you.</p></div>
        <div className="bulletin-toolbar">
          <label className="bulletin-search"><Search size={18} /><input aria-label="Search news headlines" placeholder="Search Bangalore headlines" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label className="bulletin-locality"><MapPin size={17} /><select aria-label="Browse by locality" value={locality} onChange={(event) => setLocality(event.target.value)}><option value="">Around Bangalore</option>{localities.map((area) => <option key={area}>{area}</option>)}</select></label>
          <button type="button" className="bulletin-refresh" onClick={() => void refresh(true)} disabled={loading}><RefreshCw size={16} className={loading ? 'bulletin-spinning' : ''} /> Refresh</button>
        </div>
        <div className="bulletin-freshness"><span><i /> Latest available</span><span><Clock3 size={14} /> {fetchedAt ? `Updated ${formatDate(fetchedAt)}` : 'Waiting for update'}</span></div>
      </header>

      <nav className="bulletin-categories" aria-label="News categories">{categories.map((name) => <button key={name} type="button" className={category === name ? 'active' : ''} onClick={() => { setCategory(name); setVisibleCount(9) }}>{name}</button>)}</nav>

      <main className="bulletin-content">
        {error ? <div className="bulletin-state"><h2>News could not be loaded</h2><p>{error}</p><button className="bulletin-refresh" onClick={() => void refresh(true)}>Try again</button></div> : loading && !articles.length ? <div className="bulletin-state"><span className="bulletin-loading-mark" /><p>Gathering the latest from Bangalore…</p></div> : !filtered.length ? <div className="bulletin-state"><h2>No stories in this edition yet</h2><p>{category === 'All News' ? 'Try a different headline or locality.' : `GDELT has no matching ${category.toLowerCase()} articles in the current results. Check back after the next update.`}</p></div> : <>
          {featured && <section className="bulletin-lead"><div className="bulletin-section-label"><span>THE LEAD STORY</span><span>{locality || 'Bangalore'}</span></div><NewsCard article={featured} featured /></section>}
          <section className="bulletin-latest"><div className="bulletin-section-heading"><div><p className="bulletin-kicker">THE CITY, AS IT UNFOLDS</p><h2>Most recent</h2></div><span>{filtered.length} {filtered.length === 1 ? 'story' : 'stories'}</span></div><div className="bulletin-grid">{cards.map((article) => <NewsCard key={article.url || article.title} article={article} />)}</div>{filtered.length > visibleCount && <button className="bulletin-load-more" onClick={() => setVisibleCount((count) => count + 9)}>Load more stories <ArrowRight size={17} /></button>}</section>
          <aside className="bulletin-topics"><div><p className="bulletin-kicker">FROM THIS EDITION</p><h2>Popular topics</h2></div><div className="bulletin-topic-list">{topics.length ? topics.map((topic) => <button key={topic} onClick={() => { setSearch(topic); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>{topic} <ArrowRight size={14} /></button>) : <p>Topics will appear as they surface in fetched headlines.</p>}</div></aside>
        </>}
        <p className="bulletin-note">Stories link to their original publishers. GDELT indexes news coverage; publication freshness can vary by source.</p>
      </main>
    </div>
  )
}
