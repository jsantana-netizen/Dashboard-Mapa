/** Real shape returned by the n8n webhook */
export interface N8nStateEntry {
  state: string
  state_name: string
  customerQuotes: number
  vendorQuotes: number
  cqs_con_vq_feasible: number
  vendors_con_cobertura: number
  locations: number
  pct_feasible: number
  status_cobertura: string
}

export interface N8nEuropeEntry {
  country: string
  customerQuotes: number
  vendorQuotes: number
  cqs_con_vq_feasible: number
  vendors_con_cobertura: number
  locations: number
  pct_feasible: number
  status_cobertura: string
}

export interface N8nRegionSummary {
  total_states?: number
  total_countries?: number
  total_cqs: number
  total_vqs_feasibles: number
  total_cqs_feasible: number
  pct_feasible: number
}

/** Individual CQ location as returned by the webhook (mapped from spreadsheet row) */
export interface N8nCqLocation {
  id: string
  lat: number
  lng: number
  state: string                         // state/country code, e.g. "TX", "DE"
  region?: 'usa' | 'europe'
  status: 'feasible' | 'not_feasible'
  // Enriched fields from spreadsheet
  city?: string
  address?: string
  total_cqs?: number
  cqs_con_vq?: number
  service_type?: string                 // e.g. "BIA", "DIA", "Ethernet"
  bw?: string                           // bandwidth, e.g. "100M", "1G"
}

export interface N8nCityEntry {
  city: string
  customerQuotes: number
  cqs_con_vq_feasible: number
  vendorQuotes: number
  pct_feasible: number
  lat: number
  lng: number
  locations: number
}

export interface N8nWebhookResponse {
  success: boolean
  timestamp: string
  summary: {
    usa: N8nRegionSummary
    europe: N8nRegionSummary
  }
  states: N8nStateEntry[]
  europe: N8nEuropeEntry[]
  cq_locations?: N8nCqLocation[]        // optional — feature-flagged on the n8n side
  cities?: Record<string, N8nCityEntry[]>  // keyed by state code, e.g. "TX"
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'stale'
