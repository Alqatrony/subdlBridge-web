// tmdb.ts
// Resolves a free-text movie/TV title into a TMDB id, because SubDL's
// free-text search (film_name/file_name) now requires a paid SubDL plan.
// SubDL still supports free lookups by tmdb_id, so we resolve title -> tmdb_id here.

export type TmdbMatch = {
  tmdb_id: number
  type: 'movie' | 'tv'
  title: string
  year?: string
  poster?: string
}

const ENV_KEY = import.meta.env.VITE_TMDB_KEY ?? ''

/**
 * Search TMDB for movies and TV shows matching a free-text title.
 * Returns the matches ordered by TMDB popularity (most relevant first).
 */
export async function searchTmdb(query: string): Promise<TmdbMatch[]> {
  if (!ENV_KEY) {
    throw new Error('Missing TMDB API key (set VITE_TMDB_KEY in the web .env)')
  }

  const url = new URL('https://api.themoviedb.org/3/search/multi')
  url.searchParams.append('api_key', ENV_KEY)
  url.searchParams.append('query', query)
  url.searchParams.append('include_adult', 'false')
  url.searchParams.append('language', 'en-US')
  url.searchParams.append('page', '1')

  const res = await fetch(url.toString())
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`TMDB API error (${res.status}): ${text}`)
  }

  const data = await res.json()
  const results: any[] = data.results || []

  return results
    .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
    .map(r => {
      const type = r.media_type as 'movie' | 'tv'
      const title = type === 'movie' ? r.title : r.name
      const date = type === 'movie' ? r.release_date : r.first_air_date
      return {
        tmdb_id: r.id,
        type,
        title: title || 'Untitled',
        year: date ? String(date).slice(0, 4) : undefined,
        poster: r.poster_path ? `https://image.tmdb.org/t/p/w92${r.poster_path}` : undefined,
      } as TmdbMatch
    })
}
