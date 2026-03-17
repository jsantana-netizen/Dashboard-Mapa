import { useCoverageStore } from '../../store/coverageStore'
import { useUiStore } from '../../store/uiStore'
import { CoverageGauge } from './CoverageGauge'
import { formatCount } from '../../utils/formatters'
import { TIER_COLORS, classifyTier } from '../../utils/coverageClassifier'

export function StateDetailCard() {
  const selectedStateCode   = useUiStore(s => s.selectedStateCode)
  const selectState         = useUiStore(s => s.selectState)
  const getRecord           = useCoverageStore(s => s.getRecord)
  const getCitiesForState   = useCoverageStore(s => s.getCitiesForState)

  if (!selectedStateCode) return null
  const record = getRecord(selectedStateCode)
  if (!record) return null

  const tier = classifyTier(record.coverageRatio)
  const tierColor = TIER_COLORS[tier]
  const cities = getCitiesForState(selectedStateCode)

  // Bar widths relative to customerQuotes
  const maxBar = Math.max(record.customerQuotes, record.cqsWithFeasibleVQ * 20)
  const cqPct  = maxBar > 0 ? Math.min((record.customerQuotes / maxBar) * 100, 100) : 0
  const feasiblePct = record.customerQuotes > 0
    ? Math.min((record.cqsWithFeasibleVQ / record.customerQuotes) * 100 * 5, 100)
    : 0

  return (
    <div className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white">{record.stateName}</h2>
            <span className="text-xs px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 border border-gray-700">
              {record.region === 'europe' ? 'Europa' : 'USA'}
            </span>
          </div>
          <span className="text-xs text-gray-500">{record.statusCobertura}</span>
        </div>
        <button
          onClick={() => selectState(null)}
          className="text-gray-600 hover:text-gray-400 transition-colors p-1"
          aria-label="Cerrar detalle"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      {/* Gauge */}
      <div className="flex justify-center">
        <CoverageGauge ratio={record.coverageRatio} />
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Total CQs',    value: formatCount(record.customerQuotes) },
          { label: 'Total VQs',    value: formatCount(record.vendorQuotes) },
          { label: 'CQs factibles', value: formatCount(record.cqsWithFeasibleVQ), color: tierColor },
          { label: 'Vendors',      value: formatCount(record.vendorsWithCoverage) },
          { label: 'Ubicaciones',  value: formatCount(record.locations) },
          { label: 'Factibilidad', value: record.pctFeasible.toFixed(1) + '%', color: tierColor },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-800/50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-sm font-semibold tabular-nums" style={{ color: color ?? '#f9fafb' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Demand vs feasible bar */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Demanda vs cobertura</p>
        <div className="space-y-1.5">
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>CQs totales</span>
              <span className="text-gray-300 tabular-nums">{formatCount(record.customerQuotes)}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${cqPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>CQs con VQ factible</span>
              <span className="tabular-nums" style={{ color: tierColor }}>
                {formatCount(record.cqsWithFeasibleVQ)}
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${feasiblePct}%`, backgroundColor: tierColor }} />
            </div>
          </div>
        </div>
      </div>

      {/* City breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Ciudades</p>
          {cities.length > 0 && (
            <span className="text-xs text-gray-600">{cities.length} ciudades</span>
          )}
        </div>

        {cities.length === 0 && (
          <p className="text-xs text-gray-600 py-1">Sin datos de ciudades</p>
        )}

        {cities.map(city => {
          const cityTier  = classifyTier(city.customerQuotes > 0 ? city.pctFeasible / 100 : null)
          const cityColor = TIER_COLORS[cityTier]
          const barWidth  = cities[0].customerQuotes > 0
            ? Math.round((city.customerQuotes / cities[0].customerQuotes) * 100)
            : 0
          return (
            <div key={city.city} className="bg-gray-800/40 rounded-lg px-3 py-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-200 truncate">{city.city}</span>
                <span className="text-xs tabular-nums flex-shrink-0" style={{ color: cityColor }}>
                  {city.pctFeasible.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-700 rounded-full h-1">
                  <div
                    className="h-1 rounded-full"
                    style={{ width: `${barWidth}%`, backgroundColor: cityColor }}
                  />
                </div>
                <span className="text-xs text-gray-500 tabular-nums w-12 text-right flex-shrink-0">
                  {formatCount(city.customerQuotes)} CQ
                </span>
              </div>
              <div className="flex gap-2 text-xs text-gray-600">
                <span>{formatCount(city.cqsWithFeasibleVQ)} factibles</span>
                <span>·</span>
                <span>{formatCount(city.vendorQuotes)} VQs</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
