import { create } from 'zustand'
import type { StateCode, Region } from '../types/coverage.types'
import type { TooltipState } from '../types/ui.types'
import type { ConnectionStatus } from '../types/webhook.types'

interface UiState {
  activeRegion: Region
  selectedStateCode: StateCode | null
  hoveredStateCode: StateCode | null
  tooltip: TooltipState
  connectionStatus: ConnectionStatus
  lastReceivedAt: string | null
  showCqMarkers: boolean
  manualRefreshTrigger: number

  setActiveRegion: (region: Region) => void
  selectState: (code: StateCode | null) => void
  hoverState: (code: StateCode | null, x?: number, y?: number) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  setLastReceivedAt: (ts: string) => void
  toggleCqMarkers: () => void
  triggerManualRefresh: () => void
}

export const useUiStore = create<UiState>((set) => ({
  activeRegion: 'usa',
  selectedStateCode: null,
  hoveredStateCode: null,
  tooltip: { visible: false, stateCode: null, anchorX: 0, anchorY: 0 },
  connectionStatus: 'idle',
  lastReceivedAt: null,
  showCqMarkers: false,
  manualRefreshTrigger: 0,

  setActiveRegion: (region) => set({ activeRegion: region, selectedStateCode: null }),

  selectState: (code) => set({ selectedStateCode: code }),

  hoverState: (code, x = 0, y = 0) =>
    set({
      hoveredStateCode: code,
      tooltip: {
        visible: code !== null,
        stateCode: code,
        anchorX: x,
        anchorY: y,
      },
    }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setLastReceivedAt: (ts) => set({ lastReceivedAt: ts }),

  toggleCqMarkers: () => set((s) => ({ showCqMarkers: !s.showCqMarkers })),

  triggerManualRefresh: () => set((s) => ({ manualRefreshTrigger: s.manualRefreshTrigger + 1 })),
}))
