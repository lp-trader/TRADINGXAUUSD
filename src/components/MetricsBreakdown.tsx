import React, { useState } from 'react';
import { GroupPerformance } from '../types/trade';
import { Clock, Layers, Heart, TrendingUp } from 'lucide-react';

interface MetricsBreakdownProps {
  sessionStats: GroupPerformance[];
  setupStats: GroupPerformance[];
  emotionStats: GroupPerformance[];
}

export const MetricsBreakdown: React.FC<MetricsBreakdownProps> = ({
  sessionStats,
  setupStats,
  emotionStats
}) => {
  const [activeTab, setActiveTab] = useState<'SESION' | 'SETUP' | 'EMOTION'>('SESION');

  const currentStats = 
    activeTab === 'SESION' ? sessionStats :
    activeTab === 'SETUP' ? setupStats : emotionStats;

  return (
    <section className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/[0.08] shadow-xl mb-6 sm:mb-8">
      {/* Header and Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-base sm:text-xl font-bold text-white tracking-tight">
              Rendimiento por Categoría
            </h3>
            <span className="text-[10px] sm:text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-white/[0.05] text-neutral-300 border border-white/[0.08]">
              Estadísticas
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5 sm:mt-1">
            Resultado neto y Win Rate agrupados por Sesión, Setup y Emoción
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap items-center p-1 bg-white/[0.03] rounded-xl sm:rounded-2xl border border-white/[0.08] self-stretch sm:self-auto gap-1">
          <button
            onClick={() => setActiveTab('SESION')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-medium rounded-lg sm:rounded-xl transition-all ${
              activeTab === 'SESION'
                ? 'bg-[#E0B341]/20 text-[#E0B341] border border-[#E0B341]/35 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Sesión</span>
          </button>

          <button
            onClick={() => setActiveTab('SETUP')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-medium rounded-lg sm:rounded-xl transition-all ${
              activeTab === 'SETUP'
                ? 'bg-[#E0B341]/20 text-[#E0B341] border border-[#E0B341]/35 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Setup</span>
          </button>

          <button
            onClick={() => setActiveTab('EMOTION')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-medium rounded-lg sm:rounded-xl transition-all ${
              activeTab === 'EMOTION'
                ? 'bg-[#E0B341]/20 text-[#E0B341] border border-[#E0B341]/35 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Emoción</span>
          </button>
        </div>
      </div>

      {/* Grid of performance cards / bars */}
      {currentStats.length === 0 ? (
        <div className="p-8 text-center text-xs text-neutral-500">
          No hay suficientes datos registrados para esta categoría.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentStats.map((item) => {
            const isProfit = item.netProfit >= 0;
            return (
              <div
                key={item.name}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.12] transition-colors flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-heading text-sm font-bold text-white block">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono mt-0.5 block">
                      {item.count} {item.count === 1 ? 'operación' : 'operaciones'} ({item.winCount}W - {item.count - item.winCount}L)
                    </span>
                  </div>

                  <div className="text-right">
                    <span className={`font-mono text-base font-bold tabular-nums block ${
                      isProfit ? 'text-[#34C97A]' : 'text-[#FF6B60]'
                    }`}>
                      {item.netProfit != null && !isNaN(item.netProfit)
                        ? `${isProfit ? '+' : ''}$${item.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </span>
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                      <span className="text-xs font-mono font-medium text-neutral-300">
                        {item.winRate != null && !isNaN(item.winRate) ? `${item.winRate.toFixed(1)}% WR` : '—'}
                      </span>
                      {item.avgRealR !== undefined && item.avgRealR !== null && !isNaN(item.avgRealR) && (
                        <span className={`text-[11px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          item.avgRealR >= 0 ? 'bg-[#34C97A]/15 text-[#34C97A]' : 'bg-[#FF6B60]/15 text-[#FF6B60]'
                        }`}>
                          {item.avgRealR >= 0 ? '+' : ''}{item.avgRealR.toFixed(2)}R
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress bar visual for win rate */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                    <span>Efectividad</span>
                    <span>{item.winRate.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isProfit ? 'bg-gradient-to-r from-[#34C97A] to-[#259b5c]' : 'bg-[#FF6B60]'
                      }`}
                      style={{ width: `${Math.max(item.winRate, 5)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
