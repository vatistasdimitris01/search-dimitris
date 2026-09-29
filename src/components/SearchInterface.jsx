import { useEffect, useRef, useState } from 'react'
import SearchInput from './SearchInput.jsx'
import Suggestions from './Suggestions.jsx'
import {
  buildGoogleUrl,
  fetchLiveSuggestions,
  localSuggestions,
  pickGreeting,
} from '../lib/suggestions.jsx'
import { cityLabel, detectLocation, withCity } from '../lib/location.jsx'

const LIST_ID = 'suggestions'
const HIDE_BTN_KEY = 'hideSearchBtn'
const THEME_KEY = 'theme'
const CITY_KEY = 'city'

function readStore(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : v
  } catch {
    return fallback
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable */
  }
}

export function doSearch(query) {
  const q = query.trim()
  if (!q) return
  window.location.href = buildGoogleUrl(q)
}

function SunIcon() {
  return (
    <svg className="theme-icon icon-sun" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="theme-icon icon-moon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  )
}

function SkeletonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="skeleton-icon" aria-hidden="true">
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
    </svg>
  )
}

export default function SearchInterface() {
  // The greeting is deliberately selected again on every page load,
  // so refreshing can produce a different greeting.
  const [greeting] = useState(pickGreeting)
  const [query, setQuery] = useState('')
  const [inline, setInline] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(-1)
  const [popupOpen, setPopupOpen] = useState(false)
  const [hideBtn, setHideBtn] = useState(() => readStore(HIDE_BTN_KEY, 'false') === 'true')
  const [theme, setTheme] = useState(() =>
    readStore(THEME_KEY, 'dark') === 'light' ? 'light' : 'dark',
  )
  const [location, setLocation] = useState(() => {
    const stored = readStore(CITY_KEY, '')
    return stored ? { city: stored, region: '', country: '' } : null
  })
  const [locating, setLocating] = useState(false)

  const inputRef = useRef(null)
  const areaRef = useRef(null)
  const settingsRef = useRef(null)
  const timerRef = useRef(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Apply theme to the document root (needed for the Safari theme-color tint)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'light' ? '#ffffff' : '#000000')
  }, [theme])

  // Detect the city once, so locality-style queries can be biased toward it.
  useEffect(() => {
    if (location || locating) return
    let cancelled = false
    setLocating(true)
    detectLocation()
      .then((data) => {
        if (cancelled) return
        if (data.city) {
          setLocation(data)
          writeStore(CITY_KEY, data.city)
        }
      })
      .catch(() => {
        /* geolocation unavailable - suggestions stay un-biased */
      })
      .finally(() => {
        if (!cancelled) setLocating(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    writeStore(THEME_KEY, next)
  }

  const handleClearLocation = () => {
    setLocation(null)
    writeStore(CITY_KEY, '')
    setLocating(true)
    detectLocation()
      .then((data) => {
        if (data.city) {
          setLocation(data)
          writeStore(CITY_KEY, data.city)
        }
      })
      .catch(() => {})
      .finally(() => setLocating(false))
  }

  // Hide suggestions / settings popup when clicking outside.
  useEffect(() => {
    const onDocumentClick = (event) => {
      if (areaRef.current && !areaRef.current.contains(event.target)) {
        setShowSuggestions(false)
        setLoading(false)
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setPopupOpen(false)
      }
    }
    document.addEventListener('click', onDocumentClick)
    return () => document.removeEventListener('click', onDocumentClick)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleToggleHideBtn = (checked) => {
    setHideBtn(checked)
    writeStore(HIDE_BTN_KEY, checked ? 'true' : 'false')
  }

  const handleChange = (value) => {
    setQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    requestIdRef.current += 1
    const id = requestIdRef.current
    const trimmedQuery = value.trim()

    // Locality-style queries ("near me", "delivery") get the detected
    // city appended so the results are actually relevant to the user.
    const suggestQuery = location?.city ? withCity(trimmedQuery, location.city) : trimmedQuery

    // Inline suggestion roll, from local matches immediately
    const allLocal = localSuggestions(suggestQuery)
    if (
      suggestQuery &&
      allLocal.length > 0 &&
      allLocal[0].toLowerCase().startsWith(suggestQuery.toLowerCase()) &&
      allLocal[0] !== suggestQuery
    ) {
      // Match case of user input, append rest of suggestion
      setInline(value + allLocal[0].substring(suggestQuery.length))
    } else {
      setInline('')
    }

    if (!trimmedQuery) {
      setLoading(false)
      setShowSuggestions(false)
      setSuggestions([])
      setActive(-1)
      return
    }

    setShowSuggestions(false)
    setLoading(true)

    // Fetch live suggestions with slight debounce
    timerRef.current = setTimeout(async () => {
      const live = await fetchLiveSuggestions(suggestQuery)
      if (id !== requestIdRef.current) return
      setLoading(false)
      if (live && live.length > 0) {
        setSuggestions(live)
        setActive(-1)
        setShowSuggestions(true)
        // Update inline suggestion with live data if applicable
        if (
          live[0].toLowerCase().startsWith(suggestQuery.toLowerCase()) &&
          live[0] !== suggestQuery
        ) {
          setInline(value + live[0].substring(suggestQuery.length))
        }
      } else {
        setSuggestions(localSuggestions(suggestQuery))
        setActive(-1)
        setShowSuggestions(true)
      }
    }, 250)
  }

  const handleKeyDown = (event) => {
    // Tab autocomplete for inline suggestion
    if (event.key === 'Tab' && inline) {
      event.preventDefault()
      const completed = inline
      setInline('')
      // Trigger fetch for new suggestions based on completed word
      handleChange(completed)
      return
    }

    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault()
      const next = (active + 1) % suggestions.length
      setActive(next)
      if (next >= 0) setQuery(suggestions[next])
    } else if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault()
      const prev = (active - 1 + suggestions.length) % suggestions.length
      setActive(prev)
      if (prev >= 0) setQuery(suggestions[prev])
    } else if (event.key === 'Escape') {
      setShowSuggestions(false)
      setLoading(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    doSearch(query)
  }

  const handleSelect = (value) => {
    setQuery(value)
    doSearch(value)
  }

  const handleInputFocus = () => {
    // Re-show suggestions if clicking back into the input
    if (query.trim() !== '' && suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  const hasText = query.trim() !== ''

  return (
    <div className="page">
      <div className="top-bar">
        <div className="settings-wrapper" ref={settingsRef}>
          <button
            type="button"
            className="icon-btn"
            aria-label="Settings"
            aria-expanded={popupOpen}
            onClick={(e) => {
              e.stopPropagation()
              setPopupOpen((v) => !v)
            }}
          >
            <GearIcon />
          </button>
          <div className={`popup-menu${popupOpen ? ' show' : ''}`}>
            <div className="popup-header">Preferences</div>

            <div className="setting-row theme-row">
              <span className="theme-label">
                <span>Light theme</span>
                <span className="theme-hint">Switch between dark and white</span>
              </span>
              <button
                type="button"
                className="theme-toggle"
                role="switch"
                aria-checked={theme === 'light'}
                aria-label="Light theme"
                title="Toggle theme"
                onClick={handleToggleTheme}
              >
                <MoonIcon />
                <SunIcon />
              </button>
            </div>

            <div className="setting-row">
              <span>Hide search button</span>
              <span className="switch">
                <input
                  type="checkbox"
                  checked={hideBtn}
                  onChange={(e) => handleToggleHideBtn(e.target.checked)}
                  aria-label="Hide search button"
                />
                <span className="slider"></span>
              </span>
            </div>

            <div className="setting-row theme-row">
              <span className="theme-label">
                <span>Better suggestions</span>
                <span className="location-hint">
                  {locating
                    ? 'Detecting your location…'
                    : location
                      ? 'Local results are biased to your city'
                      : 'Location unavailable'}
                </span>
                {location && <span className="location-value">{location.city}</span>}
              </span>
              {location && (
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Re-detect location"
                  title="Re-detect location"
                  onClick={handleClearLocation}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 12a9 9 0 1 1-2.6-6.4" />
                    <path d="M21 3v6h-6" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="center">
        <h1 className="title">{greeting}</h1>

        <div
          className="search-area"
          ref={areaRef}
          onClick={(e) => {
            // Hide panels when clicking outside the input/form,
            // re-show suggestions when clicking back into the input.
            if (e.target === inputRef.current && query.trim() !== '') {
              if (suggestions.length > 0) setShowSuggestions(true)
            }
          }}
        >
          <form
            className={`search-form-container${hasText ? ' has-text' : ''}${hideBtn ? ' hide-btn' : ''}`}
            onSubmit={handleSubmit}
            autoComplete="off"
            role="search"
          >
            <SearchInput
              ref={inputRef}
              value={query}
              inline={inline}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              listId={LIST_ID}
              expanded={showSuggestions && suggestions.length > 0}
            />

            <div className="button-wrapper">
              <button className="search-button" type="submit" aria-label="Search">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="10.8" cy="10.8" r="6.5"></circle>
                  <path d="m15.7 15.7 4.1 4.1"></path>
                </svg>
              </button>
            </div>
          </form>

          <div
            className={`loading${loading ? ' show' : ''}`}
            role="status"
            aria-live="polite"
            aria-hidden={!loading}
          >
            {[35, 55, 40].map((w) => (
              <div className="skeleton-row" key={w}>
                <SkeletonIcon />
                <div className="skeleton-text" style={{ width: `${w}%` }}></div>
              </div>
            ))}
          </div>

          <Suggestions
            suggestions={suggestions}
            query={query}
            activeIndex={active}
            show={showSuggestions}
            onSelect={handleSelect}
            listId={LIST_ID}
          />

          {location && !loading && !showSuggestions && (
            <p className="location-hint" aria-live="polite">
              Using your location: <strong>{location.city}</strong>
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
