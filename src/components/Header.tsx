import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, RefreshCw, LogOut, Key, Plus, Smartphone, Tablet, Monitor, ChevronDown, Check } from 'lucide-react';
import { ScreenInfo, ScreenMode } from '../hooks/useScreenMode';

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
}

export const Header: React.FC<HeaderProps> = ({
  isOwner,
  onOpenAuthModal,
  onLogoutOwner,
  onOpenNewTrade,
  onRefreshTrades,
  isLoading,
  screenInfo
}) => {
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0B0D12]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-20 gap-2 sm:gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden ring-1 ring-[#E0B341]/40 shadow-lg shadow-[#E0B341]/15 bg-[#12151D] flex items-center justify-center shrink-0">
              <img
                src="/logo.jpg"
                alt="Trading Journal Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <span className="font-heading font-bold text-xs text-[#E0B341] tracking-wider -z-10 absolute">
                AU
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-heading font-bold text-sm sm:text-xl text-white tracking-tight truncate">
                  Trading Journal
                </span>
                <span className="text-[#E0B341] text-[9px] sm:text-xs font-mono font-semibold px-1.5 sm:px-2 py-0.5 rounded bg-[#E0B341]/10 border border-[#E0B341]/25 shrink-0">
                  XAU/USD
                </span>
              </div>
            </div>
          </div>

          {/* Actions & Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            
            {/* Screen Mode Indicator / Selector */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsDeviceMenuOpen((prev) => !prev)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs font-medium rounded-xl border transition-all ${
                  screenInfo.modeOverride !== 'auto'
                    ? 'bg-[#E0B341]/15 text-[#E0B341] border-[#E0B341]/35'
                    : 'bg-white/[0.03] text-neutral-300 hover:text-white border-white/[0.08] hover:bg-white/[0.06]'
                }`}
                title={`Modo de pantalla actual: ${screenInfo.label} (${screenInfo.width}px). Haz clic para cambiar.`}
              >
                {screenInfo.mode === 'phone' ? (
                  <Smartphone className="w-3.5 h-3.5 text-[#E0B341]" />
                ) : screenInfo.mode === 'tablet' ? (
                  <Tablet className="w-3.5 h-3.5 text-[#E0B341]" />
                ) : (
                  <Monitor className="w-3.5 h-3.5 text-[#E0B341]" />
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

                  {/* Option Auto */}
                  <button
                    type="button"
                    onClick={() => {
                      screenInfo.setOverride('auto');
                      setIsDeviceMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors text-left ${
                      screenInfo.modeOverride === 'auto'
                        ? 'bg-[#E0B341]/15 text-[#E0B341] font-semibold'
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
                    {screenInfo.modeOverride === 'auto' && <Check className="w-3.5 h-3.5 text-[#E0B341]" />}
                  </button>

                  {/* Option Phone */}
                  <button
                    type="button"
                    onClick={() => {
                      screenInfo.setOverride('phone');
                      setIsDeviceMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors text-left ${
                      screenInfo.modeOverride === 'phone'
                        ? 'bg-[#E0B341]/15 text-[#E0B341] font-semibold'
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
                    {screenInfo.modeOverride === 'phone' && <Check className="w-3.5 h-3.5 text-[#E0B341]" />}
                  </button>

                  {/* Option Tablet */}
                  <button
                    type="button"
                    onClick={() => {
                      screenInfo.setOverride('tablet');
                      setIsDeviceMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors text-left ${
                      screenInfo.modeOverride === 'tablet'
                        ? 'bg-[#E0B341]/15 text-[#E0B341] font-semibold'
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
                    {screenInfo.modeOverride === 'tablet' && <Check className="w-3.5 h-3.5 text-[#E0B341]" />}
                  </button>

                  {/* Option PC */}
                  <button
                    type="button"
                    onClick={() => {
                      screenInfo.setOverride('pc');
                      setIsDeviceMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors text-left ${
                      screenInfo.modeOverride === 'pc'
                        ? 'bg-[#E0B341]/15 text-[#E0B341] font-semibold'
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
                    {screenInfo.modeOverride === 'pc' && <Check className="w-3.5 h-3.5 text-[#E0B341]" />}
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
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#E0B341]' : ''}`} />
              <span className="hidden md:inline">Actualizar</span>
            </button>

            {/* Owner Mode Toggle Button */}
            {isOwner ? (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-xl bg-[#E0B341]/10 text-[#E0B341] border border-[#E0B341]/25">
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
                className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-xl bg-white/[0.03] text-neutral-400 hover:text-[#E0B341] hover:border-[#E0B341]/30 border border-white/[0.08] transition-all"
              >
                <Key className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Modo dueño</span>
              </button>
            )}

            {/* + Nuevo Trade (Visible only when owner key is active) */}
            {isOwner && (
              <button
                onClick={onOpenNewTrade}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-[#E0B341] to-[#C99C2E] text-[#0B0D12] hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#E0B341]/20 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">+ Nuevo trade</span>
                <span className="xs:hidden">Nuevo</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};

