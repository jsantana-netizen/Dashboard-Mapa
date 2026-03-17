/**
 * n8n — "Code in JavaScript" node
 * Workflow: Webhook → Get row(s) in sheet → [THIS NODE] → Respond to Webhook
 *
 * Input:  array of Google Sheets rows (each item.json = one spreadsheet row)
 * Output: single JSON object ready to be consumed by the dashboard-mapa frontend
 *
 * ─── VERIFY THESE COLUMN NAMES MATCH YOUR SPREADSHEET ───────────────────────
 *   location_key   latitude   longitude   address   country_name
 *   region         city_name  state_name  total_cqs  cqs_con_vq
 *   total_vqs_feasible   vendors_con_cobertura  pct_feasible
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── USA state name → 2-letter code ──────────────────────────────────────────
const STATE_CODES = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
  'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
  'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
  'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
  'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
  'Wisconsin': 'WI', 'Wyoming': 'WY',
  'District Of Columbia': 'DC', 'District of Columbia': 'DC',
  'Puerto Rico': 'PR',
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function statusCobertura(pct) {
  if (pct < 1)  return 'Crítico'
  if (pct < 3)  return 'Bajo'
  if (pct < 6)  return 'Parcial'
  if (pct < 10) return 'Bueno'
  return 'Excelente'
}

function num(v) {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

// ── Read rows from Google Sheets ─────────────────────────────────────────────
const rows = $input.all().map(item => item.json)

// ── Separate Americas (USA) from Europe ──────────────────────────────────────
const usaRows     = rows.filter(r => r.region === 'Americas')
const europeRows  = rows.filter(r => r.region === 'Europe')

// ── Aggregate USA rows by state ───────────────────────────────────────────────
const usaByState = {}

for (const row of usaRows) {
  const code = STATE_CODES[row.state_name] ?? row.state_name
  if (!usaByState[code]) {
    usaByState[code] = {
      state:                  code,
      state_name:             row.state_name,
      customerQuotes:         0,
      vendorQuotes:           0,
      cqs_con_vq_feasible:    0,
      vendors_con_cobertura:  0,
      locations:              0,
      pct_feasible:           0,
      status_cobertura:       '',
      _totalCqsForPct:        0,  // internal: weighted pct
    }
  }
  const s = usaByState[code]
  const totalCqs  = num(row.total_cqs)
  const cqsConVq  = num(row.cqs_con_vq)
  const totalVqsFe = num(row.total_vqs_feasible)
  const vendorsCol = num(row.vendors_con_cobertura)
  const pctFe     = num(row.pct_feasible)

  s.customerQuotes        += totalCqs
  s.vendorQuotes          += totalVqsFe
  s.cqs_con_vq_feasible   += cqsConVq
  s.vendors_con_cobertura += vendorsCol
  s.locations             += 1
  s._totalCqsForPct       += totalCqs * pctFe
}

// Compute weighted average pct_feasible per state
const statesArray = Object.values(usaByState).map(s => {
  const pct = s.customerQuotes > 0 ? s._totalCqsForPct / s.customerQuotes : 0
  return {
    state:                  s.state,
    state_name:             s.state_name,
    customerQuotes:         s.customerQuotes,
    vendorQuotes:           s.vendorQuotes,
    cqs_con_vq_feasible:    s.cqs_con_vq_feasible,
    vendors_con_cobertura:  s.vendors_con_cobertura,
    locations:              s.locations,
    pct_feasible:           Math.round(pct * 100) / 100,
    status_cobertura:       statusCobertura(pct),
  }
})

// ── Aggregate Europe rows by country ─────────────────────────────────────────
const europeByCountry = {}

for (const row of europeRows) {
  const country = row.country_name
  if (!europeByCountry[country]) {
    europeByCountry[country] = {
      country:                country,
      customerQuotes:         0,
      vendorQuotes:           0,
      cqs_con_vq_feasible:    0,
      vendors_con_cobertura:  0,
      locations:              0,
      pct_feasible:           0,
      status_cobertura:       '',
      _totalCqsForPct:        0,
    }
  }
  const c = europeByCountry[country]
  const totalCqs   = num(row.total_cqs)
  const cqsConVq   = num(row.cqs_con_vq)
  const totalVqsFe = num(row.total_vqs_feasible)
  const vendorsCol = num(row.vendors_con_cobertura)
  const pctFe      = num(row.pct_feasible)

  c.customerQuotes        += totalCqs
  c.vendorQuotes          += totalVqsFe
  c.cqs_con_vq_feasible   += cqsConVq
  c.vendors_con_cobertura += vendorsCol
  c.locations             += 1
  c._totalCqsForPct       += totalCqs * pctFe
}

const europeArray = Object.values(europeByCountry).map(c => {
  const pct = c.customerQuotes > 0 ? c._totalCqsForPct / c.customerQuotes : 0
  return {
    country:                c.country,
    customerQuotes:         c.customerQuotes,
    vendorQuotes:           c.vendorQuotes,
    cqs_con_vq_feasible:    c.cqs_con_vq_feasible,
    vendors_con_cobertura:  c.vendors_con_cobertura,
    locations:              c.locations,
    pct_feasible:           Math.round(pct * 100) / 100,
    status_cobertura:       statusCobertura(pct),
  }
})

// ── Aggregate USA rows by city (NEW) ─────────────────────────────────────────
const cityAgg = {}

for (const row of usaRows) {
  const stateCode = STATE_CODES[row.state_name] ?? row.state_name
  const cityName  = row.city_name
  if (!cityName) continue

  const cityKey = `${stateCode}__${cityName}`
  if (!cityAgg[cityKey]) {
    cityAgg[cityKey] = {
      city:              cityName,
      state:             stateCode,
      customerQuotes:    0,
      cqs_con_vq_feasible: 0,
      vendorQuotes:      0,
      latSum:            0,
      lngSum:            0,
      locCount:          0,
    }
  }
  const c = cityAgg[cityKey]
  c.customerQuotes     += num(row.total_cqs)
  c.cqs_con_vq_feasible += num(row.cqs_con_vq)
  c.vendorQuotes       += num(row.total_vqs_feasible)
  c.latSum             += num(row.latitude)
  c.lngSum             += num(row.longitude)
  c.locCount           += 1
}

// Group into { "TX": [...], "CA": [...] }, sorted by customerQuotes desc
const cities = {}
for (const c of Object.values(cityAgg)) {
  if (!cities[c.state]) cities[c.state] = []
  cities[c.state].push({
    city:              c.city,
    customerQuotes:    c.customerQuotes,
    cqs_con_vq_feasible: c.cqs_con_vq_feasible,
    vendorQuotes:      c.vendorQuotes,
    pct_feasible:      c.customerQuotes > 0
      ? Math.round((c.cqs_con_vq_feasible / c.customerQuotes) * 10000) / 100
      : 0,
    lat:       c.latSum / c.locCount,
    lng:       c.lngSum / c.locCount,
    locations: c.locCount,
  })
}
for (const state of Object.keys(cities)) {
  cities[state].sort((a, b) => b.customerQuotes - a.customerQuotes)
}

// ── Build individual CQ location points ──────────────────────────────────────
const cq_locations = rows
  .filter(r => r.latitude != null && r.longitude != null)
  .map(row => {
    const isUsa   = row.region === 'Americas'
    const stateCode = isUsa
      ? (STATE_CODES[row.state_name] ?? row.state_name)
      : row.country_name
    const cqsConVq = num(row.cqs_con_vq)

    return {
      id:         row.location_key,
      lat:        num(row.latitude),
      lng:        num(row.longitude),
      state:      stateCode,
      region:     isUsa ? 'usa' : 'europe',
      status:     cqsConVq > 0 ? 'feasible' : 'not_feasible',
      city:       row.city_name,
      address:    row.address,
      total_cqs:  num(row.total_cqs),
      cqs_con_vq: cqsConVq,
    }
  })

// ── Compute global summaries ──────────────────────────────────────────────────
const usaTotalCqs      = statesArray.reduce((a, s) => a + s.customerQuotes, 0)
const usaTotalVqs      = statesArray.reduce((a, s) => a + s.vendorQuotes, 0)
const usaTotalFeasible = statesArray.reduce((a, s) => a + s.cqs_con_vq_feasible, 0)

const euTotalCqs       = europeArray.reduce((a, c) => a + c.customerQuotes, 0)
const euTotalVqs       = europeArray.reduce((a, c) => a + c.vendorQuotes, 0)
const euTotalFeasible  = europeArray.reduce((a, c) => a + c.cqs_con_vq_feasible, 0)

// ── Build final response ──────────────────────────────────────────────────────
return [{
  json: {
    success:   true,
    timestamp: new Date().toISOString(),
    summary: {
      usa: {
        total_states:       statesArray.length,
        total_cqs:          usaTotalCqs,
        total_vqs_feasibles: usaTotalVqs,
        total_cqs_feasible: usaTotalFeasible,
        pct_feasible:       usaTotalCqs > 0
          ? Math.round((usaTotalFeasible / usaTotalCqs) * 10000) / 100
          : 0,
      },
      europe: {
        total_countries:    europeArray.length,
        total_cqs:          euTotalCqs,
        total_vqs_feasibles: euTotalVqs,
        total_cqs_feasible: euTotalFeasible,
        pct_feasible:       euTotalCqs > 0
          ? Math.round((euTotalFeasible / euTotalCqs) * 10000) / 100
          : 0,
      },
    },
    states:       statesArray,
    europe:       europeArray,
    cq_locations: cq_locations,
    cities:       cities,          // NEW: city-level data keyed by state code
  }
}]
