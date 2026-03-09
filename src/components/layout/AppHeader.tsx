import { useCoverageStore } from '../../store/coverageStore'
import { useUiStore } from '../../store/uiStore'

export function AppHeader() {
  const dataset = useCoverageStore(s => s.dataset)
  const connectionStatus = useUiStore(s => s.connectionStatus)
  const triggerManualRefresh = useUiStore(s => s.triggerManualRefresh)

  const statusDot = () => {
    switch (connectionStatus) {
      case 'connected': return <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
      case 'connecting': return <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block animate-pulse" />
      case 'stale': return <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
      case 'error': return <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
      default: return <span className="w-2 h-2 rounded-full bg-gray-600 inline-block" />
    }
  }

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-gray-900 border-b border-gray-800 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 bg-cyan-500 rounded-md flex items-center justify-center">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-900">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
        </div>
        <span className="text-white font-semibold text-sm tracking-wide">Coverage Dashboard</span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400">
        {statusDot()}
        <span className="font-medium text-gray-300">
          {dataset?.periodLabel ?? '—'}
        </span>
        <span className="text-gray-600">·</span>
        <span>
          {connectionStatus === 'connected' && 'En vivo'}
          {connectionStatus === 'connecting' && 'Conectando…'}
          {connectionStatus === 'stale' && 'Datos desactualizados'}
          {connectionStatus === 'error' && 'Error de conexión'}
          {connectionStatus === 'idle' && 'Sin conexión'}
        </span>
        <button
          onClick={triggerManualRefresh}
          disabled={connectionStatus === 'connecting'}
          className="ml-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
          title="Actualizar datos ahora"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
          </svg>
          Actualizar
        </button>
      </div>
    </header>
  )
}
