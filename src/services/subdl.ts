// subdl.ts
export type SubtitleResult = {
    subtitle_id?: number
    sd_id?: number
    lang: string
    release_name?: string
    name?: string
    url: string
    download_link?: string
  }

// Type for raw API response subtitles before processing
export type RawSubtitleData = {
  subtitle_id?: number
  lang: string
  release_name?: string
  name?: string
  url: string
}

// Type for the API response including pagination metadata
export type SubDLResponse = {
  subtitles: RawSubtitleData[]
  currentPage: number
  totalPages: number
  total?: number
}

const ENV_KEY = import.meta.env.VITE_SUBDL_KEY ?? ''

export async function searchSubDL(params: Record<string, string | number>): Promise<SubDLResponse> {
    const url = new URL('https://api.subdl.com/api/v1/subtitles')
    // inject api_key (either from params or env)
    if (!params.api_key && ENV_KEY) url.searchParams.append('api_key', ENV_KEY)
    
    // Set default pagination parameters if not provided
    if (!('page' in params)) params.page = 1
    if (!('subs_per_page' in params)) params.subs_per_page = 30
    
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.append(k, String(v))
    })
    
    console.log('Fetching from URL:', url.toString())
    const res = await fetch(url.toString())
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`SubDL API error (${res.status}): ${text}`)
    }
    
    const data = await res.json()
    console.log('Raw API response:', data)
    
    // Extract pagination information directly from the API response
    return {
      subtitles: data.subtitles || [],
      currentPage: data.currentPage || Number(params.page),
      totalPages: data.totalPages || 1,
      total: data.total
    }
}