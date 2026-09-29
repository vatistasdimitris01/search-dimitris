const REVERSE_URL = 'https://ipapi.co/json/'

export async function detectLocation() {
  const res = await fetch(REVERSE_URL, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('Location lookup failed')
  const data = await res.json()
  if (data.error) throw new Error(data.reason || 'Location lookup failed')
  return {
    city: data.city || '',
    region: data.region || '',
    country: data.country_name || '',
    countryCode: data.country_code || '',
  }
}

const LOCALE_SUFFIXES = {
  athens: 'Αθήνα',
  thessaloniki: 'Θεσσαλονίκη',
  patras: 'Πάτρα',
  heraklion: 'Ηράκλειο',
  larissa: 'Λάρισα',
  volos: 'Βόλος',
  ioannina: 'Γιαννινα',
  chania: 'Χανιά',
  rhodes: 'Ρόδος',
  kavala: 'Καβάλα',
  serres: 'Σέρρες',
  xanthi: 'Ξάνθη',
  katerini: 'Κατερίνη',
  tripoli: 'Τρίπολη',
  corfu: 'Κέρκυρα',
  london: 'Λονδίνο',
  paris: 'Παρίσι',
  berlin: 'Βερολίνο',
  newyork: 'Νέα Υόρκη',
  'new york': 'Νέα Υόρκη',
  istanbul: 'Κωνσταντινούπολη',
  dubai: 'Ντουμπάι',
  rome: 'Ρώμη',
  madrid: 'Μαδρίτη',
  amsterdam: 'Άμστερνταμ',
  barcelona: 'Βαρκελώνη',
  vienna: 'Βιέννη',
  zurich: 'Ζυρίχη',
  lisbon: 'Λισαβόνα',
  milan: 'Μιλάνο',
  munich: 'Μόναχο',
  sydney: 'Σίδνεϊ',
  toronto: 'Τορόντο',
  melbourne: 'Μελβούρνη',
  singapore: 'Σιγκαπούρη',
  tokyo: 'Τόκιο',
}

/**
 * Locality-ish queries get the city appended, so
 * "restaurants near me" -> "restaurants near me Athens".
 * Everything else is left alone to keep results accurate.
 */
const LOCALITY_PATTERNS = [
  /\bnear\s+me\b/i,
  /\bnearby\b/i,
  /\bin\s+my\s+(city|area|town)\b/i,
  /\b(around|close to)\s+here\b/i,
  /\bthis\s+(weekend|week)\b/i,
  /\bdelivery\b/i,
  /\btakeaway\b/i,
  /\bopen\s+now\b/i,
]

const CITY_SUFFIXES = [
  'near me',
  'restaurants',
  'cafes',
  'coffee',
  'hotels',
  'pharmacies',
  'gas stations',
  'gyms',
  'movies',
  'cinema',
  'parks',
  'supermarket',
]

export function localizableQuery(query) {
  const q = query.trim()
  if (!q) return ''

  if (/\d{3,}/.test(q)) return '' // pin codes / phones: leave alone
  if (/^https?:\/\//i.test(q)) return ''
  if (/(^|\s)(in|at|near|from|to)\s+\S+/i.test(q) && !/near\s+me/i.test(q)) {
    return '' // user already named a place
  }

  const isLocality = LOCALITY_PATTERNS.some((re) => re.test(q))
  if (!isLocality) return ''

  return q
}

export function withCity(query, city) {
  if (!city) return query
  const local = localizableQuery(query)
  if (!local) return query
  return `${local} ${city}`
}

/** Greek label for the city when we know one, otherwise the raw name. */
export function cityLabel(city) {
  if (!city) return ''
  const key = city.toLowerCase().replace(/\s+/g, '')
  return LOCALE_SUFFIXES[key] || city
}
