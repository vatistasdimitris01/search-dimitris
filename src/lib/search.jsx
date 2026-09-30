/*
 * Data sources for the in-app results page.
 *
 * DuckDuckGo's HTML endpoints (html./lite.) reject programmatic requests with
 * a 403, so there is no way to scrape a real SERP from the browser. What we
 * can rely on, key-free and CORS-enabled, is:
 *
 *   1. DuckDuckGo's official Instant Answer API (api.duckduckgo.com) — the real
 *      DuckDuckGo answer: headline, abstract, image, source and related topics.
 *   2. Wikipedia's search API — real article links with intros and thumbnails.
 *
 * Anything else (a genuine web SERP) is always offered as a link out to
 * duckduckgo.com / google.com so the user is never trapped in a thin page.
 */

export const DDG_API = 'https://api.duckduckgo.com/'
export const WIKI_API = 'https://en.wikipedia.org/w/api.php'

export function wikipediaUrl(title) {
  return 'https://en.wikipedia.org/wiki/' + encodeURIComponent(String(title).replace(/ /g, '_'))
}

/** Bare protocol-relative or root-relative URLs come back from DuckDuckGo. */
function absoluteUrl(url) {
  if (!url) return null
  if (url.startsWith('//')) return 'https:' + url
  if (url.startsWith('/')) return 'https://duckduckgo.com' + url
  return url
}

export function stripHtml(value) {
  if (!value) return ''
  return String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** DuckDuckGo related topics arrive as "<a>Title</a> snippet" HTML. */
function parseTopic(topic, seen) {
  const html = topic.Result || ''
  let url = topic.FirstURL || ''
  let title = ''
  let snippet = ''

  const match = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>([\s\S]*)$/.exec(html)
  if (match) {
    url = url || absoluteUrl(match[1])
    title = stripHtml(match[2])
    snippet = stripHtml(match[3])
  } else {
    title = stripHtml(topic.Text)
  }

  url = absoluteUrl(url)
  if (!url || !title) return null
  if (seen.has(url)) return null
  seen.add(url)

  return { title, snippet, url, host: hostOf(url) }
}

function collectTopics(topics, seen, out) {
  for (const topic of topics || []) {
    if (Array.isArray(topic.Topics) && topic.Topics.length) {
      collectTopics(topic.Topics, seen, out)
      continue
    }
    const parsed = parseTopic(topic, seen)
    if (parsed) out.push(parsed)
  }
}

/** Wikipedia article thumbnail for an en.wikipedia.org/wiki/… URL. */
async function fetchWikiThumbnailForUrl(abstractUrl) {
  const match = /en\.wikipedia\.org\/wiki\/(.+?)(?:[#?]|$)/.exec(abstractUrl || '')
  if (!match) return ''
  const title = decodeURIComponent(match[1].replace(/_/g, ' '))
  const url =
    WIKI_API +
    '?action=query&titles=' +
    encodeURIComponent(title) +
    '&prop=pageimages&piprop=thumbnail&pithumbsize=400&format=json&origin=*&redirects=1'
  const response = await fetch(url)
  if (!response.ok) return ''
  const data = await response.json()
  const pages = (data.query && data.query.pages) || {}
  const page = Object.values(pages)[0] || {}
  return (page.thumbnail && page.thumbnail.source) || ''
}

export async function fetchDuckAnswer(query) {
  const url =
    DDG_API +
    '?q=' +
    encodeURIComponent(query.trim()) +
    // skip_disambig=1 is what makes DuckDuckGo return the actual abstract,
    // image and definition instead of a bare disambiguation list.
    '&format=json&no_html=1&no_redirect=1&skip_disambig=1&t=vatistasdimsearch'

  const response = await fetch(url)
  if (!response.ok) throw new Error('DuckDuckGo request failed')
  const data = await response.json()

  const related = []
  collectTopics(data.RelatedTopics, new Set(), related)
  ;(data.Results || []).forEach((item) => {
    const url = absoluteUrl(item.FirstURL)
    const title = stripHtml(item.Text)
    if (url && title) related.push({ title, snippet: '', url, host: hostOf(url) })
  })

  const abstractUrl = absoluteUrl(data.AbstractURL)
  const definitionUrl = absoluteUrl(data.DefinitionURL)

  // DuckDuckGo often returns no image at all — fall back to the Wikipedia
  // article thumbnail for the abstract so the card never shows a blank box.
  let image = absoluteUrl(data.Image) || ''
  if (!image && abstractUrl) {
    try {
      image = await fetchWikiThumbnailForUrl(abstractUrl)
    } catch {
      /* keep it imageless rather than failing the whole answer */
    }
  }

  return {
    heading: data.Heading || stripHtml(data.Answer) || query.trim(),
    answer: stripHtml(data.Answer) || '',
    definition: stripHtml(data.Definition) || '',
    definitionSource: data.DefinitionSource || '',
    definitionUrl: definitionUrl || '',
    abstract: stripHtml(data.Abstract) || '',
    abstractUrl: abstractUrl || '',
    abstractSource: data.AbstractSource || '',
    image,
    redirect: absoluteUrl(data.Redirect) || '',
    related: related.slice(0, 6),
    hasAnswer:
      Boolean(
        stripHtml(data.Answer) ||
          stripHtml(data.Abstract) ||
          stripHtml(data.Definition) ||
          data.Redirect,
      ),
  }
}

export async function fetchWikiResults(query, limit = 8) {
  const url =
    WIKI_API +
    '?action=query&generator=search&gsrsearch=' +
    encodeURIComponent(query.trim()) +
    '&gsrlimit=' +
    limit +
    '&prop=extracts|pageimages|info&inprop=url&exintro=1&explaintext=1&exsentences=2' +
    '&piprop=thumbnail&pithumbsize=96&format=json&origin=*&redirects=1'

  const response = await fetch(url)
  if (!response.ok) throw new Error('Wikipedia request failed')
  const data = await response.json()
  const pages = (data.query && data.query.pages) || {}

  return Object.values(pages)
    .map((page) => ({
      title: page.title || '',
      snippet: (page.extract || '').trim(),
      url: page.fullurl || wikipediaUrl(page.title || ''),
      host: 'en.wikipedia.org',
      image: page.thumbnail ? page.thumbnail.source : '',
    }))
    .filter((page) => page.title && page.snippet)
    .sort((a, b) => (a.index || 0) - (b.index || 0))
}

/**
 * Each source gets its own hard timeout so one slow host can never leave the
 * page stuck on skeletons.
 */
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

/** DuckDuckGo resets a noticeable share of connections, so retry with backoff. */
async function retry(promiseFactory, attempts = 3, backoff = 350) {
  let lastError
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await promiseFactory()
    } catch (error) {
      lastError = error
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, backoff * (i + 1)))
    }
  }
  throw lastError
}

export const fetchDuckAnswerWithTimeout = (query) =>
  withTimeout(retry(() => fetchDuckAnswer(query)), 12000)

export const fetchWikiResultsWithTimeout = (query) =>
  withTimeout(retry(() => fetchWikiResults(query, 8), 2, 250), 9000)