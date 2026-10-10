import React, { useState } from 'react';
import { Trade } from '../types/trade';
import { ArrowUpRight, ArrowDownRight, Search, Sparkles, Filter, Image as ImageIcon, Edit3 } from 'lucide-react';

interface TradeGalleryProps {
  trades: Trade[];
  onSelectTrade: (trade: Trade) => void;
  onOpenNewTrade?: () => void;
  onEditTrade?: (trade: Trade) => void;
  isOwner: boolean;
}

export const TradeGallery: React.FC<TradeGalleryProps> = ({
  trades,
  onSelectTrade,
  onOpenNewTrade,
  onEditTrade,
  isOwner
}) => {
  const [filterResult, setFilterResult] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTrades = trades.filter((trade) => {
    if (filterResult === 'WIN' && trade.money <= 0) return false;
    if (filterResult === 'LOSS' && trade.money >= 0) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSetup = trade.setup.toLowerCase().includes(q);
      const matchActivo = trade.activo.toLowerCase().includes(q);
      const matchSesion = trade.sesion.toLowerCase().includes(q);
      const matchEmotion = trade.emotion.toLowerCase().includes(q);
      const matchLeccion = trade.leccion.toLowerCase().includes(q);
      if (!matchSetup && !matchActivo && !matchSesion && !matchEmotion && !matchLeccion) return false;
    }
    return true;
  });

  return (
    <section className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-white tracking-tight">
              Galería de Trades
            </h2>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-white/[0.05] text-neutral-300 border border-white/[0.08]">
              {filteredTrades.length} de {trades.length}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Haz clic en cualquier tarjeta para abrir la imagen en grande (lightbox) y el análisis completo.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Result Filter */}
          <div className="flex items-center p-1 bg-white/[0.03] rounded-xl border border-white/[0.08]">
            <button
              onClick={() => setFilterResult('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                filterResult === 'ALL'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterResult('WIN')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                filterResult === 'WIN'
                  ? 'bg-[#34C97A]/20 text-[#34C97A] shadow-sm border border-[#34C97A]/30'
                  : 'text-neutral-400 hover:text-[#34C97A]'
              }`}
            >
              Ganadores
            </button>
            <button
              onClick={() => setFilterResult('LOSS')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                filterResult === 'LOSS'
                  ? 'bg-[#FF6B60]/20 text-[#FF6B60] shadow-sm border border-[#FF6B60]/30'
                  : 'text-neutral-400 hover:text-[#FF6B60]'
              }`}
            >
              Perdedores
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[180px] sm:min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar setup, emoción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.03] text-xs font-medium text-white pl-8 pr-3 py-2 rounded-xl border border-white/[0.08] placeholder-neutral-500 focus:outline-none focus:border-[#E0B341]"
            />
          </div>
        </div>
      </div>

      {/* Grid of Trade Cards */}
      {trades.length === 0 ? (
        <div className="glass-panel rounded-3xl p-10 sm:p-14 text-center border border-white/[0.08] relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-[#E0B341]/10 border border-[#E0B341]/25 mx-auto flex items-center justify-center text-[#E0B341] mb-4">
            <Filter className="w-6 h-6 text-[#E0B341]" />
          </div>
          <h3 className="font-heading text-xl sm:text-2xl font-bold text-white tracking-tight">
            Tu diario está vacío
          </h3>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto mt-2 mb-6 leading-relaxed">
            Aún no hay trades registrados en tu Google Sheets. Registra tu primera operación para comenzar a visualizar tus estadísticas cuantitativas y capturas de pantalla.
          </p>
          {isOwner && onOpenNewTrade && (
            <button
              onClick={onOpenNewTrade}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-[#E0B341] to-[#C99C2E] text-[#0B0D12] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#E0B341]/20 inline-flex items-center gap-2"
            >
              <span>+ Registrar mi primer trade</span>
            </button>
          )}
        </div>
      ) : filteredTrades.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-white/[0.08]">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] mx-auto flex items-center justify-center text-neutral-400 mb-3">
            <Filter className="w-5 h-5" />
          </div>
          <h3 className="font-heading text-lg font-bold text-white">No hay operaciones para este filtro</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
            Ningún trade coincide con los filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTrades.map((trade) => {
            const isWin = trade.money >= 0;
            const isBuy = trade.direccion === 'Buy';

            return (
              <div
                key={trade.id}
                onClick={() => onSelectTrade(trade)}
                className="group glass-panel rounded-2xl overflow-hidden border border-white/[0.07] hover:border-[#E0B341]/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#E0B341]/10 cursor-pointer flex flex-col"
              >
                {/* Image Section */}
                <div className="relative aspect-video w-full bg-[#12151E] overflow-hidden">
                  {trade.imageUrl ? (
                    <img
                      src={trade.imageUrl}
                      alt={`Trade ${trade.activo || ''} - ${trade.setup || ''}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        // Fallback on broken image
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500 bg-gradient-to-br from-[#12151E] to-[#0B0D12] p-4 text-center">
                      <ImageIcon className="w-8 h-8 text-[#E0B341]/40 mb-2" />
                      <span className="text-xs font-mono text-neutral-400">{trade.activo || '—'}</span>
                      <span className="text-[11px] text-neutral-500">{trade.setup || '—'}</span>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    {/* Direction Tag */}
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold tracking-wide flex items-center gap-1 backdrop-blur-md ${
                      isBuy
                        ? 'bg-[#34C97A]/85 text-black shadow-sm'
                        : 'bg-[#FF6B60]/85 text-white shadow-sm'
                    }`}>
                      {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {trade.direccion || '—'}
                    </span>

                    {/* Asset */}
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-[#0B0D12]/80 text-[#E0B341] border border-[#E0B341]/30 backdrop-blur-md">
                      {trade.activo || '—'}
                    </span>
                  </div>

                  {/* Session Badge */}
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#0B0D12]/80 text-neutral-300 backdrop-blur-md border border-white/[0.1]">
                      {trade.sesion || '—'}
                    </span>
                  </div>

                  {/* Bottom Gradient Scrim with Result */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0B0D12] via-[#0B0D12]/80 to-transparent p-3 pt-6 flex items-end justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-neutral-400 block">
                        {trade.fecha || '—'}
                      </span>
                      <span className="font-heading text-xs font-bold text-white truncate max-w-[170px] block">
                        {trade.setup || '—'}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className={`font-heading text-lg font-bold tabular-nums leading-none ${
                        isWin ? 'text-[#34C97A]' : 'text-[#FF6B60]'
                      }`}>
                        {trade.money != null && !isNaN(trade.money)
                          ? `${isWin ? '+' : ''}$${trade.money.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 mt-1">
                        {trade.rReal != null && !isNaN(trade.rReal) ? (
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            trade.rReal >= 0 ? 'bg-[#34C97A]/25 text-[#34C97A]' : 'bg-[#FF6B60]/25 text-[#FF6B60]'
                          }`}>
                            {trade.rReal >= 0 ? '+' : ''}{trade.rReal.toFixed(2)}R
                          </span>
                        ) : null}
                        {trade.rrPlanificado > 0 && !isNaN(trade.rrPlanificado) && (
                          <span className="text-[10px] font-mono text-neutral-400">
                            1:{trade.rrPlanificado.toFixed(2)} R:R
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Body Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2 bg-[#0B0D12]/40">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <div className="flex items-center gap-1.5 font-mono flex-wrap">
                      <span>In: {trade.entrada != null && !isNaN(trade.entrada) ? trade.entrada.toFixed(2) : '—'}</span>
                      <span>·</span>
                      <span className="text-[#E0B341]">Out: {trade.salida != null && !isNaN(trade.salida) ? trade.salida.toFixed(2) : '—'}</span>
                      <span>·</span>
                      <span className="text-[#FF6B60]">SL: {trade.sl != null && !isNaN(trade.sl) ? trade.sl.toFixed(2) : '—'}</span>
                      <span>·</span>
                      <span className="text-[#34C97A]">TP: {trade.tp != null && !isNaN(trade.tp) ? trade.tp.toFixed(2) : '—'}</span>
                    </div>
                  </div>

                  {/* Outcome tags */}
                  {(trade.isSLHit || trade.isTPHit) && (
                    <div className="flex items-center gap-2">
                      {trade.isSLHit && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#FF6B60]/20 text-[#FF6B60] border border-[#FF6B60]/30">
                          🛑 Salió en SL
                        </span>
                      )}
                      {trade.isTPHit && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#34C97A]/20 text-[#34C97A] border border-[#34C97A]/30">
                          🎯 Salió en TP
                        </span>
                      )}
                    </div>
                  )}

                  {trade.leccion && (
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                      "{trade.leccion}"
                    </p>
                  )}

                  <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-xs">
                    <span className="text-[11px] font-medium text-neutral-400">
                      Emoción: <strong className="text-neutral-200">{trade.emotion || '—'}</strong>
                    </span>

                    <div className="flex items-center gap-2.5">
                      {isOwner && onEditTrade && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTrade(trade);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-[#E0B341]/10 hover:bg-[#E0B341]/25 text-[#E0B341] border border-[#E0B341]/30 text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="Editar trade"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      )}

                      <span className="text-[11px] font-medium text-[#E0B341] group-hover:underline">
                        Ver detalle →
                      </span>
                    </div>
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
