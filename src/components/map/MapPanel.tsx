import { useMap, USA_MAP_CONFIG } from '../../hooks/useMap'
import { useChoropleth } from '../../hooks/useChoropleth'
import { useMapInteraction } from '../../hooks/useMapInteraction'
import { useCqMarkers } from '../../hooks/useCqMarkers'
import { useStateZoom } from '../../hooks/useStateZoom'
import { useCityLayer } from '../../hooks/useCityLayer'
import { useUiStore } from '../../store/uiStore'
import { MapLegend } from './MapLegend'
import { MapTooltip } from './MapTooltip'
import 'maplibre-gl/dist/maplibre-gl.css'

export function MapPanel() {
  const { mapRef, containerRef, isLoaded } = useMap(USA_MAP_CONFIG)
  useChoropleth(mapRef, isLoaded, USA_MAP_CONFIG.sourceId, 'usa')
  useMapInteraction(mapRef, isLoaded, `${USA_MAP_CONFIG.sourceId}-fill`)
  useCqMarkers(mapRef, isLoaded, 'usa')
  useStateZoom(mapRef, isLoaded)
  useCityLayer(mapRef, isLoaded)

  const showCqMarkers    = useUiStore(s => s.showCqMarkers)
  const toggleCqMarkers  = useUiStore(s => s.toggleCqMarkers)
  const selectedStateCode = useUiStore(s => s.selectedStateCode)
  const selectState       = useUiStore(s => s.selectState)

  return (
    <div className="relative flex-1 bg-gray-950 min-w-0">
      <div style={{ position: 'absolute', inset: 0 }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>
      {isLoaded && (
        <>
          <MapLegend />
          <MapTooltip />

          {/* Back button — visible only when a state is zoomed in */}
          {selectedStateCode && (
            <button
              onClick={() => selectState(null)}
              className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-gray-900/90 border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
              </svg>
              Vista general
            </button>
          )}

          <button
            onClick={toggleCqMarkers}
            className={`absolute bottom-6 right-4 z-10 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showCqMarkers
                ? 'bg-cyan-700 border-cyan-500 text-white'
                : 'bg-gray-900/90 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
            }`}
          >
            {showCqMarkers ? 'Ocultar CQs' : 'Ver CQs'}
          </button>
        </>
      )}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-gray-600 text-sm">Cargando mapa…</span>
        </div>
      )}
    </div>
  )
}
