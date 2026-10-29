import React, { useState, useMemo } from 'react';
import { Trade } from '../types/trade';
import { calculateMonthlyRecords, MonthlyRecord } from '../utils/monthlyMetrics';
import { formatPrice } from '../utils/tradeCalculation';
import {
  Calendar,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  X,
  Target,
  Zap,
  ShieldAlert,
  Percent,
  Layers,
  Sparkles
} from 'lucide-react';

interface MonthlyPerformanceProps {
  trades: Trade[];
  isBacktest?: boolean;
  studyYear?: number;
  onSelectTrade: (trade: Trade) => void;
}

export const MonthlyPerformance: React.FC<MonthlyPerformanceProps> = ({
  trades,
  isBacktest = false,
  studyYear,
  onSelectTrade
}) => {
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedMonthDetail, setSelectedMonthDetail] = useState<MonthlyRecord | null>(null);
  const [hoveredMonthKey, setHoveredMonthKey] = useState<string | null>(null);

  // Compute records
  const allRecords = useMemo(() => calculateMonthlyRecords(trades), [trades]);

  // Available unique years
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    allRecords.forEach((r) => set.add(r.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [allRecords]);

  // Auto-sync year filter with studyYear if available
  React.useEffect(() => {
    if (studyYear && availableYears.includes(studyYear)) {
      setSelectedYear(studyYear);
    }
  }, [studyYear, availableYears]);

  // Filtered by year
  const filteredRecords = useMemo(() => {
    if (selectedYear === 'all') return allRecords;
    return allRecords.filter((r) => r.year === selectedYear);
  }, [allRecords, selectedYear]);

  // Chronological order for chart (oldest to newest)
  const chartRecords = useMemo(() => {
    return [...filteredRecords].reverse();
  }, [filteredRecords]);

  // Aggregated totals
  const aggregates = useMemo(() => {
    if (filteredRecords.length === 0) return null;
    const totalTrades = filteredRecords.reduce((sum, r) => sum + r.totalTrades, 0);
    const totalProfit = filteredRecords.reduce((sum, r) => sum + r.netProfit, 0);
    const positiveMonths = filteredRecords.filter((r) => r.netProfit >= 0).length;
    const totalWins = filteredRecords.reduce((sum, r) => sum + r.winCount, 0);
    const overallWinRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    const avgExpectancy = totalTrades > 0 ? totalProfit / totalTrades : 0;

    return {
      totalMonths: filteredRecords.length,
      totalTrades,
      totalProfit: Math.round(totalProfit * 100) / 100,
      positiveMonths,
      monthlyWinRate: Math.round((positiveMonths / filteredRecords.length) * 100),
      overallWinRate: Math.round(overallWinRate * 10) / 10,
      avgExpectancy: Math.round(avgExpectancy * 100) / 100
    };
  }, [filteredRecords]);

  if (!trades || trades.length === 0) {
    return null;
  }

  // Accent styles
  const accentBorder = isBacktest ? 'border-[#A855F7]/30' : 'border-[#E0B341]/30';
  const accentBg = isBacktest ? 'bg-[#A855F7]/10' : 'bg-[#E0B341]/10';
  const accentText = isBacktest ? 'text-[#C084FC]' : 'text-[#E0B341]';

  // Chart scaling calculations
  const maxAbsPnL = Math.max(
    ...chartRecords.map((r) => Math.abs(r.netProfit)),
    100
  );

  return (
    <section className={`glass-panel rounded-3xl p-4 sm:p-7 border ${accentBorder} shadow-2xl relative overflow-hidden backdrop-blur-xl mb-6 sm:mb-8 transition-all`}>
      {/* Decorative ambient gradient */}
      <div 
        className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-15 ${
          isBacktest ? 'bg-[#A855F7]' : 'bg-[#E0B341]'
        }`} 
      />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/[0.08] relative z-10">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl ${accentBg} border ${accentBorder} flex items-center justify-center ${accentText} shrink-0 shadow-lg`}>
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading text-lg sm:text-xl font-bold text-white tracking-tight">
                Rendimiento Mensual
              </h3>
              <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${
                isBacktest 
                  ? 'bg-[#A855F7]/15 border-[#A855F7]/30 text-[#C084FC]' 
                  : 'bg-[#E0B341]/15 border-[#E0B341]/30 text-[#E0B341]'
              }`}>
                {isBacktest ? 'Backtest' : 'Cuenta Real'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Evolución gráfica mes a mes con <strong className="text-neutral-200">Esperanza Matemática</strong> y desglose detallado
            </p>
          </div>
        </div>

        {/* Year Selector */}
        {availableYears.length > 0 && (
          <div className="flex items-center bg-black/40 border border-white/[0.08] rounded-xl p-1 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setSelectedYear('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                selectedYear === 'all'
                  ? `${accentBg} ${accentText} border border-current shadow-sm`
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todos los años
            </button>
            {availableYears.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  selectedYear === yr
                    ? `${accentBg} ${accentText} border border-current shadow-sm`
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Aggregated KPI Strip */}
      {aggregates && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/[0.06]">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block">P&L Neto Total</span>
            <span className={`font-heading text-xl font-bold block mt-1 ${aggregates.totalProfit >= 0 ? 'text-[#3BD87F]' : 'text-[#FF6B60]'}`}>
              {aggregates.totalProfit >= 0 ? '+' : ''}${formatPrice(aggregates.totalProfit)}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono mt-0.5 block">
              En {aggregates.totalMonths} {aggregates.totalMonths === 1 ? 'mes' : 'meses'} ({aggregates.totalTrades} trades)
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/[0.06]">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block">Meses Ganadores</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-heading text-xl font-bold text-white">
                {aggregates.positiveMonths} / {aggregates.totalMonths}
              </span>
              <span className={`text-xs font-mono font-bold ${aggregates.monthlyWinRate >= 50 ? 'text-[#3BD87F]' : 'text-amber-400'}`}>
                ({aggregates.monthlyWinRate}%)
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono mt-0.5 block">
              Consistencia mensual
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/[0.06]">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block">Win Rate Global</span>
            <span className="font-heading text-xl font-bold text-white block mt-1">
              {aggregates.overallWinRate}%
            </span>
            <span className="text-[10px] text-neutral-400 font-mono mt-0.5 block">
              Acierto acumulado
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-amber-300 font-bold flex items-center gap-1">
                <Target className="w-3 h-3" />
                Esperanza Media
              </span>
            </div>
            <span className={`font-heading text-xl font-bold block mt-1 ${aggregates.avgExpectancy >= 0 ? 'text-[#3BD87F]' : 'text-[#FF6B60]'}`}>
              {aggregates.avgExpectancy >= 0 ? '+' : ''}${formatPrice(aggregates.avgExpectancy)}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono mt-0.5 block">
              Por operación ejecutada
            </span>
          </div>
        </div>
      )}

      {/* 1. VISUAL MONTHLY BAR CHART */}
      {chartRecords.length > 0 && (
        <div className="my-6 p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/[0.08]">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-neutral-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Gráfica de P&L Mensual ($)
              </h4>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              Pasa el cursor o pulsa una barra para ver detalles
            </span>
          </div>

          {/* Chart Container */}
          <div className="h-44 sm:h-52 w-full flex items-end gap-2 sm:gap-4 pt-6 pb-2 px-2 border-b border-white/[0.08] relative">
            {/* Zero Line */}
            <div className="absolute left-0 right-0 top-1/2 border-t border-white/[0.12] border-dashed pointer-events-none z-0" />

            {chartRecords.map((record) => {
              const isProfit = record.netProfit >= 0;
              const heightPercent = Math.min(
                Math.max((Math.abs(record.netProfit) / maxAbsPnL) * 45, 8),
                48
              );
              const isHovered = hoveredMonthKey === record.key;

              return (
                <div
                  key={record.key}
                  className="flex-1 flex flex-col items-center h-full justify-center relative group cursor-pointer"
                  onMouseEnter={() => setHoveredMonthKey(record.key)}
                  onMouseLeave={() => setHoveredMonthKey(null)}
                  onClick={() => setSelectedMonthDetail(record)}
                >
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div className="absolute -top-12 z-20 bg-neutral-900 border border-white/20 text-white px-2.5 py-1.5 rounded-xl shadow-2xl text-[10px] font-mono whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95">
                      <div className="font-bold">{record.monthLabel}</div>
                      <div className={isProfit ? 'text-[#3BD87F]' : 'text-[#FF6B60]'}>
                        {isProfit ? '+' : ''}${formatPrice(record.netProfit)} • {record.winRate}% WR
                      </div>
                    </div>
                  )}

                  {/* Positive Bar (Upper half) */}
                  <div className="w-full h-1/2 flex items-end justify-center">
                    {isProfit && (
                      <div
                        className={`w-full max-w-[42px] rounded-t-lg transition-all duration-300 relative ${
                          isHovered 
                            ? 'bg-[#3BD87F] shadow-lg shadow-[#3BD87F]/30 scale-105' 
                            : 'bg-gradient-to-t from-[#3BD87F]/80 to-[#3BD87F]'
                        }`}
                        style={{ height: `${heightPercent * 2}%` }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-[#3BD87F] hidden sm:block">
                          +${Math.round(record.netProfit)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Negative Bar (Lower half) */}
                  <div className="w-full h-1/2 flex items-start justify-center">
                    {!isProfit && (
                      <div
                        className={`w-full max-w-[42px] rounded-b-lg transition-all duration-300 relative ${
                          isHovered 
                            ? 'bg-[#FF6B60] shadow-lg shadow-[#FF6B60]/30 scale-105' 
                            : 'bg-gradient-to-b from-[#FF6B60]/80 to-[#FF6B60]'
                        }`}
                        style={{ height: `${heightPercent * 2}%` }}
                      >
                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-[#FF6B60] hidden sm:block">
                          -${Math.round(Math.abs(record.netProfit))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Month Labels under chart */}
          <div className="flex gap-2 sm:gap-4 px-2 pt-2">
            {chartRecords.map((r) => (
              <div 
                key={r.key} 
                onClick={() => setSelectedMonthDetail(r)}
                className="flex-1 text-center cursor-pointer hover:text-white transition-colors"
              >
                <span className={`text-[10px] font-mono block font-medium truncate ${
                  hoveredMonthKey === r.key ? 'text-white font-bold' : 'text-neutral-400'
                }`}>
                  {r.shortLabel}
                </span>
                <span className="text-[9px] font-mono text-neutral-400 block">
                  {r.totalTrades}tr
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. MONTHLY CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecords.map((record) => {
          const isProfit = record.netProfit >= 0;
          const borderTint = isProfit 
            ? 'border-[#3BD87F]/20 hover:border-[#3BD87F]/40' 
            : 'border-[#FF6B60]/20 hover:border-[#FF6B60]/40';
          const bgGradient = isProfit 
            ? 'from-[#3BD87F]/[0.06] via-black/40 to-black/20' 
            : 'from-[#FF6B60]/[0.06] via-black/40 to-black/20';

          return (
            <div
              key={record.key}
              className={`p-5 rounded-2xl bg-gradient-to-b ${bgGradient} border ${borderTint} transition-all duration-200 hover:-translate-y-0.5 shadow-lg flex flex-col justify-between`}
            >
              <div>
                {/* Month Title & Net Profit */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isProfit 
                        ? 'bg-[#3BD87F]/15 text-[#3BD87F] border border-[#3BD87F]/30' 
                        : 'bg-[#FF6B60]/15 text-[#FF6B60] border border-[#FF6B60]/30'
                    }`}>
                      {String(record.month).padStart(2, '0')}
                    </div>
                    <div>
                      <h4 className="font-heading text-base font-bold text-white leading-tight">
                        {record.monthLabel}
                      </h4>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {record.totalTrades} {record.totalTrades === 1 ? 'operación' : 'operaciones'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-neutral-400 block uppercase">P&L Neto</span>
                    <span className={`font-heading text-lg font-black ${isProfit ? 'text-[#3BD87F]' : 'text-[#FF6B60]'}`}>
                      {isProfit ? '+' : ''}${formatPrice(record.netProfit)}
                    </span>
                  </div>
                </div>

                {/* SPOTLIGHT: Esperanza Matemática (The Key Institutional Edge) */}
                <div className="my-3 p-3 rounded-xl bg-black/60 border border-white/[0.08]">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-amber-400" />
                      Esperanza Matemática
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">Edge / Trade</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/[0.06]">
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-mono">Por Dinero ($)</span>
                      <span className={`font-mono text-sm font-bold ${record.expectancyMoney >= 0 ? 'text-[#3BD87F]' : 'text-[#FF6B60]'}`}>
                        {record.expectancyMoney >= 0 ? '+' : ''}${formatPrice(record.expectancyMoney)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-mono">Por Ratio (R)</span>
                      <span className={`font-mono text-sm font-bold ${
                        record.expectancyR !== null && record.expectancyR >= 0 ? 'text-amber-400' : 'text-neutral-300'
                      }`}>
                        {record.expectancyR !== null 
                          ? `${record.expectancyR >= 0 ? '+' : ''}${record.expectancyR}R` 
                          : 'N/D'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quantitative 4-Grid Breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Win Rate */}
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.06]">
                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                      <span>Win Rate</span>
                      <span className="font-mono font-bold text-white">{record.winRate}%</span>
                    </div>
                    <div className="w-full bg-white/[0.08] h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div 
                        className="bg-[#3BD87F] h-full" 
                        style={{ width: `${Math.min(record.winRate, 100)}%` }} 
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono mt-1 text-neutral-400">
                      <span className="text-[#3BD87F] font-bold">{record.winCount}W</span>
                      {record.breakevenCount > 0 && <span>{record.breakevenCount}BE</span>}
                      <span className="text-[#FF6B60] font-bold">{record.lossCount}L</span>
                    </div>
                  </div>

                  {/* Payoff Ratio */}
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.06]">
                    <span className="text-[11px] text-neutral-400 block">Payoff Ratio</span>
                    <span className={`font-mono text-sm font-bold block mt-1 ${record.payoffRatio >= 1.5 ? 'text-[#3BD87F]' : 'text-neutral-200'}`}>
                      {record.payoffRatio}:1
                    </span>
                    <span className="text-[10px] text-neutral-400 block mt-1 truncate">
                      P. Factor: <strong className="text-white">{record.profitFactor}</strong>
                    </span>
                  </div>

                  {/* Drawdown */}
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.06] col-span-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#FF6B60]" />
                      <span>Max Drawdown del Mes:</span>
                    </div>
                    <span className="font-mono font-bold text-[#FF6B60] text-xs">
                      -${formatPrice(record.maxDrawdown)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-[11px] text-neutral-400 font-mono">
                  Real R prom: <strong className="text-amber-400">{record.avgRealR !== null ? `${record.avgRealR}R` : 'N/A'}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMonthDetail(record)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/[0.08] transition-colors flex items-center gap-1"
                >
                  <span>Ver {record.totalTrades} trades</span>
                  <ChevronRight className="w-3 h-3 text-neutral-400" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Month Trade Explorer */}
      {selectedMonthDetail && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedMonthDetail(null)}
        >
          <div 
            className="glass-panel w-full max-w-3xl max-h-[90vh] rounded-3xl border border-white/[0.15] bg-[#0E1015]/95 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl ${accentBg} border ${accentBorder} flex items-center justify-center ${accentText} font-bold`}>
                  {String(selectedMonthDetail.month).padStart(2, '0')}
                </div>
                <div>
                  <h4 className="font-heading text-lg font-bold text-white">
                    Operaciones de {selectedMonthDetail.monthLabel}
                  </h4>
                  <p className="text-xs text-neutral-400">
                    {selectedMonthDetail.totalTrades} trades • P&L Neto: 
                    <span className={`ml-1 font-bold ${selectedMonthDetail.netProfit >= 0 ? 'text-[#3BD87F]' : 'text-[#FF6B60]'}`}>
                      {selectedMonthDetail.netProfit >= 0 ? '+' : ''}${formatPrice(selectedMonthDetail.netProfit)}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMonthDetail(null)}
                className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Trades List */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-white/[0.06]">
              {selectedMonthDetail.trades.map((t, idx) => {
                const isWin = (t.money ?? 0) > 0;
                const isLoss = (t.money ?? 0) < 0;

                return (
                  <div
                    key={t.id || idx}
                    onClick={() => {
                      onSelectTrade(t);
                      setSelectedMonthDetail(null);
                    }}
                    className="py-3 px-3 rounded-xl hover:bg-white/[0.04] cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        isWin ? 'bg-[#3BD87F]/20 text-[#3BD87F]' : isLoss ? 'bg-[#FF6B60]/20 text-[#FF6B60]' : 'bg-neutral-500/20 text-neutral-400'
                      }`}>
                        {isWin ? 'W' : isLoss ? 'L' : 'BE'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-white">{t.fecha}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            t.direccion === 'Buy' ? 'bg-[#3BD87F]/15 text-[#3BD87F]' : 'bg-[#FF6B60]/15 text-[#FF6B60]'
                          }`}>
                            {t.direccion}
                          </span>
                          <span className="text-xs text-neutral-300 font-medium truncate">{t.setup || 'Sin setup'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5 font-mono">
                          <span>{t.sesion}</span>
                          <span>•</span>
                          <span>Entrada: {t.entrada}</span>
                          {t.salida && <span>• Salida: {t.salida}</span>}
                          {t.rReal !== null && (
                            <>
                              <span>•</span>
                              <span className="text-amber-400 font-semibold">{t.rReal}R</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div>
                        <span className={`font-mono text-sm font-bold block ${isWin ? 'text-[#3BD87F]' : isLoss ? 'text-[#FF6B60]' : 'text-neutral-400'}`}>
                          {isWin ? '+' : ''}${formatPrice(t.money)}
                        </span>
                        {t.emotion && (
                          <span className="text-[10px] text-neutral-400 block">{t.emotion}</span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/[0.08] bg-black/40 flex items-center justify-between text-xs text-neutral-400">
              <span>Haz clic en un trade para abrir su ficha completa.</span>
              <button
                type="button"
                onClick={() => setSelectedMonthDetail(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
