import React, { useEffect, useState } from 'react';
import { DashboardMetrics } from '../types/trade';
import { TrendingUp, Target, Scale, Zap, ArrowUpRight, ArrowDownRight, FlaskConical, Shield } from 'lucide-react';

interface HeroStatsProps {
  metrics: DashboardMetrics;
  isBacktest?: boolean;
  activeBacktestName?: string;
  studyYear?: number;
}

function useAnimatedNumber(target: number, duration: number = 1000, shouldAnimate: boolean = true): number {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!shouldAnimate || target === 0 || isNaN(target)) {
      setCurrent(0);
      return;
    }

    let startTimestamp: number | null = null;
    const startValue = current;
    const diff = target - startValue;

    if (diff === 0) return;

    let animationFrameId: number;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCurrent(startValue + diff * ease);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [target, duration, shouldAnimate]);

  return shouldAnimate && !isNaN(current) ? current : 0;
}

export const HeroStats: React.FC<HeroStatsProps> = ({ 
  metrics, 
  isBacktest = false, 
  activeBacktestName = '',
  studyYear
}) => {
  const hasTrades = Boolean(metrics && metrics.totalTrades > 0);
  const netProfitValue = !isNaN(metrics?.netProfit) ? metrics.netProfit : 0;
  const animatedNetProfit = useAnimatedNumber(netProfitValue, 1200, hasTrades);
  const animatedWinRate = useAnimatedNumber(metrics?.winRate ?? 0, 900, hasTrades && !isNaN(metrics?.winRate));
  const animatedProfitFactor = useAnimatedNumber(metrics?.profitFactor ?? 0, 900, hasTrades && !isNaN(metrics?.profitFactor));
  const animatedAvgRR = useAnimatedNumber(metrics?.avgPlannedRR ?? 0, 900, hasTrades && !isNaN(metrics?.avgPlannedRR));
  const animatedAvgRealR = useAnimatedNumber(
    metrics?.avgRealR ?? 0, 
    900, 
    hasTrades && metrics?.avgRealR !== null && !isNaN(metrics?.avgRealR)
  );

  const isPositive = netProfitValue >= 0;

  return (
    <section className="relative pt-2 pb-6">
      {/* Background ambient glow (Violet in Backtest, Gold in Real) */}
      <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 max-w-3xl h-64 blur-[120px] pointer-events-none rounded-full transition-colors ${
        isBacktest ? 'bg-[#A855F7]/[0.08]' : 'bg-[#E0B341]/[0.05]'
      }`} />

      {/* Main Hero Card */}
      <div className={`glass-panel relative rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border shadow-2xl overflow-hidden mb-5 sm:mb-6 transition-all ${
        isBacktest ? 'border-[#A855F7]/25' : 'border-white/[0.08]'
      }`}>
        {/* Subtle decorative top highlight */}
        <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent to-transparent opacity-80 ${
          isBacktest ? 'via-[#A855F7]' : 'via-[#E0B341]'
        }`} />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 sm:gap-8">
          
          {/* Left: Net Result Hero */}
          <div className="space-y-2 min-w-0">
            {isBacktest ? (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium">
                <span className="uppercase tracking-widest text-[#C084FC] font-bold px-2 py-0.5 rounded-lg bg-[#A855F7]/15 border border-[#A855F7]/30 flex items-center gap-1 shadow-sm shadow-[#A855F7]/10">
                  <FlaskConical className="w-3.5 h-3.5 text-[#C084FC]" />
                  MODO BACKTEST
                </span>
                <span aria-hidden="true" className="text-neutral-500">·</span>
                <span className="text-white font-semibold">{activeBacktestName || 'Backtest'}</span>
                {studyYear && (
                  <>
                    <span aria-hidden="true" className="text-neutral-500">·</span>
                    <span className="text-[#C084FC] font-mono font-bold px-2 py-0.5 rounded-lg bg-[#A855F7]/10 border border-[#A855F7]/25">
                      Año {studyYear}
                    </span>
                  </>
                )}
                <span aria-hidden="true" className="text-neutral-500">·</span>
                <span className="text-[#C084FC] flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C084FC] animate-pulse" />
                  Simulación
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-neutral-400 font-medium">
                <span className="uppercase tracking-widest text-[#E0B341] font-semibold">Portafolio XAU/USD</span>
                <span aria-hidden="true">·</span>
                <span>Cuentas Fondeadas</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#34C97A] flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34C97A] animate-pulse" />
                  Live Sync
                </span>
              </div>
            )}

            <div className="pt-0.5 sm:pt-1">
              <p className="text-xs sm:text-sm text-neutral-400 font-medium">
                {isBacktest ? 'Resultado Backtest' : 'Resultado Neto Acumulado'}
              </p>
              <div className="flex flex-wrap items-baseline gap-2 sm:gap-3 mt-1">
                <h1 className={`font-heading text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight tabular-nums break-words ${
                  !hasTrades
                    ? 'text-neutral-300'
                    : isPositive
                      ? 'text-[#34C97A]'
                      : 'text-[#FF6B60]'
                }`}>
                  {!hasTrades
                    ? '$0.00'
                    : `${isPositive ? '+' : '-'}$${Math.abs(animatedNetProfit).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}`
                  }
                </h1>
                
                <div className={`flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl text-[11px] sm:text-xs font-semibold ${
                  !hasTrades
                    ? 'bg-white/[0.05] text-neutral-400 border border-white/[0.08]'
                    : isPositive 
                      ? 'bg-[#34C97A]/15 text-[#34C97A] border border-[#34C97A]/30' 
                      : 'bg-[#FF6B60]/15 text-[#FF6B60] border border-[#FF6B60]/30'
                }`}>
                  {hasTrades && (isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />)}
                  <span>{metrics?.winCount ?? 0}W - {metrics?.lossCount ?? 0}L</span>
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-neutral-400 max-w-xl pt-0.5 sm:pt-1 leading-relaxed">
              {isBacktest
                ? `Análisis de backtest cuantitativo para ${activeBacktestName || 'esta pestaña'}. Datos y métricas auditados de manera 100% aislada.`
                : 'Registro cuantitativo de operaciones en el oro spot contra dólar (XAU/USD). Control estricto de riesgo con backend en Google Sheets.'
              }
            </p>
          </div>

          {/* Right: Key Metric Cards Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:w-[400px] shrink-0">
            {/* Win Rate */}
            <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.03] border transition-colors ${
              isBacktest 
                ? 'border-white/[0.06] hover:border-[#A855F7]/40' 
                : 'border-white/[0.06] hover:border-[#E0B341]/30'
            }`}>
              <div className="flex items-center justify-between text-neutral-400 mb-0.5 sm:mb-1">
                <span className="text-[11px] sm:text-xs font-medium">Win Rate</span>
                <Target className={`w-3.5 h-3.5 ${isBacktest ? 'text-[#C084FC]' : 'text-[#E0B341]'}`} />
              </div>
              <div className="font-heading text-xl sm:text-2xl font-bold text-white tabular-nums">
                {!hasTrades || isNaN(metrics?.winRate) ? '—' : `${animatedWinRate.toFixed(1)}%`}
              </div>
              <div className="text-[10px] sm:text-[11px] text-neutral-500 mt-0.5 truncate">
                {metrics?.winCount ?? 0} de {metrics?.totalTrades ?? 0} ganados
              </div>
            </div>

            {/* Profit Factor */}
            <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.03] border transition-colors ${
              isBacktest 
                ? 'border-white/[0.06] hover:border-[#A855F7]/40' 
                : 'border-white/[0.06] hover:border-[#E0B341]/30'
            }`}>
              <div className="flex items-center justify-between text-neutral-400 mb-0.5 sm:mb-1">
                <span className="text-[11px] sm:text-xs font-medium">Profit Factor</span>
                <Scale className={`w-3.5 h-3.5 ${isBacktest ? 'text-[#C084FC]' : 'text-[#E0B341]'}`} />
              </div>
              <div className={`font-heading text-xl sm:text-2xl font-bold tabular-nums ${
                isBacktest ? 'text-[#C084FC]' : 'text-[#E0B341]'
              }`}>
                {!hasTrades || isNaN(metrics?.profitFactor) 
                  ? '—' 
                  : (metrics.grossLoss === 0 ? '∞' : animatedProfitFactor.toFixed(2))
                }
              </div>
              <div className="text-[10px] sm:text-[11px] text-neutral-500 mt-0.5 truncate">
                {!hasTrades 
                  ? '$0 / $0' 
                  : `$${(metrics?.grossProfit ?? 0).toLocaleString()} / $${(metrics?.grossLoss ?? 0).toLocaleString()}`
                }
              </div>
            </div>

            {/* R Real Promedio */}
            <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.03] border transition-colors ${
              isBacktest 
                ? 'border-white/[0.06] hover:border-[#A855F7]/40' 
                : 'border-white/[0.06] hover:border-[#E0B341]/30'
            }`}>
              <div className="flex items-center justify-between text-neutral-400 mb-0.5 sm:mb-1">
                <span className="text-[11px] sm:text-xs font-medium truncate">R Real Prom.</span>
                <TrendingUp className="w-3.5 h-3.5 text-[#34C97A] shrink-0" />
              </div>
              <div className={`font-heading text-xl sm:text-2xl font-bold tabular-nums ${
                !hasTrades || metrics?.avgRealR === null || isNaN(metrics?.avgRealR)
                  ? 'text-neutral-400'
                  : metrics.avgRealR >= 0
                    ? 'text-[#34C97A]'
                    : 'text-[#FF6B60]'
              }`}>
                {!hasTrades || metrics?.avgRealR === null || isNaN(metrics?.avgRealR)
                  ? '—'
                  : `${metrics.avgRealR >= 0 ? '+' : ''}${animatedAvgRealR.toFixed(2)}R`}
              </div>
              <div className="text-[10px] sm:text-[11px] text-neutral-500 mt-0.5 truncate">
                (Salida - Entrada) / |SL|
              </div>
            </div>

            {/* R:R Promedio Planeado */}
            <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.03] border transition-colors ${
              isBacktest 
                ? 'border-white/[0.06] hover:border-[#A855F7]/40' 
                : 'border-white/[0.06] hover:border-[#E0B341]/30'
            }`}>
              <div className="flex items-center justify-between text-neutral-400 mb-0.5 sm:mb-1">
                <span className="text-[11px] sm:text-xs font-medium truncate">R:R Planeado</span>
                <Zap className={`w-3.5 h-3.5 shrink-0 ${isBacktest ? 'text-[#C084FC]' : 'text-[#E0B341]'}`} />
              </div>
              <div className="font-heading text-xl sm:text-2xl font-bold text-neutral-200 tabular-nums">
                {!hasTrades || metrics?.avgPlannedRR === 0 || isNaN(metrics?.avgPlannedRR) 
                  ? '—' 
                  : `1:${animatedAvgRR.toFixed(2)}`
                }
              </div>
              <div className="text-[10px] sm:text-[11px] text-neutral-500 mt-0.5 truncate">
                |TP-Entrada| / |Entrada-SL|
              </div>
            </div>

            {/* Total Trades */}
            <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.03] border transition-colors col-span-2 ${
              isBacktest 
                ? 'border-white/[0.06] hover:border-[#A855F7]/40' 
                : 'border-white/[0.06] hover:border-[#E0B341]/30'
            }`}>
              <div className="flex items-center justify-between text-neutral-400 mb-0.5 sm:mb-1">
                <span className="text-[11px] sm:text-xs font-medium">Total Operaciones</span>
                <Shield className="w-3.5 h-3.5 text-neutral-400" />
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-heading text-xl sm:text-2xl font-bold text-white tabular-nums">
                  {metrics?.totalTrades ?? 0}
                </div>
                <div className="text-[10px] sm:text-[11px] text-neutral-400 font-mono truncate">
                  {metrics?.winCount ?? 0} Ganadas · {metrics?.lossCount ?? 0} Perdidas
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Best & Worst Trades Highlight */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Mejor Trade */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/[0.07] flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-400 font-medium block">Mejor Operación</span>
            <div className="font-heading text-xl font-bold text-[#34C97A] tabular-nums mt-0.5">
              {metrics?.bestTrade && metrics.bestTrade.money != null && !isNaN(metrics.bestTrade.money)
                ? `+$${metrics.bestTrade.money.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                : '—'}
            </div>
            <span className="text-[11px] text-neutral-500 truncate block max-w-[220px] mt-0.5">
              {metrics?.bestTrade ? `${metrics.bestTrade.setup || '—'} · ${metrics.bestTrade.fecha || '—'}` : 'Sin trades'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#34C97A]/15 border border-[#34C97A]/30 flex items-center justify-center text-[#34C97A]">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Peor Trade */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/[0.07] flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-400 font-medium block">Peor Operación</span>
            <div className="font-heading text-xl font-bold text-[#FF6B60] tabular-nums mt-0.5">
              {metrics?.worstTrade && metrics.worstTrade.money != null && !isNaN(metrics.worstTrade.money)
                ? `${metrics.worstTrade.money < 0 ? '-' : ''}$${Math.abs(metrics.worstTrade.money).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                : '—'}
            </div>
            <span className="text-[11px] text-neutral-500 truncate block max-w-[220px] mt-0.5">
              {metrics?.worstTrade ? `${metrics.worstTrade.setup || '—'} · ${metrics.worstTrade.fecha || '—'}` : 'Sin trades'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#FF6B60]/15 border border-[#FF6B60]/30 flex items-center justify-center text-[#FF6B60]">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>
      </div>
    </section>
  );
};
