import React, { useEffect, useState } from 'react';
import { DashboardMetrics } from '../types/trade';
import { TrendingUp, Target, Scale, Zap, ArrowUpRight, ArrowDownRight, Award, Shield } from 'lucide-react';

interface HeroStatsProps {
  metrics: DashboardMetrics;
}

function useAnimatedNumber(target: number, duration: number = 1000, shouldAnimate: boolean = true): number {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!shouldAnimate || target === 0) {
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

  return shouldAnimate ? current : 0;
}

export const HeroStats: React.FC<HeroStatsProps> = ({ metrics }) => {
  const hasTrades = metrics.totalTrades > 0;
  const animatedNetProfit = useAnimatedNumber(metrics.netProfit, 1200, hasTrades);
  const animatedWinRate = useAnimatedNumber(metrics.winRate, 900, hasTrades);
  const animatedProfitFactor = useAnimatedNumber(metrics.profitFactor, 900, hasTrades);
  const animatedAvgRR = useAnimatedNumber(metrics.avgPlannedRR, 900, hasTrades);
  const animatedAvgRealR = useAnimatedNumber(metrics.avgRealR ?? 0, 900, hasTrades && metrics.avgRealR !== null && !isNaN(metrics.avgRealR));

  const isPositive = metrics.netProfit >= 0;

  return (
    <section className="relative pt-2 pb-6">
      {/* Background ambient gold glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 max-w-3xl h-64 bg-[#E0B341]/[0.05] blur-[120px] pointer-events-none rounded-full" />

      {/* Main Hero Card */}
      <div className="glass-panel relative rounded-3xl p-6 sm:p-8 lg:p-10 border border-white/[0.08] shadow-2xl overflow-hidden mb-6">
        {/* Subtle decorative gold top highlight */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#E0B341] to-transparent opacity-70" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8">
          
          {/* Left: Net Result Hero */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium">
              <span className="uppercase tracking-widest text-[#E0B341]">Portafolio XAU/USD</span>
              <span aria-hidden="true">·</span>
              <span>Cuentas Fondeadas</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#34C97A] flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34C97A] animate-pulse" />
                Live Sync
              </span>
            </div>

            <div className="pt-1">
              <p className="text-xs sm:text-sm text-neutral-400 font-medium">Resultado Neto Acumulado</p>
              <div className="flex items-baseline gap-3 mt-1">
                <h1 className={`font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight tabular-nums ${
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
                
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold ${
                  !hasTrades
                    ? 'bg-white/[0.05] text-neutral-400 border border-white/[0.08]'
                    : isPositive 
                      ? 'bg-[#34C97A]/15 text-[#34C97A] border border-[#34C97A]/30' 
                      : 'bg-[#FF6B60]/15 text-[#FF6B60] border border-[#FF6B60]/30'
                }`}>
                  {hasTrades && (isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />)}
                  <span>{metrics.winCount}W - {metrics.lossCount}L</span>
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-neutral-400 max-w-xl pt-1">
              Registro cuantitativo de operaciones en el oro spot contra dólar (XAU/USD). Control estricto de riesgo con backend en Google Sheets.
            </p>
          </div>

          {/* Right: Key Metric Cards Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:w-[400px] shrink-0">
            {/* Win Rate */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-[#E0B341]/30 transition-colors">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-xs font-medium">Win Rate</span>
                <Target className="w-3.5 h-3.5 text-[#E0B341]" />
              </div>
              <div className="font-heading text-2xl font-bold text-white tabular-nums">
                {!hasTrades || isNaN(metrics.winRate) ? '—' : `${animatedWinRate.toFixed(1)}%`}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                {metrics.winCount} de {metrics.totalTrades} ganados
              </div>
            </div>

            {/* Profit Factor */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-[#E0B341]/30 transition-colors">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-xs font-medium">Profit Factor</span>
                <Scale className="w-3.5 h-3.5 text-[#E0B341]" />
              </div>
              <div className="font-heading text-2xl font-bold text-[#E0B341] tabular-nums">
                {!hasTrades || isNaN(metrics.profitFactor) ? '—' : (metrics.grossLoss === 0 ? '∞' : animatedProfitFactor.toFixed(2))}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1 truncate">
                {!hasTrades ? '$0 / $0' : `$${metrics.grossProfit.toLocaleString()} / $${metrics.grossLoss.toLocaleString()}`}
              </div>
            </div>

            {/* R Real Promedio */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-[#E0B341]/30 transition-colors">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-xs font-medium">R Real Promedio</span>
                <TrendingUp className="w-3.5 h-3.5 text-[#34C97A]" />
              </div>
              <div className={`font-heading text-2xl font-bold tabular-nums ${
                !hasTrades || metrics.avgRealR === null || isNaN(metrics.avgRealR)
                  ? 'text-neutral-400'
                  : metrics.avgRealR >= 0
                    ? 'text-[#34C97A]'
                    : 'text-[#FF6B60]'
              }`}>
                {!hasTrades || metrics.avgRealR === null || isNaN(metrics.avgRealR)
                  ? '—'
                  : `${metrics.avgRealR >= 0 ? '+' : ''}${animatedAvgRealR.toFixed(2)}R`}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1 truncate">
                (Salida - Entrada) / |SL|
              </div>
            </div>

            {/* R:R Promedio Planeado */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-[#E0B341]/30 transition-colors">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-xs font-medium">R:R Planeado</span>
                <Zap className="w-3.5 h-3.5 text-[#E0B341]" />
              </div>
              <div className="font-heading text-2xl font-bold text-neutral-200 tabular-nums">
                {!hasTrades || metrics.avgPlannedRR === 0 || isNaN(metrics.avgPlannedRR) ? '—' : `1:${animatedAvgRR.toFixed(2)}`}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1 truncate">
                |TP-Entrada| / |Entrada-SL|
              </div>
            </div>

            {/* Total Trades */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-[#E0B341]/30 transition-colors col-span-2">
              <div className="flex items-center justify-between text-neutral-400 mb-1">
                <span className="text-xs font-medium">Total Operaciones</span>
                <Shield className="w-3.5 h-3.5 text-neutral-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <div className="font-heading text-2xl font-bold text-white tabular-nums">
                  {metrics.totalTrades ?? '—'}
                </div>
                <div className="text-[11px] text-neutral-400 font-mono">
                  {metrics.winCount} Ganadas · {metrics.lossCount} Perdidas
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
              {metrics.bestTrade && metrics.bestTrade.money != null && !isNaN(metrics.bestTrade.money)
                ? `+$${metrics.bestTrade.money.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                : '—'}
            </div>
            <span className="text-[11px] text-neutral-500 truncate block max-w-[220px] mt-0.5">
              {metrics.bestTrade ? `${metrics.bestTrade.setup || '—'} · ${metrics.bestTrade.fecha || '—'}` : 'Sin trades'}
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
              {metrics.worstTrade && metrics.worstTrade.money != null && !isNaN(metrics.worstTrade.money)
                ? `${metrics.worstTrade.money < 0 ? '-' : ''}$${Math.abs(metrics.worstTrade.money).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                : '—'}
            </div>
            <span className="text-[11px] text-neutral-500 truncate block max-w-[220px] mt-0.5">
              {metrics.worstTrade ? `${metrics.worstTrade.setup || '—'} · ${metrics.worstTrade.fecha || '—'}` : 'Sin trades'}
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
