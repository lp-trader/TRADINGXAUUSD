/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trade, AppMode } from './types/trade';
import { 
  fetchTradesFromAppsScript, 
  fetchBacktestSheets,
  getStoredOwnerKey, 
  setStoredOwnerKey,
  getStoredAppMode,
  setStoredAppMode,
  getStoredActiveBacktest,
  setStoredActiveBacktest,
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
import { NewBacktestModal } from './components/NewBacktestModal';
import { useScreenMode } from './hooks/useScreenMode';
import { detectStudyYear, setStoredStudyYear } from './utils/backtestDateUtils';

import { Loader2, AlertCircle, RefreshCw, Trash2, FlaskConical, Plus } from 'lucide-react';

export default function App() {
  const screenInfo = useScreenMode();

  // App Mode State ('real' | 'backtest') with localStorage persistence
  const [appMode, setAppMode] = useState<AppMode>(() => getStoredAppMode());
  const isBacktest = appMode === 'backtest';

  // Backtest Sheets State
  const [backtestSheets, setBacktestSheets] = useState<string[]>([]);
  const [activeBacktest, setActiveBacktest] = useState<string>(() => getStoredActiveBacktest());
  const [studyYear, setStudyYear] = useState<number>(() =>
    detectStudyYear(getStoredActiveBacktest(), [])
  );
  const [isLoadingSheets, setIsLoadingSheets] = useState<boolean>(false);
  const [isNewBacktestOpen, setIsNewBacktestOpen] = useState<boolean>(false);

  // Trades & Loading State
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
  const [newTradeDate, setNewTradeDate] = useState<string | null>(null);
  const [pendingDateAfterAuth, setPendingDateAfterAuth] = useState<string | null>(null);
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

  // Determine current active sheet name
  const currentSheet = isBacktest ? (activeBacktest || '') : 'Trades';

  // Fetch backtest sheets from Google Apps Script
  const loadBacktestSheets = useCallback(async (): Promise<string[]> => {
    setIsLoadingSheets(true);
    try {
      const sheets = await fetchBacktestSheets();
      setBacktestSheets(sheets);

      // Determine active backtest
      let targetSheet = '';
      const stored = getStoredActiveBacktest();
      if (stored && sheets.includes(stored)) {
        targetSheet = stored;
      } else if (sheets.length > 0) {
        targetSheet = sheets[0];
      }

      setActiveBacktest(targetSheet);
      setStoredActiveBacktest(targetSheet);
      return sheets;
    } catch (err) {
      console.error('Error al cargar hojas de backtest:', err);
      return [];
    } finally {
      setIsLoadingSheets(false);
    }
  }, []);

  // Fetch trades from Google Apps Script for the selected sheet
  const loadTrades = useCallback(async (sheetToLoad?: string) => {
    const sheet = sheetToLoad !== undefined ? sheetToLoad : currentSheet;

    // If in backtest mode but no backtest sheet is available, trades should be empty
    if (isBacktest && !sheet) {
      setTrades([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await fetchTradesFromAppsScript(sheet);
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
  }, [currentSheet, isBacktest]);

  // Initial load or mode change handler
  useEffect(() => {
    if (appMode === 'backtest') {
      loadBacktestSheets().then((sheets) => {
        const stored = getStoredActiveBacktest();
        const active = (stored && sheets.includes(stored)) ? stored : sheets[0] || '';
        if (active) {
          loadTrades(active);
        } else {
          setTrades([]);
          setIsLoading(false);
        }
      });
    } else {
      loadTrades('Trades');
    }
  }, [appMode, loadBacktestSheets, loadTrades]);

  // Mode switch handler
  const handleChangeAppMode = (mode: AppMode) => {
    if (mode === appMode) return;
    setAppMode(mode);
    setStoredAppMode(mode);
    setSelectedTrade(null);
    setTradeToEdit(null);
    setTradeToDelete(null);

    if (mode === 'real') {
      showToast('Cambiado a Modo Real (Trades en vivo).');
    } else {
      showToast('Cambiado a Modo Backtest.');
    }
  };

  // Keep studyYear in sync whenever activeBacktest or trades change
  useEffect(() => {
    if (isBacktest && activeBacktest) {
      const detected = detectStudyYear(activeBacktest, trades);
      setStudyYear(detected);
    }
  }, [activeBacktest, trades, isBacktest]);

  const handleChangeStudyYear = (year: number) => {
    setStudyYear(year);
    if (activeBacktest) {
      setStoredStudyYear(activeBacktest, year);
      showToast(`Año de estudio para "${activeBacktest}" fijado en ${year}`);
    }
  };

  // Active Backtest sheet change handler
  const handleChangeActiveBacktest = (sheet: string) => {
    if (sheet === activeBacktest) return;
    setActiveBacktest(sheet);
    setStoredActiveBacktest(sheet);
    const yr = detectStudyYear(sheet, []);
    setStudyYear(yr);
    setSelectedTrade(null);
    setTradeToEdit(null);
    setTradeToDelete(null);
    loadTrades(sheet);
    showToast(`Mostrando datos de ${sheet}`);
  };

  // Backtest created success handler
  const handleBacktestCreated = (newSheetName: string, chosenYear?: number) => {
    setBacktestSheets((prev) => Array.from(new Set([...prev, newSheetName])));
    setActiveBacktest(newSheetName);
    setStoredActiveBacktest(newSheetName);
    const yr = chosenYear || detectStudyYear(newSheetName, []);
    setStoredStudyYear(newSheetName, yr);
    setStudyYear(yr);
    setTrades([]);
    showToast(`¡Pestaña "${newSheetName}" (Año ${yr}) creada y seleccionada!`);
    loadTrades(newSheetName);
  };

  // Refresh handler
  const handleRefresh = () => {
    if (isBacktest) {
      loadBacktestSheets().then((sheets) => {
        const target = activeBacktest && sheets.includes(activeBacktest) ? activeBacktest : sheets[0] || '';
        if (target) {
          loadTrades(target);
        }
      });
    } else {
      loadTrades('Trades');
    }
  };

  // Derived calculations
  const metrics = useMemo(() => calculateDashboardMetrics(trades), [trades]);
  const equityPoints = useMemo(() => buildEquityCurve(trades), [trades]);
  const sessionStats = useMemo(() => calculatePerformanceBySession(trades), [trades]);
  const setupStats = useMemo(() => calculatePerformanceBySetup(trades), [trades]);
  const emotionStats = useMemo(() => calculatePerformanceByEmotion(trades), [trades]);

  const handleOwnerSuccess = (key: string) => {
    setOwnerKey(key);
    showToast('¡Modo Dueño activado! Ya puedes registrar y editar operaciones.');
    if (pendingDateAfterAuth) {
      const dateToOpen = pendingDateAfterAuth;
      setPendingDateAfterAuth(null);
      setTradeToEdit(null);
      setNewTradeDate(dateToOpen);
      setIsNewTradeOpen(true);
    }
  };

  const handleLogoutOwner = () => {
    setStoredOwnerKey('');
    setOwnerKey('');
    setPendingDateAfterAuth(null);
    showToast('Modo Dueño cerrado. Modo solo lectura activado.');
  };

  const handleOpenNewTrade = (initialDate?: string) => {
    if (!ownerKey) {
      if (initialDate) setPendingDateAfterAuth(initialDate);
      setIsAuthOpen(true);
      showToast(initialDate 
        ? `Activa el Modo Dueño con tu clave para registrar el trade el ${initialDate}.` 
        : 'Activa el Modo Dueño con tu clave para registrar operaciones.'
      );
      return;
    }
    setTradeToEdit(null);
    setNewTradeDate(initialDate || null);
    setIsNewTradeOpen(true);
  };

  const handleOpenNewTradeOnDate = (dateStr: string) => {
    handleOpenNewTrade(dateStr);
  };

  const handleOpenEditTrade = (trade: Trade) => {
    setTradeToEdit(trade);
    setNewTradeDate(null);
    setIsNewTradeOpen(true);
  };

  const handleCloseTradeForm = () => {
    setIsNewTradeOpen(false);
    setTradeToEdit(null);
    setNewTradeDate(null);
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
      await deleteTradeInAppsScript(targetId, ownerKey, currentSheet);

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
      showToast('Trade eliminado permanentemente.');
    } catch (err: any) {
      console.error('Error al eliminar trade:', err);
      showToast('Error al eliminar el trade: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={`min-h-screen bg-[#0B0D12] text-[#EDEDED] flex flex-col font-sans overflow-x-hidden w-full max-w-full transition-colors ${
      isBacktest 
        ? 'selection:bg-[#A855F7]/30 selection:text-[#C084FC]' 
        : 'selection:bg-[#E0B341]/30 selection:text-[#E0B341]'
    }`}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-3 duration-300">
          <div className={`glass-dropdown px-4 py-3 rounded-2xl shadow-2xl border text-xs font-medium text-white flex items-center gap-2 max-w-sm ${
            isBacktest ? 'border-[#A855F7]/40' : 'border-[#E0B341]/40'
          }`}>
            <span className={`w-2 h-2 rounded-full animate-ping ${
              isBacktest ? 'bg-[#C084FC]' : 'bg-[#E0B341]'
            }`} />
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
        onRefreshTrades={handleRefresh}
        isLoading={isLoading || isLoadingSheets}
        screenInfo={screenInfo}
        appMode={appMode}
        onChangeAppMode={handleChangeAppMode}
        backtestSheets={backtestSheets}
        activeBacktest={activeBacktest}
        onChangeActiveBacktest={handleChangeActiveBacktest}
        onOpenNewBacktest={() => setIsNewBacktestOpen(true)}
        studyYear={studyYear}
        onChangeStudyYear={handleChangeStudyYear}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">
        
        {/* Loading State Skeleton */}
        {isLoading && trades.length === 0 && !fetchError && (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
              isBacktest 
                ? 'bg-[#A855F7]/10 border border-[#A855F7]/25 text-[#C084FC]' 
                : 'bg-[#E0B341]/10 border border-[#E0B341]/25 text-[#E0B341]'
            }`}>
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div className="text-center">
              <h3 className="font-heading text-lg font-bold text-white">
                {isBacktest ? `Cargando ${activeBacktest || 'Backtest'}...` : 'Cargando Trading Journal...'}
              </h3>
              <p className="text-xs text-neutral-400 mt-1 font-mono">
                {isBacktest
                  ? `Conectando con pestaña "${activeBacktest}" en Google Apps Script`
                  : 'Conectando con Google Apps Script y obteniendo operaciones de XAU/USD'
                }
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
              onClick={handleRefresh}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1] shrink-0 flex items-center gap-1.5 transition-colors self-end sm:self-center"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
          </div>
        )}

        {/* Empty State: In Backtest mode when no backtest sheets exist at all */}
        {isBacktest && !isLoading && !isLoadingSheets && backtestSheets.length === 0 && (
          <div className="py-16 sm:py-24">
            <div className="glass-panel max-w-xl mx-auto rounded-3xl p-8 sm:p-12 text-center border border-[#A855F7]/30 shadow-2xl relative overflow-hidden">
              <div className="w-16 h-16 rounded-2xl bg-[#A855F7]/15 border border-[#A855F7]/30 mx-auto flex items-center justify-center text-[#C084FC] mb-5 shadow-lg shadow-[#A855F7]/15">
                <FlaskConical className="w-8 h-8" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-white tracking-tight">
                No tienes ningún backtest creado
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 mt-2.5 mb-7 leading-relaxed">
                Crea tu primera pestaña de backtest para registrar y auditar estrategias cuantitativas de forma 100% independiente sin afectar tu diario real.
              </p>
              <button
                type="button"
                onClick={() => setIsNewBacktestOpen(true)}
                className="px-6 py-3 text-sm font-bold rounded-2xl bg-gradient-to-r from-[#A855F7] to-[#9333EA] hover:brightness-110 active:scale-95 text-white transition-all shadow-xl shadow-[#A855F7]/25 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ Crear mi primer backtest</span>
              </button>
            </div>
          </div>
        )}

        {/* Populated Content */}
        {(!isBacktest || backtestSheets.length > 0) && (!isLoading || trades.length > 0) && (
          <div className="space-y-5 sm:space-y-6">
            
            {/* 1. Hero + Dashboard Metrics */}
            <HeroStats 
              metrics={metrics} 
              isBacktest={isBacktest} 
              activeBacktestName={activeBacktest}
              studyYear={studyYear}
            />

            {/* 1.5. Calendario de Resultados */}
            <TradingCalendar
              trades={trades}
              onSelectTrade={setSelectedTrade}
              onEditTrade={handleOpenEditTrade}
              onDeleteTrade={handleRequestDeleteTrade}
              onNewTradeOnDate={handleOpenNewTradeOnDate}
              isOwner={isOwner}
              screenMode={screenInfo.mode}
              isBacktest={isBacktest}
              studyYear={studyYear}
            />

            {/* 2. Equity Curve */}
            <EquityChart 
              equityPoints={equityPoints} 
              isBacktest={isBacktest}
            />

            {/* 3. Performance Breakdown by Session, Setup and Emotion */}
            <MetricsBreakdown
              sessionStats={sessionStats}
              setupStats={setupStats}
              emotionStats={emotionStats}
              isBacktest={isBacktest}
            />

            {/* 4. Trades Gallery & Lightbox Trigger */}
            <TradeGallery
              trades={trades}
              onSelectTrade={setSelectedTrade}
              onOpenNewTrade={handleOpenNewTrade}
              onEditTrade={handleOpenEditTrade}
              onDeleteTrade={handleRequestDeleteTrade}
              isOwner={isOwner}
              isBacktest={isBacktest}
              activeBacktestName={activeBacktest}
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
        hoja={currentSheet}
        isBacktest={isBacktest}
        studyYear={studyYear}
        trades={trades}
        onUpdateStudyYear={handleChangeStudyYear}
        initialDate={newTradeDate}
      />

      {/* New Backtest Creation Modal */}
      <NewBacktestModal
        isOpen={isNewBacktestOpen}
        onClose={() => setIsNewBacktestOpen(false)}
        ownerKey={ownerKey}
        onSuccess={handleBacktestCreated}
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
                ¿Estás seguro de que deseas eliminar este trade de {isBacktest ? `"${currentSheet}"` : 'tu diario'}?
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

      {/* Footer */}
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
            <span className={`flex items-center gap-1.5 font-mono ${isBacktest ? 'text-[#C084FC]' : 'text-[#34C97A]'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isBacktest ? 'bg-[#C084FC]' : 'bg-[#34C97A]'}`} />
              {isBacktest ? `Pestaña: ${currentSheet || 'Sin selección'}` : 'Apps Script Real Backend'}
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
