import React from 'react';
import { ShieldCheck, ShieldAlert, PlusCircle, RefreshCw, LogOut, Key } from 'lucide-react';

interface HeaderProps {
  isOwner: boolean;
  onOpenAuthModal: () => void;
  onLogoutOwner: () => void;
  onOpenNewTrade: () => void;
  onRefreshTrades: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isOwner,
  onOpenAuthModal,
  onLogoutOwner,
  onOpenNewTrade,
  onRefreshTrades,
  isLoading
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0B0D12]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand */}
          <a href="#" className="group flex items-center gap-3 transition-opacity hover:opacity-95">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden ring-1 ring-[#E0B341]/40 shadow-lg shadow-[#E0B341]/15 bg-[#12151D] flex items-center justify-center shrink-0">
              <img
                src="/logo.jpg"
                alt="Trading Journal Logo"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <span className="font-heading font-bold text-xs text-[#E0B341] tracking-wider -z-10 absolute">
                AU
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="font-heading font-bold text-base sm:text-xl text-white tracking-tight group-hover:text-[#E0B341] transition-colors">
                Trading Journal
              </span>
              <span className="w-fit text-[#E0B341] text-[10px] sm:text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[#E0B341]/10 border border-[#E0B341]/25">
                XAU/USD
              </span>
            </div>
          </a>

          {/* Actions & Owner Mode */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Refresh Button */}
            <button
              onClick={onRefreshTrades}
              disabled={isLoading}
              title="Actualizar datos desde Google Apps Script"
              className="p-2 sm:px-3 sm:py-2 text-xs font-medium rounded-xl bg-white/[0.03] text-neutral-300 hover:text-white hover:bg-white/[0.07] border border-white/[0.08] transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#E0B341]' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            {/* Owner Mode Toggle Button */}
            {isOwner ? (
              <div className="flex items-center gap-1.5">
                <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl bg-[#E0B341]/10 text-[#E0B341] border border-[#E0B341]/25">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Modo Dueño</span>
                </span>
                <button
                  onClick={onLogoutOwner}
                  title="Cerrar Modo Dueño"
                  className="p-2 text-xs font-medium rounded-xl bg-white/[0.03] text-neutral-400 hover:text-red-400 hover:bg-red-500/10 border border-white/[0.08] transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                title="Activar Modo Dueño con clave"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-white/[0.03] text-neutral-400 hover:text-[#E0B341] hover:border-[#E0B341]/30 border border-white/[0.08] transition-all"
              >
                <Key className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Modo dueño</span>
              </button>
            )}

            {/* + Nuevo Trade (Visible only when owner key is active) */}
            {isOwner && (
              <button
                onClick={onOpenNewTrade}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#E0B341] to-[#C99C2E] text-[#0B0D12] hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#E0B341]/20 whitespace-nowrap"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Nuevo trade</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
