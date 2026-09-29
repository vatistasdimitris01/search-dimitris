export const FALLBACK_SUGGESTIONS = [
  'weather today',
  'latest news',
  'YouTube',
  'Gmail',
  'Google Maps',
  'ChatGPT',
  'Apple',
  'Amazon',
  'Netflix',
  'Instagram',
  'Facebook',
  'Reddit',
  'Wikipedia',
  'JavaScript tutorial',
  'restaurants near me',
]

export const GREETINGS = [
  'Good morning, Dimitris',
  'Good afternoon, Dimitri',
  'Good evening, Dimitris',
  'Hello, Dimitri',
  'Welcome back, Dimitris',
  'What shall we search for?',
  'Where should we begin?',
]

export function pickGreeting() {
  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)]
}

export function buildGoogleUrl(query) {
  return 'https://www.google.com/search?q=' + encodeURIComponent(query.trim())
}

export function localSuggestions(query) {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const starts = []
  const contains = []

  FALLBACK_SUGGESTIONS.forEach((item) => {
    const lower = item.toLowerCase()
    if (lower.startsWith(q)) starts.push(item)
    else if (lower.includes(q)) contains.push(item)
  })

  const current = query.trim()
  const combined = [current, ...starts, ...contains]
  return [...new Set(combined)].slice(0, 7)
}

/*
 * Live suggestions via JSONP (script-tag callback), which is not
 * subject to the CORS policy that blocks plain fetch() calls to
 * Google's autocomplete endpoint. Resolves to an array of strings,
 * or null when the request fails/times out (caller falls back local).
 */
export function fetchLiveSuggestions(query) {
  return new Promise((resolve) => {
    const callbackName =
      'googleSuggestCallback_' +
      Math.round(100000 * Math.random()) +
      '_' +
      Date.now()
    let script = null
    let settled = false

    const cleanup = () => {
      try {
        delete window[callbackName]
      } catch {
        window[callbackName] = undefined
      }
      if (script && script.parentNode) {
        script.parentNode.removeChild(script)
      }
      script = null
    }

    const settle = (value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      cleanup()
      resolve(value)
    }

    window[callbackName] = function (data) {
      // Google suggest with client=chrome returns:
      // ["query", ["suggestion1", "suggestion2"]]
      const live =
        Array.isArray(data) && Array.isArray(data[1])
          ? data[1].filter(Boolean).slice(0, 7)
          : []
      settle(live)
    }

    script = document.createElement('script')
    // Using client=chrome for simpler JSON array response
    script.src =
      'https://suggestqueries.google.com/complete/search?client=chrome&q=' +
      encodeURIComponent(query) +
      '&callback=' +
      callbackName
    script.onerror = function () {
      settle(null)
    }
    const timer = setTimeout(() => settle(null), 5000)
    document.body.appendChild(script)
  })
}

/** Split a suggestion into plain / <strong> parts, matching every occurrence. */
export function highlightParts(text, query) {
  const q = query.trim()
  if (!q) return [text]

  const lower = text.toLowerCase()
  const needle = q.toLowerCase()
  const parts = []
  let i = 0
  let key = 0

  for (;;) {
    const idx = lower.indexOf(needle, i)
    if (idx === -1) {
      parts.push(text.slice(i))
      break
    }
    if (idx > i) parts.push(text.slice(i, idx))
    parts.push({ match: text.slice(idx, idx + q.length), key: key++ })
    i = idx + q.length
  }

  return parts
}
