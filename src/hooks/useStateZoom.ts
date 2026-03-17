import { useEffect, useRef } from 'react'
import type maplibregl from 'maplibre-gl'
import { useUiStore } from '../store/uiStore'
import { getStateBbox } from '../utils/geoBounds'

const USA_DEFAULT_CENTER: [number, number] = [-96, 38]
const USA_DEFAULT_ZOOM = 3.8

/**
 * Flies the map to the selected state's bounding box when a state is selected,
 * and flies back to the default continental US view when deselected.
 */
export function useStateZoom(
  mapRef: React.RefObject<maplibregl.Map | null>,
  isLoaded: boolean,
): void {
  const selectedStateCode = useUiStore(s => s.selectedStateCode)
  const prevCode = useRef<string | null>(null)

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const doZoom = () => {
      if (selectedStateCode) {
        const bbox = getStateBbox(selectedStateCode)
        if (bbox) {
          map.fitBounds(
            [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
            { padding: { top: 60, bottom: 60, left: 60, right: 60 }, duration: 900, maxZoom: 8 }
          )
        }
      } else if (prevCode.current !== null) {
        map.flyTo({ center: USA_DEFAULT_CENTER, zoom: USA_DEFAULT_ZOOM, duration: 900 })
      }
      prevCode.current = selectedStateCode
    }

    if (map.isStyleLoaded()) {
      doZoom()
    } else {
      map.once('load', doZoom)
    }
  }, [mapRef, isLoaded, selectedStateCode])
}
