import type { N8nWebhookResponse, N8nStateEntry, N8nEuropeEntry, N8nCityEntry } from '../types/webhook.types'
import type { CoverageDataset, StateCoverageRecord, CqLocation, ServiceTypeSummary, CityCoverageRecord } from '../types/coverage.types'

const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL as string | undefined

function mapUsaState(s: N8nStateEntry, now: string): StateCoverageRecord {
  return {
    stateCode: s.state.toUpperCase(),
    stateName: s.state_name,
    region: 'usa',
    customerQuotes: s.customerQuotes,
    vendorQuotes: s.vendorQuotes,
    cqsWithFeasibleVQ: s.cqs_con_vq_feasible,
    vendorsWithCoverage: s.vendors_con_cobertura,
    locations: s.locations,
    pctFeasible: s.pct_feasible,
    statusCobertura: s.status_cobertura,
    coverageRatio: s.customerQuotes > 0 ? s.pct_feasible / 100 : null,
    lastUpdatedAt: now,
  }
}

const COUNTRY_CODES: Record<string, string> = {
  // Western Europe
  'United Kingdom': 'GB', 'Germany': 'DE', 'France': 'FR', 'Spain': 'ES',
  'Italy': 'IT', 'Netherlands': 'NL', 'Poland': 'PL', 'Belgium': 'BE',
  'Portugal': 'PT', 'Sweden': 'SE', 'Switzerland': 'CH', 'Austria': 'AT',
  'Denmark': 'DK', 'Norway': 'NO', 'Finland': 'FI', 'Ireland': 'IE',
  'Czech Republic': 'CZ', 'Romania': 'RO', 'Hungary': 'HU', 'Greece': 'GR',
  // Eastern / Balkan Europe (common name variants from n8n)
  'Albania': 'AL',
  'Bosnia and Herzegovina': 'BA', 'Bosnia': 'BA',
  'Bulgaria': 'BG',
  'Croatia': 'HR',
  'Estonia': 'EE',
  'Kosovo': 'XK',
  'Latvia': 'LV',
  'Liechtenstein': 'LI',
  'Lithuania': 'LT',
  'Luxembourg': 'LU',
  'Moldova': 'MD', 'Republic of Moldova': 'MD',
  'Montenegro': 'ME',
  'North Macedonia': 'MK', 'Macedonia': 'MK',
  'Macedonia (former Yugoslav Republic)': 'MK',
  'Serbia': 'RS',
  'Slovakia': 'SK',
  'Slovenia': 'SI',
  'Ukraine': 'UA',
  'Belarus': 'BY',
}

function mapEuropeCountry(c: N8nEuropeEntry, now: string): StateCoverageRecord {
  const code = COUNTRY_CODES[c.country] ?? c.country.slice(0, 2).toUpperCase()
  return {
    stateCode: code,
    stateName: c.country,
    region: 'europe',
    customerQuotes: c.customerQuotes,
    vendorQuotes: c.vendorQuotes,
    cqsWithFeasibleVQ: c.cqs_con_vq_feasible,
    vendorsWithCoverage: c.vendors_con_cobertura,
    locations: c.locations,
    pctFeasible: c.pct_feasible,
    statusCobertura: c.status_cobertura,
    coverageRatio: c.customerQuotes > 0 ? c.pct_feasible / 100 : null,
    lastUpdatedAt: now,
  }
}

function parseN8nResponse(raw: N8nWebhookResponse): CoverageDataset {
  const now = new Date().toISOString()
  const usaRecords = (raw.states ?? []).map(s => mapUsaState(s, now))
  const europeRecords = (raw.europe ?? []).map(c => mapEuropeCountry(c, now))
  const usaSummary = raw.summary?.usa
  const euSummary = raw.summary?.europe

  const cqLocations: CqLocation[] = (raw.cq_locations ?? []).map(loc => ({
    id: loc.id,
    lat: loc.lat,
    lng: loc.lng,
    state: loc.state,
    region: loc.region ?? (loc.state.length === 2 ? 'usa' : 'europe'),
    status: loc.status,
    city: loc.city,
    address: loc.address,
    totalCqs: loc.total_cqs,
    cqsWithVq: loc.cqs_con_vq,
    serviceType: loc.service_type,
    bw: loc.bw,
  }))

  const serviceTypeSummary: ServiceTypeSummary = { BIA: 0, DIA: 0, Ethernet: 0, other: 0 }
  for (const loc of cqLocations) {
    const st = loc.serviceType?.trim()
    if (st === 'BIA') serviceTypeSummary.BIA++
    else if (st === 'DIA') serviceTypeSummary.DIA++
    else if (st === 'Ethernet') serviceTypeSummary.Ethernet++
    else if (st) serviceTypeSummary.other++
  }

  // Parse city data grouped by state code
  const citiesByState: Record<string, CityCoverageRecord[]> = {}
  if (raw.cities) {
    for (const [stateCode, cityList] of Object.entries(raw.cities)) {
      const code = stateCode.toUpperCase()
      citiesByState[code] = cityList.map((c: N8nCityEntry): CityCoverageRecord => ({
        city:             c.city,
        state:            code,
        customerQuotes:   c.customerQuotes,
        cqsWithFeasibleVQ: c.cqs_con_vq_feasible,
        vendorQuotes:     c.vendorQuotes,
        pctFeasible:      c.pct_feasible,
        lat:              c.lat,
        lng:              c.lng,
        locations:        c.locations,
      }))
    }
  }

  return {
    reportGeneratedAt: raw.timestamp ?? now,
    periodLabel: 'En vivo',
    records: [...usaRecords, ...europeRecords],
    cqLocations,
    serviceTypeSummary,
    citiesByState,
    summary: {
      usa: {
        totalUnits: usaSummary?.total_states ?? usaRecords.length,
        totalCqs: usaSummary?.total_cqs ?? usaRecords.reduce((a, r) => a + r.customerQuotes, 0),
        totalVqsFeasibles: usaSummary?.total_vqs_feasibles ?? usaRecords.reduce((a, r) => a + r.vendorQuotes, 0),
        totalCqsFeasible: usaSummary?.total_cqs_feasible ?? usaRecords.reduce((a, r) => a + r.cqsWithFeasibleVQ, 0),
        pctFeasible: usaSummary?.pct_feasible ?? 0,
      },
      europe: {
        totalUnits: euSummary?.total_countries ?? europeRecords.length,
        totalCqs: euSummary?.total_cqs ?? europeRecords.reduce((a, r) => a + r.customerQuotes, 0),
        totalVqsFeasibles: euSummary?.total_vqs_feasibles ?? europeRecords.reduce((a, r) => a + r.vendorQuotes, 0),
        totalCqsFeasible: euSummary?.total_cqs_feasible ?? europeRecords.reduce((a, r) => a + r.cqsWithFeasibleVQ, 0),
        pctFeasible: euSummary?.pct_feasible ?? 0,
      },
    },
  }
}

export async function fetchCoverageData(): Promise<CoverageDataset> {
  if (!WEBHOOK_URL) throw new Error('VITE_WEBHOOK_URL not configured')
  const res = await fetch(WEBHOOK_URL)
  if (!res.ok) throw new Error(`Webhook returned ${res.status}`)
  const raw = await res.json() as N8nWebhookResponse
  return parseN8nResponse(raw)
}
