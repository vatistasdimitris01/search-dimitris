import { useEffect, useState } from 'react'
import SearchInterface from './components/SearchInterface.jsx'
import ResultsPage from './components/ResultsPage.jsx'

const HOME_PATH = '/'

function parseRoute() {
  const path = window.location.pathname
  const params = new URLSearchParams(window.location.search)
  if (path === '/search') {
    return { view: 'results', query: params.get('q') || '' }
  }
  return { view: 'home', query: '' }
}

export default function App() {
  const [route, setRoute] = useState(parseRoute)

  useEffect(() => {
    const onPop = () => setRoute(parseRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = (to, { replace = false } = {}) => {
    if (replace) window.history.replaceState({}, '', to)
    else window.history.pushState({}, '', to)
    setRoute(parseRoute())
    window.scrollTo(0, 0)
  }

  // Submitting on the results page searches from scratch, so a new query must
  // replace the entry rather than stacking another on top of it.
  const searchFrom = (query) => {
    const target = '/search?q=' + encodeURIComponent(query)
    if (window.location.pathname === '/search') navigate(target, { replace: true })
    else navigate(target)
  }

  if (route.view === 'results' && route.query) {
    return <ResultsPage query={route.query} onSearch={searchFrom} onHome={() => navigate(HOME_PATH)} />
  }

  return <SearchInterface onSearch={searchFrom} />
}