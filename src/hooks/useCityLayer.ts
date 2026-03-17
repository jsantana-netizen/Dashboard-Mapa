import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { useCoverageStore } from '../store/coverageStore'
import { useUiStore } from '../store/uiStore'
import { classifyTier, TIER_COLORS } from '../utils/coverageClassifier'

const SOURCE_ID    = 'cities-usa'
const LAYER_ID     = 'cities-usa-layer'
const LABEL_LAYER  = 'cities-usa-labels'

/**
 * Adds a circle layer showing city-level CQ/VQ data for the selected US state.
 * Circles appear when a state is selected and disappear when deselected.
 */
export function useCityLayer(
  mapRef: React.RefObject<maplibregl.Map | null>,
  isLoaded: boolean,
): void {
  const getCitiesForState = useCoverageStore(s => s.getCitiesForState)
  const citiesByState     = useCoverageStore(s => s.citiesByState)
  const selectedStateCode = useUiStore(s => s.selectedStateCode)
  const popupRef = useRef<maplibregl.Popup | null>(null)

  // Create source + layers once on map load
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const setup = () => {
      if (map.getSource(SOURCE_ID)) return

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'customerQuotes'],
            0, 6, 50, 10, 200, 16, 500, 22, 1000, 28,
          ],
          'circle-color':         ['get', 'tierColor'],
          'circle-opacity':        0.85,
          'circle-stroke-width':   1.5,
          'circle-stroke-color':   '#0f172a',
        },
      })

      map.addLayer({
        id: LABEL_LAYER,
        type: 'symbol',
        source: SOURCE_ID,
        layout: {
          visibility: 'none',
          'text-field':    ['get', 'city'],
          'text-font':     ['Open Sans Regular'],
          'text-size':     10,
          'text-offset':   [0, 1.6],
          'text-anchor':   'top',
          'text-optional': true,
        },
        paint: {
          'text-color':       '#e5e7eb',
          'text-halo-color':  '#111827',
          'text-halo-width':  1,
        },
      })

      // Hover popup
      map.on('mouseenter', LAYER_ID, (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (!e.features?.length) return
        map.getCanvas().style.cursor = 'pointer'
        const p = e.features[0].properties as Record<string, unknown>
        const pct = (p.pctFeasible as number).toFixed(1)
        const color = p.tierColor as string
        popupRef.current?.remove()
        popupRef.current = new maplibregl.Popup({ closeButton: false, offset: 12 })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family:sans-serif;font-size:12px;line-height:1.6;min-width:150px">
              <div style="font-weight:600;font-size:13px;margin-bottom:4px">${p.city}</div>
              <div style="display:flex;justify-content:space-between;gap:12px">
                <span style="color:#9ca3af">CQs</span>
                <span style="color:#f9fafb;font-weight:600">${p.customerQuotes}</span>
              </div>
              <div style="display:flex;justify-content:space-between;gap:12px">
                <span style="color:#9ca3af">VQs factibles</span>
                <span style="color:#f9fafb;font-weight:600">${p.vendorQuotes}</span>
              </div>
              <div style="display:flex;justify-content:space-between;gap:12px">
                <span style="color:#9ca3af">Factibilidad</span>
                <span style="font-weight:600;color:${color}">${pct}%</span>
              </div>
              <div style="display:flex;justify-content:space-between;gap:12px">
                <span style="color:#9ca3af">Ubicaciones</span>
                <span style="color:#f9fafb">${p.locations}</span>
              </div>
            </div>
          `)
          .addTo(map)
      })

      map.on('mouseleave', LAYER_ID, () => {
        map.getCanvas().style.cursor = ''
        popupRef.current?.remove()
        popupRef.current = null
      })
    }

    if (map.isStyleLoaded()) setup()
    else map.once('load', setup)
  }, [mapRef, isLoaded])

  // Update data + visibility when selected state changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded() || !map.getSource(SOURCE_ID)) return

    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource

    if (!selectedStateCode) {
      map.setLayoutProperty(LAYER_ID,    'visibility', 'none')
      map.setLayoutProperty(LABEL_LAYER, 'visibility', 'none')
      source.setData({ type: 'FeatureCollection', features: [] })
      return
    }

    const cities   = getCitiesForState(selectedStateCode)
    const features = cities.map(c => {
      const tier = classifyTier(c.customerQuotes > 0 ? c.pctFeasible / 100 : null)
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] },
        properties: {
          city:             c.city,
          customerQuotes:   c.customerQuotes,
          cqsWithFeasibleVQ: c.cqsWithFeasibleVQ,
          vendorQuotes:     c.vendorQuotes,
          pctFeasible:      c.pctFeasible,
          locations:        c.locations,
          tierColor:        TIER_COLORS[tier],
        },
      }
    })

    source.setData({ type: 'FeatureCollection', features })
    map.setLayoutProperty(LAYER_ID,    'visibility', 'visible')
    map.setLayoutProperty(LABEL_LAYER, 'visibility', 'visible')
  }, [mapRef, isLoaded, selectedStateCode, citiesByState, getCitiesForState])
}
