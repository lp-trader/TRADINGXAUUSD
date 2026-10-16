import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  RefreshCw, 
  LogOut, 
  Key, 
  Plus, 
  Smartphone, 
  Tablet, 
  Monitor, 
  ChevronDown, 
  Check, 
  FlaskConical, 
  Activity,
  Calendar
} from 'lucide-react';
import { ScreenInfo, ScreenMode } from '../hooks/useScreenMode';
import { AppMode } from '../types/trade';

interface HeaderProps {
  isOwner: boolean;
  onOpenAuthModal: () => void;
  onLogoutOwner: () => void;
  onOpenNewTrade: () => void;
  onRefreshTrades: () => void;
  isLoading: boolean;
  screenInfo: ScreenInfo & {
    detectedMode: ScreenMode;
    modeOverride: 'auto' | ScreenMode;
    setOverride: (mode: 'auto' | ScreenMode) => void;
  };
  appMode: AppMode;
  onChangeAppMode: (mode: AppMode) => void;
  backtestSheets: string[];
  activeBacktest: string;
  onChangeActiveBacktest: (sheet: string) => void;
  onOpenNewBacktest: () => void;
  studyYear?: number;
  onChangeStudyYear?: (year: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isOwner,
  onOpenAuthModal,
  onLogoutOwner,
  onOpenNewTrade,
  onRefreshTrades,
  isLoading,
  screenInfo,
  appMode,
  onChangeAppMode,
  backtestSheets,
  activeBacktest,
  onChangeActiveBacktest,
  onOpenNewBacktest,
  studyYear,
  onChangeStudyYear
}) => {
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isBacktest = appMode === 'backtest';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsDeviceMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0B0D12]/95 backdrop-blur-md">
      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-20 gap-2 sm:gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden ring-1 shadow-lg bg-[#12151D] flex items-center justify-center shrink-0 transition-colors ${
              isBacktest 
                ? 'ring-[#A855F7]/50 shadow-[#A855F7]/20' 
                : 'ring-[#E0B341]/40 shadow-[#E0B341]/15'
            }`}>
              <img
                src="/logo.jpg"
                alt="Trading Journal Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <span className={`font-heading font-bold text-xs tracking-wider -z-10 absolute ${
                isBacktest ? 'text-[#C084FC]' : 'text-[#E0B341]'
              }`}>
                {isBacktest ? 'BT' : 'AU'}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-heading font-bold text-sm sm:text-xl text-white tracking-tight truncate">
                  Trading Journal
                </span>
                <span className={`text-[9px] sm:text-xs font-mono font-semibold px-1.5 sm:px-2 py-0.5 rounded border shrink-0 transition-colors ${
                  isBacktest
                    ? 'text-[#C084FC] bg-[#A855F7]/15 border-[#A855F7]/30'
                    : 'text-[#E0B341] bg-[#E0B341]/10 border-[#E0B341]/25'
                }`}>
                  {isBacktest ? 'BACKTEST' : 'XAU/USD'}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Segmented Control Real | Backtest */}
          <div className="flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-inner shrink-0">
            <button
              type="button"
              onClick={() => onChangeAppMode('real')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl text-xs font-semibold transition-all ${
                !isBacktest
                  ? 'bg-gradient-to-r from-[#E0B341] to-[#C99C2E] text-[#0B0D12] shadow-md shadow-[#E0B341]/20 font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Real</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeAppMode('backtest')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isBacktest
                  ? 'bg-gradient-to-r from-[#A855F7] to-[#7C3AED] text-white shadow-md shadow-[#A855F7]/25 font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Backtest</span>
            </button>
          </div>

          {/* Right Actions & Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            
            {/* Screen Mode Indicator / Selector */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsDeviceMenuOpen((prev) => !prev)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs font-medium rounded-xl border transition-all ${
                  screenInfo.modeOverride !== 'auto'
                    ? isBacktest
                      ? 'bg-[#A855F7]/15 text-[#C084FC] border-[#A855F7]/35'
                      : 'bg-[#E0B341]/15 text-[#E0B341] border-[#E0B341]/35'
                    : 'bg-white/[0.03] text-neutral-300 hover:text-white border-white/[0.08] hover:bg-white/[0.06]'
                }`}
                title={`Modo de pantalla actual: ${screenInfo.label} (${screenInfo.width}px). Haz clic para cambiar.`}
              >
                {screenInfo.mode === 'phone' ? (
                  <Smartphone className={`w-3.5 h-3.5 ${isBacktest ? 'text-[#C084FC]' : 'text-[#E0B341]'}`} />
                ) : screenInfo.mode === 'tablet' ? (
                  <Tablet className={`w-3.5 h-3.5 ${isBacktest ? 'text-[#C084FC]' : 'text-[#E0B341]'}`} />
                ) : (
                  <Monitor className={`w-3.5 h-3.5 ${isBacktest ? 'text-[#C084FC]' : 'text-[#E0B341]'}`} />
                )}
                
                <span className="hidden sm:inline font-mono">
                  {screenInfo.label}
                </span>
                
                <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
              </button>

              {/* Dropdown Menu for Device Mode Selection */}
              {isDeviceMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 p-2 rounded-2xl glass-dropdown border border-white/[0.12] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
                  <div className="px-2.5 py-1.5 border-b border-white/[0.06] mb-1">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">
                      Detección de Pantalla
                    </span>
                    <span className="text-[11px] text-neutral-300 font-mono">
                      Resolución: {screenInfo.width} × {screenInfo.height} px
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      screenInfo.setOverride('auto');
                      setIsDeviceMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors text-left ${
                      screenInfo.modeOverride === 'auto'
                        ? isBacktest
                          ? 'bg-[#A855F7]/15 text-[#C084FC] font-semibold'
                          : 'bg-[#E0B341]/15 text-[#E0B341] font-semibold'
                        : 'text-neutral-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">🔄</span>
                      <div>
                        <span>Automático</span>
                        <span className="text-[10px] text-neutral-400 block font-normal">
                          Detectado: {screenInfo.detectedMode === 'phone' ? 'Teléfono' : screenInfo.detectedMode === 'tablet' ? 'Tablet' : 'PC'}
                        </span>
                      </div>
                    </div>
                    {screenInfo.modeOverride === 'auto' && (
                      <Check className={`w-3.5 h-3.5 ${isBacktest ? 'text-[#C084FC]' : 'text-[#E0B341]'}`} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      screenInfo.setOverride('phone');
                      setIsDeviceMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors text-left ${
                      screenInfo.modeOverride === 'phone'
                        ? isBacktest
                          ? 'bg-[#A855F7]/15 text-[#C084FC] font-semibold'
                          : 'bg-[#E0B341]/15 text-[#E0B341] font-semibold'
                        : 'text-neutral-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span>Teléfono</span>
                        <span className="text-[10px] text-neutral-400 block font-normal">Optimizado para móvil (&lt;768px)</span>
                      </div>
                    </div>
                    {screenInfo.modeOverride === 'phone' && (
                      <Check className={`w-3.5 h-3.5 ${isBacktest ? 'text-[#C084FC]' : 'text-[#E0B341]'}`} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      screenInfo.setOverride('tablet');
                      setIsDeviceMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors text-left ${
                      screenInfo.modeOverride === 'tablet'
                        ? isBacktest
                          ? 'bg-[#A855F7]/15 text-[#C084FC] font-semibold'
                          : 'bg-[#E0B341]/15 text-[#E0B341] font-semibold'
                        : 'text-neutral-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Tablet className="w-4 h-4 text-sky-400" />
                      <div>
                        <span>Tablet</span>
                        <span className="text-[10px] text-neutral-400 block font-normal">Vista intermedia (768–1024px)</span>
                      </div>
                    </div>
                    {screenInfo.modeOverride === 'tablet' && (
                      <Check className={`w-3.5 h-3.5 ${isBacktest ? 'text-[#C084FC]' : 'text-[#E0B341]'}`} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      screenInfo.setOverride('pc');
                      setIsDeviceMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors text-left ${
                      screenInfo.modeOverride === 'pc'
                        ? isBacktest
                          ? 'bg-[#A855F7]/15 text-[#C084FC] font-semibold'
                          : 'bg-[#E0B341]/15 text-[#E0B341] font-semibold'
                        : 'text-neutral-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-amber-400" />
                      <div>
                        <span>PC / Escritorio</span>
                        <span className="text-[10px] text-neutral-400 block font-normal">Vista completa (&gt;1024px)</span>
                      </div>
                    </div>
                    {screenInfo.modeOverride === 'pc' && (
                      <Check className={`w-3.5 h-3.5 ${isBacktest ? 'text-[#C084FC]' : 'text-[#E0B341]'}`} />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefreshTrades}
              disabled={isLoading}
              title="Actualizar datos desde Google Apps Script"
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-xl bg-white/[0.03] text-neutral-300 hover:text-white hover:bg-white/[0.07] border border-white/[0.08] transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? `animate-spin ${isBacktest ? 'text-[#C084FC]' : 'text-[#E0B341]'}` : ''}`} />
              <span className="hidden md:inline">Actualizar</span>
            </button>

            {/* Owner Mode Toggle Button */}
            {isOwner ? (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-xl border ${
                  isBacktest
                    ? 'bg-[#A855F7]/10 text-[#C084FC] border-[#A855F7]/30'
                    : 'bg-[#E0B341]/10 text-[#E0B341] border-[#E0B341]/25'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Dueño</span>
                </span>
                <button
                  onClick={onLogoutOwner}
                  title="Cerrar Modo Dueño"
                  className="p-1.5 sm:p-2 text-xs font-medium rounded-xl bg-white/[0.03] text-neutral-400 hover:text-red-400 hover:bg-red-500/10 border border-white/[0.08] transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                title="Activar Modo Dueño con clave"
                className={`flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-xl bg-white/[0.03] text-neutral-400 border border-white/[0.08] transition-all ${
                  isBacktest
                    ? 'hover:text-[#C084FC] hover:border-[#A855F7]/35'
                    : 'hover:text-[#E0B341] hover:border-[#E0B341]/30'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Modo dueño</span>
              </button>
            )}

            {/* + Nuevo Trade (Visible only when owner key is active) */}
            {isOwner && (
              <button
                onClick={onOpenNewTrade}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-bold rounded-xl text-[#0B0D12] hover:brightness-110 active:scale-95 transition-all shadow-md whitespace-nowrap ${
                  isBacktest
                    ? 'bg-gradient-to-r from-[#C084FC] to-[#A855F7] text-[#0B0D12] shadow-[#A855F7]/25'
                    : 'bg-gradient-to-r from-[#E0B341] to-[#C99C2E] shadow-[#E0B341]/20'
                }`}
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">+ Nuevo trade</span>
                <span className="xs:hidden">Nuevo</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Backtest Sub-Bar (Visible exclusively in Backtest mode) */}
      {isBacktest && (
        <div className="border-t border-[#A855F7]/20 bg-[#120F1D]/90 px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 transition-all">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
            
            {/* Left: Active Backtest Tag + Sheet Selector */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#A855F7]/20 border border-[#A855F7]/40 text-[#C084FC] text-xs font-bold font-mono shrink-0 shadow-sm shadow-[#A855F7]/10">
                <FlaskConical className="w-3.5 h-3.5" />
                <span>MODO BACKTEST</span>
              </div>

              {backtestSheets.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] text-neutral-400 font-medium hidden sm:inline">Pestaña activa:</span>
                    <div className="relative">
                      <select
                        value={activeBacktest}
                        onChange={(e) => onChangeActiveBacktest(e.target.value)}
                        className="appearance-none bg-black/50 hover:bg-black/70 text-white text-xs font-semibold pl-3 pr-8 py-1.5 rounded-xl border border-[#A855F7]/40 focus:outline-none focus:border-[#C084FC] cursor-pointer transition-colors"
                      >
                        {backtestSheets.map((sheet) => (
                          <option key={sheet} value={sheet} className="bg-[#12151D] text-white">
                            {sheet}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-[#C084FC] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Study Year Selector */}
                  {studyYear && onChangeStudyYear && (
                    <div className="flex items-center gap-1.5 min-w-0 pl-1 sm:pl-2 border-l border-white/[0.08]">
                      <Calendar className="w-3.5 h-3.5 text-[#C084FC] shrink-0" />
                      <span className="text-[11px] text-neutral-300 font-medium hidden xs:inline">Año de estudio:</span>
                      <div className="relative">
                        <select
                          value={studyYear}
                          onChange={(e) => onChangeStudyYear(parseInt(e.target.value, 10))}
                          className="appearance-none bg-black/50 hover:bg-black/70 text-[#C084FC] font-mono text-xs font-bold pl-2.5 pr-7 py-1.5 rounded-xl border border-[#A855F7]/40 focus:outline-none focus:border-[#C084FC] cursor-pointer transition-colors"
                          title="Año fijado para registrar trades en este backtest"
                        >
                          {Array.from(new Set([
                            studyYear,
                            2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018
                          ])).sort((a, b) => b - a).map((yr) => (
                            <option key={yr} value={yr} className="bg-[#12151D] text-white">
                              {yr}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-[#C084FC] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <span className="text-xs text-neutral-400 font-mono">
                  No hay backtests creados aún
                </span>
              )}
            </div>

            {/* Right: + Nuevo backtest button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenNewBacktest}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-[#A855F7] to-[#9333EA] hover:brightness-110 text-white transition-all shadow-md shadow-[#A855F7]/25"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Nuevo backtest</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </header>
  );
};
