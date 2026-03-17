import { useEffect, useRef } from 'react'
import { useCoverageStore } from '../store/coverageStore'
import { useUiStore } from '../store/uiStore'
import { fetchCoverageData } from '../services/webhookService'
import { buildMockDataset } from '../utils/mockData'

const POLL_INTERVAL_MS = parseInt(import.meta.env.VITE_POLL_INTERVAL_MS ?? '86400000', 10)
const ERROR_RETRY_MS = Math.min(15_000, POLL_INTERVAL_MS) // retry faster after errors
const USE_MOCK = !import.meta.env.VITE_WEBHOOK_URL

export function useWebhook(): void {
  const ingestFullRefresh = useCoverageStore(s => s.ingestFullRefresh)
  const setConnectionStatus = useUiStore(s => s.setConnectionStatus)
  const setLastReceivedAt = useUiStore(s => s.setLastReceivedAt)
  const manualRefreshTrigger = useUiStore(s => s.manualRefreshTrigger)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      if (cancelled) return

      setConnectionStatus('connecting')
      let nextDelay = POLL_INTERVAL_MS

      try {
        const dataset = USE_MOCK ? buildMockDataset() : await fetchCoverageData()
        if (!cancelled) {
          ingestFullRefresh(dataset)
          setConnectionStatus('connected')
          setLastReceivedAt(new Date().toISOString())
        }
      } catch (err) {
        // Log the actual error so it's visible in browser DevTools
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[webhook] fetch error — check VITE_WEBHOOK_URL and CORS headers:', msg)
        if (!cancelled) setConnectionStatus('error')
        nextDelay = ERROR_RETRY_MS // retry sooner after an error
      }

      if (!cancelled) {
        timerRef.current = setTimeout(poll, nextDelay)
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [ingestFullRefresh, setConnectionStatus, setLastReceivedAt, manualRefreshTrigger])
}
