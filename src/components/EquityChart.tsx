import React, { useState, useRef, useMemo } from 'react';
import { EquityPoint } from '../types/trade';
import { Calendar, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface EquityChartProps {
  equityPoints: EquityPoint[];
}

interface ChartPointData {
  date: string;
  equity: number;
  tradeMoney?: number;
  id?: string;
  setup?: string;
}

interface ChartPoint {
  x: number;
  y: number;
  data: ChartPointData;
  index: number;
}

export const EquityChart: React.FC<EquityChartProps> = ({ equityPoints }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const width = 800;
  const height = 300;
  const padding = { top: 30, right: 30, bottom: 45, left: 65 };

  const hasData = Boolean(equityPoints && equityPoints.length > 0);

  const { points, minVal, maxVal, pathString, areaString } = useMemo(() => {
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    if (!equityPoints || equityPoints.length === 0) {
      const flatMin = -500;
      const flatMax = 500;
      const zeroYPos = height - padding.bottom - 0.5 * chartHeight;
      const pts: ChartPoint[] = [
        { x: padding.left, y: zeroYPos, data: { date: 'Inicio', equity: 0 }, index: 0 },
        { x: width - padding.right, y: zeroYPos, data: { date: 'Hoy', equity: 0 }, index: 1 }
      ];
      const d = `M ${padding.left} ${zeroYPos} L ${width - padding.right} ${zeroYPos}`;
      const bottomY = height - padding.bottom;
      const area = `${d} L ${width - padding.right} ${bottomY} L ${padding.left} ${bottomY} Z`;

      return {
        points: pts,
        minVal: flatMin,
        maxVal: flatMax,
        pathString: d,
        areaString: area
      };
    }

    // Always include a starting baseline at $0
    const rawEquities = [0, ...equityPoints.map((p) => p.equity)];
    const rawMin = Math.min(...rawEquities);
    const rawMax = Math.max(...rawEquities);

    const range = Math.max(rawMax - rawMin, 500);
    const minCalculated = Math.floor((rawMin - range * 0.1) / 100) * 100;
    const maxCalculated = Math.ceil((rawMax + range * 0.1) / 100) * 100;

    // Build points starting from 0 baseline
    const allItems: ChartPointData[] = [
      { date: equityPoints[0]?.fecha || 'Inicio', equity: 0 },
      ...equityPoints.map((p) => ({
        date: p.fecha,
        equity: p.equity,
        tradeMoney: p.tradeMoney,
        id: p.id,
        setup: p.trade.setup
      }))
    ];

    const pts: ChartPoint[] = allItems.map((item, i) => {
      const x = padding.left + (i / Math.max(allItems.length - 1, 1)) * chartWidth;
      const normalizedY = (item.equity - minCalculated) / (maxCalculated - minCalculated);
      const y = height - padding.bottom - normalizedY * chartHeight;
      return { x, y, data: item, index: i };
    });

    if (pts.length === 0) {
      return { points: [], minVal: minCalculated, maxVal: maxCalculated, pathString: '', areaString: '' };
    }

    // Build smooth curve
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const bottomY = height - padding.bottom;
    const area = `${d} L ${pts[pts.length - 1].x} ${bottomY} L ${pts[0].x} ${bottomY} Z`;

    return {
      points: pts,
      minVal: minCalculated,
      maxVal: maxCalculated,
      pathString: d,
      areaString: area
    };
  }, [equityPoints]);

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : points[points.length - 1];

  // Grid lines
  const gridLines = useMemo(() => {
    const steps = 4;
    const lines = [];
    for (let i = 0; i <= steps; i++) {
      const val = minVal + (i / steps) * (maxVal - minVal);
      const y = height - padding.bottom - (i / steps) * (height - padding.top - padding.bottom);
      lines.push({ val, y });
    }
    return lines;
  }, [minVal, maxVal]);

  const zeroY = useMemo(() => {
    if (0 < minVal || 0 > maxVal) return null;
    const normalized = (0 - minVal) / (maxVal - minVal);
    return height - padding.bottom - normalized * (height - padding.top - padding.bottom);
  }, [minVal, maxVal]);

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/[0.08] shadow-2xl relative mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-white tracking-tight">
              Curva de Equity Acumulado
            </h2>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#E0B341]/10 text-[#E0B341] border border-[#E0B341]/20">
              Gold Growth Curve
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Evolución neta de las operaciones acumuladas ordenadas cronológicamente
          </p>
        </div>

        {/* Current Active Equity display */}
        <div className="flex items-center gap-4 bg-white/[0.03] px-4 py-2 rounded-2xl border border-white/[0.06] shrink-0">
          <div>
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Equity</span>
            <span className={`font-heading text-lg font-bold tabular-nums ${
              !hasData
                ? 'text-neutral-300'
                : (activePoint && activePoint.data.equity >= 0)
                  ? 'text-[#34C97A]'
                  : 'text-[#FF6B60]'
            }`}>
              {!hasData
                ? '$0.00'
                : `${activePoint && activePoint.data.equity >= 0 ? '+' : ''}$${(activePoint?.data.equity ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            </span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden select-none"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {/* Empty state message overlay */}
        {!hasData && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 pointer-events-none">
            <div className="px-4 py-2 rounded-2xl bg-[#0B0D12]/90 border border-[#E0B341]/30 backdrop-blur-md shadow-2xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E0B341]" />
              <span className="text-xs sm:text-sm font-medium text-neutral-300">
                Aún no hay trades. Registra el primero para ver tu curva.
              </span>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[360px] overflow-visible"
        >
          <defs>
            {/* Golden Gradient beneath line */}
            <linearGradient id="equityGoldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E0B341" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#E0B341" stopOpacity="0.15" />
              <stop offset="95%" stopColor="#E0B341" stopOpacity="0.01" />
              <stop offset="100%" stopColor="#0B0D12" stopOpacity="0" />
            </linearGradient>

            <filter id="goldGlowLine" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid lines */}
          {gridLines.map((line, idx) => (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={line.y}
                x2={width - padding.right}
                y2={line.y}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={line.y + 4}
                textAnchor="end"
                className="text-[10px] font-mono fill-neutral-500 tabular-nums"
              >
                ${line.val >= 0 ? '+' : ''}{Math.round(line.val)}
              </text>
            </g>
          ))}

          {/* Zero baseline */}
          {zeroY !== null && (
            <line
              x1={padding.left}
              y1={zeroY}
              x2={width - padding.right}
              y2={zeroY}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeDasharray="2 3"
              strokeWidth="1"
            />
          )}

          {/* Golden Area Gradient Fill */}
          {areaString && (
            <path
              d={areaString}
              fill="url(#equityGoldGrad)"
            />
          )}

          {/* Main Gold Line */}
          {pathString && (
            <path
              d={pathString}
              fill="none"
              stroke="#E0B341"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#goldGlowLine)"
            />
          )}

          {/* Hover Crosshair */}
          {hoveredIndex !== null && activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={padding.top}
                x2={activePoint.x}
                y2={height - padding.bottom}
                stroke="rgba(224, 179, 65, 0.5)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="6"
                fill="#E0B341"
                className="drop-shadow-[0_0_8px_rgba(224,179,65,0.8)]"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="3"
                fill="#0B0D12"
              />
            </g>
          )}

          {/* Interactive Dots & Touch zones */}
          {points.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIndex === i ? 5 : 3}
                fill={
                  pt.data.tradeMoney !== undefined
                    ? pt.data.tradeMoney >= 0 ? '#34C97A' : '#FF6B60'
                    : '#E0B341'
                }
                stroke="#0B0D12"
                strokeWidth="1.5"
              />
              {/* Hit area */}
              <rect
                x={pt.x - 20}
                y={padding.top}
                width={40}
                height={height - padding.top - padding.bottom}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onTouchStart={() => setHoveredIndex(i)}
              />
            </g>
          ))}

          {/* Dates along the bottom */}
          {points.length > 0 && (
            <g>
              <text
                x={points[0].x}
                y={height - padding.bottom + 20}
                textAnchor="start"
                className="text-[10px] font-mono fill-neutral-500"
              >
                {points[0].data.date}
              </text>
              {points.length > 2 && (
                <text
                  x={points[Math.floor(points.length / 2)].x}
                  y={height - padding.bottom + 20}
                  textAnchor="middle"
                  className="text-[10px] font-mono fill-neutral-500"
                >
                  {points[Math.floor(points.length / 2)].data.date}
                </text>
              )}
              <text
                x={points[points.length - 1].x}
                y={height - padding.bottom + 20}
                textAnchor="end"
                className="text-[10px] font-mono fill-neutral-500"
              >
                {points[points.length - 1].data.date}
              </text>
            </g>
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && activePoint && activePoint.data.tradeMoney !== undefined && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-75"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              top: `${Math.max(10, (activePoint.y / height) * 100 - 35)}%`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="glass-dropdown p-3 rounded-xl shadow-2xl border border-[#E0B341]/40 text-xs min-w-[200px]">
              <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-1.5 mb-1.5">
                <span className="font-mono text-[10px] text-[#E0B341] font-semibold truncate max-w-[120px]">
                  {activePoint.data.setup || activePoint.data.id}
                </span>
                <span className="text-[10px] text-neutral-400 flex items-center gap-1 font-mono shrink-0">
                  <Calendar className="w-3 h-3" />
                  {activePoint.data.date}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 text-[11px]">Resultado Trade:</span>
                  <span className={`font-mono font-bold ${
                    activePoint.data.tradeMoney >= 0 ? 'text-[#34C97A]' : 'text-[#FF6B60]'
                  }`}>
                    {activePoint.data.tradeMoney >= 0 ? '+' : ''}${activePoint.data.tradeMoney.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 text-[11px]">Equity Acumulado:</span>
                  <span className={`font-mono font-bold ${
                    activePoint.data.equity >= 0 ? 'text-[#34C97A]' : 'text-[#FF6B60]'
                  }`}>
                    {activePoint.data.equity >= 0 ? '+' : ''}${activePoint.data.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
