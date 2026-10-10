/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trade } from './types/trade';
import { 
  fetchTradesFromAppsScript, 
  getStoredOwnerKey, 
  setStoredOwnerKey 
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

import { Loader2, AlertCircle, RefreshCw, PlusCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Owner Mode State
  const [ownerKey, setOwnerKey] = useState<string>('');
  const isOwner = Boolean(ownerKey);

  // Modals
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
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
    showToast('¡Modo Dueño activado! Ya puedes registrar nuevas operaciones.');
  };

  const handleLogoutOwner = () => {
    setStoredOwnerKey('');
    setOwnerKey('');
    showToast('Modo Dueño cerrado. Modo solo lectura activado.');
  };

  const handleTradeAddedSuccess = () => {
    showToast('¡Trade agregado exitosamente! Actualizando datos...');
    loadTrades();
  };

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#EDEDED] flex flex-col font-sans selection:bg-[#E0B341]/30 selection:text-[#E0B341]">
      
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
        onOpenNewTrade={() => setIsNewTradeOpen(true)}
        onRefreshTrades={loadTrades}
        isLoading={isLoading}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
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
          <div className="p-5 rounded-3xl bg-[#FF6B60]/10 border border-[#FF6B60]/30 my-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
          <div className="space-y-6">
            
            {/* 1. Hero + Dashboard Metrics */}
            <HeroStats metrics={metrics} />

            {/* 1.5. Calendario de Resultados */}
            <TradingCalendar
              trades={trades}
              onSelectTrade={setSelectedTrade}
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
              onOpenNewTrade={() => setIsNewTradeOpen(true)}
              isOwner={isOwner}
            />

          </div>
        )}

      </main>

      {/* Trade Detail Lightbox Modal */}
      <TradeDetailModal
        trade={selectedTrade}
        onClose={() => setSelectedTrade(null)}
      />

      {/* New Trade Form Modal (Owner Mode) */}
      <TradeFormModal
        isOpen={isNewTradeOpen}
        onClose={() => setIsNewTradeOpen(false)}
        ownerKey={ownerKey}
        onSuccess={handleTradeAddedSuccess}
      />

      {/* Owner Auth Modal */}
      <OwnerAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleOwnerSuccess}
        currentKey={ownerKey}
      />

      {/* Footer (Mandatory Disclaimer) */}
      <footer className="border-t border-white/[0.06] bg-[#0B0D12] py-8 text-neutral-500 text-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <p className="text-neutral-400">
              Diario personal con fines informativos. Resultados pasados no garantizan resultados futuros.
            </p>
            <p className="text-[11px] text-neutral-600 font-mono">
              Trading Journal · XAU/USD Prop Firm Portfolio · Powered by Google Apps Script & Drive
            </p>
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
