import { useEffect, useRef, useState } from 'react'
import SearchInput from './SearchInput.jsx'
import Suggestions from './Suggestions.jsx'
import {
  buildGoogleUrl,
  fetchLiveSuggestions,
  localSuggestions,
  pickGreeting,
} from '../lib/suggestions.jsx'

const LIST_ID = 'suggestions'
const HIDE_BTN_KEY = 'hideSearchBtn'

export function doSearch(query) {
  const q = query.trim()
  if (!q) return
  window.location.href = buildGoogleUrl(q)
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
  const [hideBtn, setHideBtn] = useState(() => {
    try {
      return localStorage.getItem(HIDE_BTN_KEY) === 'true'
    } catch {
      return false
    }
  })

  const inputRef = useRef(null)
  const areaRef = useRef(null)
  const settingsRef = useRef(null)
  const timerRef = useRef(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

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
    try {
      localStorage.setItem(HIDE_BTN_KEY, checked ? 'true' : 'false')
    } catch {
      /* storage unavailable */
    }
  }

  const handleChange = (value) => {
    setQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    requestIdRef.current += 1
    const id = requestIdRef.current
    const trimmedQuery = value.trim()

    // Inline suggestion roll, from local matches immediately
    const allLocal = localSuggestions(trimmedQuery)
    if (
      trimmedQuery &&
      allLocal.length > 0 &&
      allLocal[0].toLowerCase().startsWith(trimmedQuery.toLowerCase()) &&
      allLocal[0] !== trimmedQuery
    ) {
      // Match case of user input, append rest of suggestion
      setInline(value + allLocal[0].substring(trimmedQuery.length))
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
      const live = await fetchLiveSuggestions(trimmedQuery)
      if (id !== requestIdRef.current) return
      setLoading(false)
      if (live && live.length > 0) {
        setSuggestions(live)
        setActive(-1)
        setShowSuggestions(true)
        // Update inline suggestion with live data if applicable
        if (
          live[0].toLowerCase().startsWith(trimmedQuery.toLowerCase()) &&
          live[0] !== trimmedQuery
        ) {
          setInline(value + live[0].substring(trimmedQuery.length))
        }
      } else {
        setSuggestions(localSuggestions(trimmedQuery))
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
            <label className="setting-row">
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
            </label>
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
        </div>
      </main>
    </div>
  )
}
