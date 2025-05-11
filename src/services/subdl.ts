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
}

const ENV_KEY = import.meta.env.VITE_SUBDL_KEY ?? ''

export async function searchSubDL(params: Record<string, string | number>): Promise<SubDLResponse> {
    const url = new URL('https://api.subdl.com/api/v1/subtitles')
    // inject api_key (either from params or env)
    if (!params.api_key && ENV_KEY) url.searchParams.append('api_key', ENV_KEY)
    
    // Set default pagination parameters if not provided
    if (!('page' in params)) params.page = 1
    if (!('subs_per_page' in params)) params.subs_per_page = 50
    
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.append(k, String(v))
    })
    
    const res = await fetch(url.toString())
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`SubDL API error (${res.status}): ${text}`)
    }
    
    const data = await res.json()
    return {
      subtitles: data.subtitles || [],
      currentPage: Number(params.page),
      totalPages: Math.ceil((data.total || data.subtitles?.length || 0) / Number(params.subs_per_page))
    }
}