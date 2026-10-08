import React, { useState, useEffect } from 'react';
import { Trade } from '../types/trade';
import { X, ArrowUpRight, ArrowDownRight, Maximize2, Minimize2, Calendar, Clock, Layers, Heart, BookOpen, ExternalLink, ShieldCheck } from 'lucide-react';

interface TradeDetailModalProps {
  trade: Trade | null;
  onClose: () => void;
}

export const TradeDetailModal: React.FC<TradeDetailModalProps> = ({ trade, onClose }) => {
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZoomed) {
          setIsZoomed(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomed, onClose]);

  if (!trade) return null;

  const isWin = trade.money >= 0;
  const isBuy = trade.direccion === 'Buy';
  const hasEntrada = trade.entrada != null && !isNaN(trade.entrada);
  const hasSl = trade.sl != null && !isNaN(trade.sl);
  const hasTp = trade.tp != null && !isNaN(trade.tp);
  const riskDistance = hasEntrada && hasSl ? Math.abs(trade.entrada - trade.sl) : 0;
  const rewardDistance = hasTp && hasEntrada ? Math.abs(trade.tp - trade.entrada) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Full-screen Lightbox Zoom Overlay */}
      {isZoomed && trade.imageUrl && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <span className="text-xs text-neutral-400 bg-black/60 px-3 py-1 rounded-full border border-white/10">
              Presiona ESC o clic para cerrar zoom
            </span>
            <button
              onClick={() => setIsZoomed(false)}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
          <img
            src={trade.imageUrl}
            alt={`Gráfico completo ${trade.activo || ''}`}
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[92vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}

      {/* Main Detail Card */}
      <div 
        className="glass-dropdown relative w-full max-w-4xl rounded-3xl border border-white/[0.12] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0E1119]/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 ${
              isBuy 
                ? 'bg-[#34C97A]/20 text-[#34C97A] border border-[#34C97A]/30' 
                : 'bg-[#FF6B60]/20 text-[#FF6B60] border border-[#FF6B60]/30'
            }`}>
              {isBuy ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>{trade.direccion || '—'}</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-lg font-bold text-white">{trade.activo || '—'}</span>
                <span className="text-xs font-mono text-[#E0B341] px-2 py-0.5 rounded bg-[#E0B341]/10 border border-[#E0B341]/20">
                  {trade.fecha || '—'}
                </span>
                <span className="text-xs text-neutral-400 hidden sm:inline">
                  {trade.sesion || '—'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Main Chart Image with Zoom Button */}
          {trade.imageUrl ? (
            <div className="relative rounded-2xl overflow-hidden bg-[#11141D] border border-white/[0.08] group">
              <img
                src={trade.imageUrl}
                alt={`Chart ${trade.activo || ''}`}
                referrerPolicy="no-referrer"
                className="w-full max-h-[380px] object-contain sm:object-cover mx-auto"
              />
              
              <button
                onClick={() => setIsZoomed(true)}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black text-white text-xs font-medium border border-white/20 backdrop-blur-md transition-all shadow-lg"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#E0B341]" />
                <span>Ampliar imagen (Lightbox)</span>
              </button>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center text-xs text-neutral-500">
              Sin captura de gráfico registrada en este trade.
            </div>
          )}

          {/* Money Result Banner */}
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-neutral-400 uppercase tracking-wider block font-medium">
                Resultado de la Operación (MONEY)
              </span>
              <div className="flex flex-wrap items-baseline gap-3 mt-0.5">
                <span className={`font-heading text-3xl sm:text-4xl font-bold tabular-nums ${
                  isWin ? 'text-[#34C97A]' : 'text-[#FF6B60]'
                }`}>
                  {trade.money != null && !isNaN(trade.money)
                    ? `${isWin ? '+' : ''}$${trade.money.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    : '—'}
                </span>
                {trade.rReal != null && !isNaN(trade.rReal) ? (
                  <span className={`font-mono text-sm font-semibold px-2.5 py-1 rounded-lg ${
                    trade.rReal >= 0
                      ? 'bg-[#34C97A]/15 text-[#34C97A] border border-[#34C97A]/30'
                      : 'bg-[#FF6B60]/15 text-[#FF6B60] border border-[#FF6B60]/30'
                  }`}>
                    R Real: {trade.rReal >= 0 ? '+' : ''}{trade.rReal.toFixed(2)}R
                  </span>
                ) : (
                  <span className="font-mono text-sm font-semibold text-neutral-400">
                    R Real: —
                  </span>
                )}
                {trade.rrPlanificado != null && !isNaN(trade.rrPlanificado) && trade.rrPlanificado > 0 && (
                  <span className="font-mono text-sm font-semibold text-neutral-400">
                    Plan 1:{trade.rrPlanificado.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 sm:border-l sm:border-white/[0.08] sm:pl-6">
              <div>
                <span className="text-[11px] text-neutral-400 block">Dirección</span>
                <span className={`px-2 py-0.5 mt-0.5 rounded-md text-xs font-mono font-bold inline-flex items-center gap-1 ${
                  isBuy ? 'bg-[#34C97A]/20 text-[#34C97A] border border-[#34C97A]/30' : 'bg-[#FF6B60]/20 text-[#FF6B60] border border-[#FF6B60]/30'
                }`}>
                  {trade.direccion || '—'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-neutral-400 block">ID Registro</span>
                <span className="font-mono text-xs text-neutral-300">
                  {trade.id || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Technical Execution Parameters */}
          <div>
            <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              Precios & Parámetros
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Entrada */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[11px] text-neutral-400 block">Precio Entrada</span>
                <span className="font-heading text-base font-bold text-white tabular-nums mt-0.5 block">
                  {hasEntrada ? trade.entrada.toFixed(2) : '—'}
                </span>
              </div>

              {/* Salida - JUNTO A LA ENTRADA */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[11px] text-[#E0B341] block">Precio Salida</span>
                <span className="font-heading text-base font-bold text-[#E0B341] tabular-nums mt-0.5 block">
                  {trade.salida != null && !isNaN(trade.salida) ? trade.salida.toFixed(2) : '—'}
                </span>
              </div>

              {/* Stop Loss */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[11px] text-[#FF6B60] block">Stop Loss (SL)</span>
                <span className="font-heading text-base font-bold text-[#FF6B60] tabular-nums mt-0.5 block">
                  {hasSl ? trade.sl.toFixed(2) : '—'}
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {riskDistance > 0 ? `Riesgo: ${riskDistance.toFixed(2)} pts` : '—'}
                </span>
              </div>

              {/* Take Profit */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[11px] text-[#34C97A] block">Take Profit (TP)</span>
                <span className="font-heading text-base font-bold text-[#34C97A] tabular-nums mt-0.5 block">
                  {hasTp ? trade.tp.toFixed(2) : '—'}
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {rewardDistance > 0 ? `Objetivo: ${rewardDistance.toFixed(2)} pts` : '—'}
                </span>
              </div>

              {/* R Real */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[11px] text-[#E0B341] block">R Real</span>
                <span className={`font-heading text-base font-bold tabular-nums mt-0.5 block ${
                  trade.rReal == null || isNaN(trade.rReal)
                    ? 'text-neutral-400'
                    : trade.rReal >= 0
                      ? 'text-[#34C97A]'
                      : 'text-[#FF6B60]'
                }`}>
                  {trade.rReal != null && !isNaN(trade.rReal) ? `${trade.rReal >= 0 ? '+' : ''}${trade.rReal.toFixed(2)}R` : '—'}
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  (Salida-In) / |SL|
                </span>
              </div>

              {/* Ratio R:R Planeado */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[11px] text-neutral-400 block">R:R Planeado</span>
                <span className="font-heading text-base font-bold text-neutral-300 tabular-nums mt-0.5 block">
                  {trade.rrPlanificado != null && !isNaN(trade.rrPlanificado) && trade.rrPlanificado > 0
                    ? `1:${trade.rrPlanificado.toFixed(2)}`
                    : '—'}
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  |TP-In| / |In-SL|
                </span>
              </div>
            </div>
          </div>

          {/* Context: Setup, Sesión, Emoción */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
                <Layers className="w-3.5 h-3.5 text-[#E0B341]" />
                <span>Setup Operativo</span>
              </div>
              <span className="font-heading text-sm font-bold text-white block">
                {trade.setup || '—'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
                <Clock className="w-3.5 h-3.5 text-[#E0B341]" />
                <span>Sesión</span>
              </div>
              <span className="font-heading text-sm font-bold text-white block">
                {trade.sesion || '—'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
                <Heart className="w-3.5 h-3.5 text-pink-400" />
                <span>Emoción</span>
              </div>
              <span className="font-heading text-sm font-bold text-neutral-200 block">
                {trade.emotion || '—'}
              </span>
            </div>
          </div>

          {/* Lección */}
          {trade.leccion && (
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <h5 className="text-xs font-semibold text-[#E0B341] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Lección & Conclusión del Trader</span>
              </h5>
              <p className="text-sm text-neutral-300 leading-relaxed font-normal">
                {trade.leccion}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#0E1119]/80 flex items-center justify-between shrink-0">
          <span className="text-xs text-neutral-500 font-mono">
            {trade.fecha || '—'} · {trade.activo || '—'}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white transition-colors"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  );
};
