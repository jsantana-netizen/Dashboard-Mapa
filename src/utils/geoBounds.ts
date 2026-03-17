import usStatesGeoJson from '../data/us-states.geojson'

type Bbox = [number, number, number, number] // [west, south, east, north]

function coordsBbox(coords: unknown): Bbox {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity

  function walk(c: unknown): void {
    if (!Array.isArray(c)) return
    if (typeof c[0] === 'number') {
      const [lng, lat] = c as [number, number]
      if (lng < west)  west  = lng
      if (lng > east)  east  = lng
      if (lat < south) south = lat
      if (lat > north) north = lat
    } else {
      c.forEach(walk)
    }
  }

  walk(coords)
  return [west, south, east, north]
}

const stateBboxCache: Record<string, Bbox> = {}

;(function buildCache() {
  for (const feature of usStatesGeoJson.features) {
    const code = feature.properties?.code as string | undefined
    if (!code) continue
    const bbox = coordsBbox(
      (feature.geometry as GeoJSON.Geometry & { coordinates: unknown }).coordinates
    )
    stateBboxCache[code] = bbox
  }
})()

/** Returns [west, south, east, north] for a US state code, or null if not found. */
export function getStateBbox(stateCode: string): Bbox | null {
  return stateBboxCache[stateCode] ?? null
}
