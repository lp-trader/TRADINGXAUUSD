import React, { useState } from 'react';
import { X, KeyRound, ShieldCheck, Info } from 'lucide-react';
import { setStoredOwnerKey } from '../services/api';

interface OwnerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (key: string) => void;
  currentKey?: string;
}

export const OwnerAuthModal: React.FC<OwnerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentKey = ''
}) => {
  const [keyInput, setKeyInput] = useState(currentKey);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      setError('Por favor ingresa tu clave secreta de Google Apps Script.');
      return;
    }

    setStoredOwnerKey(keyInput.trim());
    onSuccess(keyInput.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="glass-dropdown relative w-full max-w-sm rounded-3xl border border-white/[0.12] shadow-2xl p-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-[#E0B341]/10 border border-[#E0B341]/30 mx-auto flex items-center justify-center text-[#E0B341] mb-3">
          <KeyRound className="w-6 h-6" />
        </div>

        <h3 className="font-heading text-lg font-bold text-white text-center">
          Activar Modo Dueño
        </h3>
        <p className="text-xs text-neutral-400 text-center mt-1 mb-4">
          Ingresa la clave secreta configurada en tu backend de Google Apps Script. Se almacenará en tu navegador (localStorage) para permitirte publicar trades.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-neutral-300 block mb-1.5 font-medium">
              Clave de Acceso (KEY):
            </label>
            <input
              type="password"
              autoFocus
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                setError('');
              }}
              placeholder="Ingresa tu clave secreta..."
              className="w-full text-center text-sm font-mono bg-white/[0.04] text-white py-2.5 px-3 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#E0B341]"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-[#FF6B60]/15 border border-[#FF6B60]/30 text-[11px] text-[#FF6B60]">
              {error}
            </div>
          )}

          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[11px] text-neutral-400 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#E0B341] shrink-0 mt-0.5" />
            <span>La clave nunca está escrita en el código público. Se envía directamente en la cabecera/payload de tus peticiones POST.</span>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2 text-xs font-bold rounded-xl bg-[#E0B341] text-[#0B0D12] hover:brightness-110 shadow-md shadow-[#E0B341]/20"
            >
              Activar Modo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
