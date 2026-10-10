/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trade } from './types/trade';
import { 
  fetchTradesFromAppsScript, 
  getStoredOwnerKey, 
  setStoredOwnerKey,
  deleteTradeInAppsScript
} from './services/api';
import { 
  calculateDashboardMetrics, 
  buildEquityCurve, 
  calculatePerformanceBySession, 
  calculatePerformanceBySetup, 
  calculatePerformanceByEmotion 
} from './utils/tradeStats';

// Components
import { Header } from './components/Header';
import { HeroStats } from './components/HeroStats';
import { TradingCalendar } from './components/TradingCalendar';
import { EquityChart } from './components/EquityChart';
import { MetricsBreakdown } from './components/MetricsBreakdown';
import { TradeGallery } from './components/TradeGallery';
import { TradeDetailModal } from './components/TradeDetailModal';
import { TradeFormModal } from './components/TradeFormModal';
import { OwnerAuthModal } from './components/OwnerAuthModal';
import { useScreenMode } from './hooks/useScreenMode';

import { Loader2, AlertCircle, RefreshCw, PlusCircle, CheckCircle2, Trash2 } from 'lucide-react';

export default function App() {
  const screenInfo = useScreenMode();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Owner Mode State
  const [ownerKey, setOwnerKey] = useState<string>('');
  const isOwner = Boolean(ownerKey);

  // Modals
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [tradeToEdit, setTradeToEdit] = useState<Trade | null>(null);
  const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isNewTradeOpen, setIsNewTradeOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  // Load stored owner key on mount
  useEffect(() => {
    const key = getStoredOwnerKey();
    if (key) {
      setOwnerKey(key);
    }
  }, []);

  // Fetch trades from Google Apps Script
  const loadTrades = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await fetchTradesFromAppsScript();
      setTrades(data);

      // Keep selectedTrade in sync if currently viewed
      setSelectedTrade((current) => {
        if (!current) return null;
        const found = data.find((t) => t.id === current.id);
        return found || current;
      });
    } catch (err: any) {
      console.error('Error fetching trades from Apps Script:', err);
      setFetchError(err.message || 'No se pudieron cargar los datos de Google Apps Script.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  // Derived calculations
  const metrics = useMemo(() => calculateDashboardMetrics(trades), [trades]);
  const equityPoints = useMemo(() => buildEquityCurve(trades), [trades]);
  const sessionStats = useMemo(() => calculatePerformanceBySession(trades), [trades]);
  const setupStats = useMemo(() => calculatePerformanceBySetup(trades), [trades]);
  const emotionStats = useMemo(() => calculatePerformanceByEmotion(trades), [trades]);

  const handleOwnerSuccess = (key: string) => {
    setOwnerKey(key);
    showToast('¡Modo Dueño activado! Ya puedes registrar y editar operaciones.');
  };

  const handleLogoutOwner = () => {
    setStoredOwnerKey('');
    setOwnerKey('');
    showToast('Modo Dueño cerrado. Modo solo lectura activado.');
  };

  const handleOpenNewTrade = () => {
    setTradeToEdit(null);
    setIsNewTradeOpen(true);
  };

  const handleOpenEditTrade = (trade: Trade) => {
    setTradeToEdit(trade);
    setIsNewTradeOpen(true);
  };

  const handleCloseTradeForm = () => {
    setIsNewTradeOpen(false);
    setTradeToEdit(null);
  };

  const handleTradeSavedSuccess = () => {
    showToast(tradeToEdit ? '¡Trade actualizado exitosamente!' : '¡Trade registrado exitosamente!');
    handleCloseTradeForm();
    loadTrades();
  };

  const handleRequestDeleteTrade = (trade: Trade) => {
    if (!ownerKey) {
      showToast('Debes activar el Modo Dueño para eliminar trades.');
      return;
    }
    setTradeToDelete(trade);
  };

  const handleConfirmDelete = async () => {
    if (!tradeToDelete) return;
    if (!ownerKey) {
      showToast('Debes activar el Modo Dueño para eliminar trades.');
      setTradeToDelete(null);
      return;
    }

    const targetId = tradeToDelete.id;
    setIsDeleting(true);

    try {
      await deleteTradeInAppsScript(targetId, ownerKey);

      // Instantly filter out trade from state
      setTrades((prev) => prev.filter((t) => t.id !== targetId));

      // Close open modals if referencing the deleted trade
      if (selectedTrade?.id === targetId) {
        setSelectedTrade(null);
      }
      if (tradeToEdit?.id === targetId) {
        setTradeToEdit(null);
        setIsNewTradeOpen(false);
      }

      setTradeToDelete(null);
      showToast('Trade eliminado permanentemente del diario.');
    } catch (err: any) {
      console.error('Error al eliminar trade:', err);
      showToast('Error al eliminar el trade: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#EDEDED] flex flex-col font-sans selection:bg-[#E0B341]/30 selection:text-[#E0B341] overflow-x-hidden w-full max-w-full">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-3 duration-300">
          <div className="glass-dropdown px-4 py-3 rounded-2xl shadow-2xl border border-[#E0B341]/40 text-xs font-medium text-white flex items-center gap-2 max-w-sm">
            <span className="w-2 h-2 rounded-full bg-[#E0B341] animate-ping" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        isOwner={isOwner}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        onLogoutOwner={handleLogoutOwner}
        onOpenNewTrade={handleOpenNewTrade}
        onRefreshTrades={loadTrades}
        isLoading={isLoading}
        screenInfo={screenInfo}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">
        
        {/* Loading State Skeleton */}
        {isLoading && trades.length === 0 && (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E0B341]/10 border border-[#E0B341]/25 flex items-center justify-center text-[#E0B341]">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div className="text-center">
              <h3 className="font-heading text-lg font-bold text-white">
                Cargando Trading Journal...
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Conectando con Google Apps Script y obteniendo operaciones de XAU/USD
              </p>
            </div>
          </div>
        )}

        {/* Fetch Error Banner */}
        {fetchError && (
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#FF6B60]/10 border border-[#FF6B60]/30 my-4 sm:my-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <AlertCircle className="w-5 h-5 text-[#FF6B60] shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-white">Error de conexión con Google Apps Script</h4>
                <p className="text-xs text-neutral-300 mt-1 leading-relaxed font-mono break-words bg-black/30 p-2.5 rounded-xl border border-white/[0.06] select-all">
                  {fetchError}
                </p>
              </div>
            </div>
            <button
              onClick={loadTrades}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1] shrink-0 flex items-center gap-1.5 transition-colors self-end sm:self-center"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
          </div>
        )}

        {/* Populated Content */}
        {(!isLoading || trades.length > 0) && (
          <div className="space-y-5 sm:space-y-6">
            
            {/* 1. Hero + Dashboard Metrics */}
            <HeroStats metrics={metrics} />

            {/* 1.5. Calendario de Resultados */}
            <TradingCalendar
              trades={trades}
              onSelectTrade={setSelectedTrade}
              onEditTrade={handleOpenEditTrade}
              onDeleteTrade={handleRequestDeleteTrade}
              isOwner={isOwner}
              screenMode={screenInfo.mode}
            />

            {/* 2. Equity Curve */}
            <EquityChart equityPoints={equityPoints} />

            {/* 3. Performance Breakdown by Session, Setup and Emotion */}
            <MetricsBreakdown
              sessionStats={sessionStats}
              setupStats={setupStats}
              emotionStats={emotionStats}
            />

            {/* 4. Trades Gallery & Lightbox Trigger */}
            <TradeGallery
              trades={trades}
              onSelectTrade={setSelectedTrade}
              onOpenNewTrade={handleOpenNewTrade}
              onEditTrade={handleOpenEditTrade}
              onDeleteTrade={handleRequestDeleteTrade}
              isOwner={isOwner}
            />

          </div>
        )}

      </main>

      {/* Trade Detail Lightbox Modal */}
      <TradeDetailModal
        trade={selectedTrade}
        onClose={() => setSelectedTrade(null)}
        onEditTrade={handleOpenEditTrade}
        onDeleteTrade={handleRequestDeleteTrade}
        isOwner={isOwner}
      />

      {/* New / Edit Trade Form Modal (Owner Mode) */}
      <TradeFormModal
        isOpen={isNewTradeOpen}
        onClose={handleCloseTradeForm}
        ownerKey={ownerKey}
        tradeToEdit={tradeToEdit}
        onSuccess={handleTradeSavedSuccess}
        onDeleteTrade={handleRequestDeleteTrade}
      />

      {/* Owner Auth Modal */}
      <OwnerAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleOwnerSuccess}
        currentKey={ownerKey}
      />

      {/* Delete Confirmation Modal */}
      {tradeToDelete && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => !isDeleting && setTradeToDelete(null)}
        >
          <div 
            className="glass-dropdown relative w-full max-w-sm rounded-3xl border border-[#FF6B60]/30 shadow-2xl p-6 overflow-hidden space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FF6B60]/15 border border-[#FF6B60]/30 text-[#FF6B60] flex items-center justify-center mx-auto shadow-lg shadow-[#FF6B60]/10">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-heading text-lg font-bold text-white">
                Eliminar Trade
              </h3>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                ¿Estás seguro de que deseas eliminar este trade del diario?
              </p>
              <div className="mt-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] font-mono text-xs text-neutral-300 flex items-center justify-between">
                <span className="font-semibold text-white">{tradeToDelete.activo}</span>
                <span className="text-neutral-400">{tradeToDelete.fecha}</span>
                <span className={`font-bold ${tradeToDelete.money >= 0 ? 'text-[#34C97A]' : 'text-[#FF6B60]'}`}>
                  {tradeToDelete.money >= 0 ? '+' : ''}${Number(tradeToDelete.money || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-[11px] text-[#FF6B60]/80 mt-2">
                Esta acción se guardará y no se puede deshacer.
              </p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setTradeToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-neutral-300 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-[#FF6B60] hover:bg-[#FF6B60]/90 text-white transition-all shadow-lg shadow-[#FF6B60]/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <span>Sí, Eliminar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer (Mandatory Disclaimer) */}
      <footer className="border-t border-white/[0.06] bg-[#0B0D12] py-8 text-neutral-500 text-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt="Logo"
              className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/10 shrink-0 hidden sm:block"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <div className="space-y-1">
              <p className="text-neutral-400">
                Diario personal con fines informativos. Resultados pasados no garantizan resultados futuros.
              </p>
              <p className="text-[11px] text-neutral-600 font-mono">
                Trading Journal · XAU/USD Prop Firm Portfolio · Powered by Google Apps Script & Drive
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-[#34C97A] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34C97A]" />
              Apps Script Backend
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
