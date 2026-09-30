import { useEffect, useRef, useState } from 'react'
import { buildGoogleUrl, highlightParts } from '../lib/suggestions.jsx'
import {
  duckSearchUrl,
  fetchDuckAnswerWithTimeout,
  fetchWikiResultsWithTimeout,
} from '../lib/search.jsx'

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.5" />
      <path d="m15.7 15.7 4.1 4.1" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 4h6v6M20 4l-8 8M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  )
}

function DdgMark() {
  return (
    <span className="ddg-mark" aria-hidden="true">
      DDG
    </span>
  )
}

/** Renders query matches as <strong>, reusing the suggestion highlighter. */
function Highlighted({ text, query }) {
  const parts = highlightParts(text, query)
  return (
    <>
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          <span key={i}>{part}</span>
        ) : (
          <strong key={part.key}>{part.match}</strong>
        ),
      )}
    </>
  )
}

function ResultSkeleton() {
  return (
    <div className="result-row skeleton" aria-hidden="true">
      <div className="result-head">
        <div className="shimmer skel-favicon" />
        <div className="shimmer skel-line" style={{ width: 132 }} />
      </div>
      <div className="shimmer skel-title" style={{ width: '62%', marginBottom: 7 }} />
      <div className="shimmer skel-line" style={{ width: '100%', marginBottom: 5 }} />
      <div className="shimmer skel-line" style={{ width: '78%' }} />
    </div>
  )
}

function AnswerSkeleton() {
  return (
    <div className="answer-card skeleton" aria-hidden="true">
      <div className="shimmer" style={{ width: 92, height: 92, flex: '0 0 92px', borderRadius: 12 }} />
      <div className="answer-main">
        <div className="shimmer skel-line" style={{ width: 140, marginBottom: 4 }} />
        <div className="shimmer skel-title" style={{ width: '78%', marginBottom: 6 }} />
        <div className="shimmer skel-line" style={{ width: '100%', marginBottom: 5 }} />
        <div className="shimmer skel-line" style={{ width: '92%', marginBottom: 5 }} />
        <div className="shimmer skel-line" style={{ width: '64%' }} />
      </div>
    </div>
  )
}

/** Deterministic hue per host, so favicon letters stay stable between loads. */
function faviconStyle(host) {
  let hash = 0
  for (let i = 0; i < host.length; i += 1) hash = (hash * 31 + host.charCodeAt(i)) % 360
  return {
    background: `hsl(${hash}, 38%, 62%)`,
    color: `hsl(${hash}, 45%, 12%)`,
  }
}

const EMPTY = {
  loading: true,
  duck: null,
  wiki: [],
  duckFailed: false,
  wikiFailed: false,
  duckDone: false,
  wikiDone: false,
}

export default function ResultsPage({ query, onSearch, onHome }) {
  const [input, setInput] = useState(query)
  const [state, setState] = useState(EMPTY)
  const inputRef = useRef(null)

  useEffect(() => {
    setInput(query)
  }, [query])

  useEffect(() => {
    document.title = `${query} — vatistasdimsearch`
    return () => {
      document.title = 'Search - Dimitris'
    }
  }, [query])

  // DuckDuckGo and Wikipedia resolve independently; each patches the page in
  // as soon as it lands, so a slow source never holds back the other one.
  useEffect(() => {
    let cancelled = false

    setState(EMPTY)

    const settle = (patch) => {
      if (cancelled) return
      setState((prev) => {
        const next = { ...prev, ...patch }
        next.loading = !(next.duckDone && next.wikiDone)
        return next
      })
    }

    fetchDuckAnswerWithTimeout(query)
      .then((duck) => settle({ duck, duckDone: true }))
      .catch(() => settle({ duckFailed: true, duckDone: true }))

    fetchWikiResultsWithTimeout(query)
      .then((wiki) => settle({ wiki, wikiDone: true }))
      .catch(() => settle({ wikiFailed: true, wikiDone: true }))

    return () => {
      cancelled = true
    }
  }, [query])

  const handleSubmit = (event) => {
    event.preventDefault()
    const next = input.trim()
    if (next && next !== query) onSearch(next)
  }

  const duck = state.duck
  const total = (duck?.related?.length || 0) + state.wiki.length
  const bothFailed = state.duckFailed && state.wikiFailed

  return (
    <div className="page results-page">
      <header className="results-top">
        <button
          type="button"
          className="results-back"
          aria-label="Back to search"
          title="Back to search"
          onClick={onHome}
        >
          <ArrowLeftIcon />
        </button>

        <form className="results-search" role="search" onSubmit={handleSubmit} autoComplete="off">
          <input
            ref={inputRef}
            className="results-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search DuckDuckGo…"
            aria-label="Search DuckDuckGo"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
          />
          <button className="results-go" type="submit" aria-label="Search">
            <SearchIcon />
          </button>
        </form>
      </header>

      <main className="results-body">
        <div className="results-meta">
          <span className="results-query">
            <Highlighted text={query} query={query} />
          </span>
          <span className="ddg-chip">
            <DdgMark />
            DuckDuckGo
          </span>
        </div>

        {state.duckFailed && !state.wikiFailed && !state.loading && (
          <p className="results-note">
            DuckDuckGo did not answer — showing Wikipedia articles instead.
          </p>
        )}

        {duck?.hasAnswer ? (
          <article className="answer-card">
            {duck.image ? (
              <img className="answer-image" src={duck.image} alt="" loading="lazy" />
            ) : (
              <div className="answer-image" aria-hidden="true" />
            )}

            <div className="answer-main">
              <div className="answer-head">
                {duck.abstractSource || 'DuckDuckGo'}
                {duck.abstractUrl && (
                  <>
                    {' · '}
                    <a href={duck.abstractUrl} target="_blank" rel="noreferrer noopener">
                      {duck.abstractSource || 'Source'}
                    </a>
                  </>
                )}
              </div>

              <h1 className="answer-title">
                <Highlighted text={duck.heading} query={query} />
              </h1>

              {duck.answer && <p className="answer-text">{duck.answer}</p>}
              {duck.definition && (
                <p className="answer-text definition">
                  {duck.definitionSource && <strong>{duck.definitionSource}: </strong>}
                  {duck.definition}
                </p>
              )}
              {duck.abstract && <p className="answer-text">{duck.abstract}</p>}

              {duck.abstractUrl && (
                <a
                  className="answer-link"
                  href={duck.abstractUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Read more
                  <ExternalIcon />
                </a>
              )}
            </div>
          </article>
        ) : (
          state.loading && (
            <div className="result-list" aria-live="polite" aria-busy="true">
              <span className="sr-only">Searching DuckDuckGo…</span>
              <AnswerSkeleton />
            </div>
          )
        )}

        {state.wiki.length > 0 ? (
          <>
            <h2 className="results-section">Articles</h2>
            <div className="result-list">
              {state.wiki.map((page) => (
                <a
                  className="result-row"
                  key={page.url}
                  href={page.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <div className="result-head">
                    {page.image ? (
                      <img
                        className="result-favicon has-thumb"
                        src={page.image}
                        alt=""
                        width="18"
                        height="18"
                        loading="lazy"
                      />
                    ) : (
                      <span
                        className="result-favicon"
                        style={faviconStyle(page.host)}
                        aria-hidden="true"
                      >
                        {page.title.charAt(0)}
                      </span>
                    )}
                    <span className="result-url">{page.url}</span>
                  </div>

                  <h3 className="result-title">
                    <Highlighted text={page.title} query={query} />
                  </h3>
                  <p className="result-snippet">
                    <Highlighted text={page.snippet} query={query} />
                  </p>
                </a>
              ))}
            </div>
          </>
        ) : (
          state.loading && (
            <div className="result-list" aria-live="polite" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <ResultSkeleton key={i} />
              ))}
            </div>
          )
        )}

        {state.duckDone && duck?.related?.length > 0 && (
          <>
            <h2 className="results-section">Related searches</h2>
            <div className="related-list">
              {duck.related.map((item) => (
                <a
                  className="related-chip"
                  key={item.url}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={item.snippet || item.title}
                >
                  {item.title}
                </a>
              ))}
            </div>
          </>
        )}

        {!state.loading && bothFailed && (
          <p className="results-empty">
            <strong>Could not load results</strong>
            Check your connection and try again.
          </p>
        )}

        {!state.loading && !bothFailed && total === 0 && (
          <p className="results-empty">
            <strong>No in-app results</strong>
            This site uses DuckDuckGo answers and Wikipedia articles — try a
            different wording, or open the full search on DuckDuckGo below.
          </p>
        )}
      </main>

      <footer className="results-foot">
        <span>Results from</span>
        <a href={duckSearchUrl(query)} target="_blank" rel="noreferrer noopener">
          DuckDuckGo
        </a>
        <span className="results-foot-sep">·</span>
        <a href={buildGoogleUrl(query)} target="_blank" rel="noreferrer noopener">
          Google
        </a>
      </footer>
    </div>
  )
}