import React, { useState, useEffect } from 'react';
import { createBacktestSheet } from '../services/api';
import { detectYearFromText } from '../utils/backtestDateUtils';
import { X, Plus, Loader2, FlaskConical, AlertCircle, Key, Calendar } from 'lucide-react';

interface NewBacktestModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerKey: string;
  onSuccess: (newSheetName: string, chosenYear?: number) => void;
  onNeedAuth?: () => void;
}

export const NewBacktestModal: React.FC<NewBacktestModalProps> = ({
  isOpen,
  onClose,
  ownerKey,
  onSuccess,
  onNeedAuth
}) => {
  const currentYear = new Date().getFullYear();
  const defaultYear = currentYear > 2024 ? currentYear - 1 : currentYear;

  const [nameInput, setNameInput] = useState('');
  const [yearInput, setYearInput] = useState<number>(defaultYear);
  const [customKey, setCustomKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect year when user types in the name
  useEffect(() => {
    const detected = detectYearFromText(nameInput);
    if (detected) {
      setYearInput(detected);
    }
  }, [nameInput]);

  if (!isOpen) return null;

  const effectiveKey = ownerKey || customKey;

  const cleanName = nameInput.trim();
  const previewSheetName = cleanName
    ? cleanName.toLowerCase().startsWith('backtest ')
      ? cleanName
      : `Backtest ${cleanName}`
    : 'Backtest [nombre]';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cleanName) {
      setError('Por favor ingresa un nombre para el backtest (ejemplo: 2025 o Scalping).');
      return;
    }

    if (!effectiveKey.trim()) {
      setError('Se requiere la clave del Modo Dueño para crear una pestaña en Google Sheets.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await createBacktestSheet(cleanName, effectiveKey.trim());
      if (result.ok && result.hoja) {
        setNameInput('');
        onSuccess(result.hoja, yearInput);
        onClose();
      } else {
        setError(result.error || 'No se pudo crear la pestaña de backtest en Google Sheets.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión al crear el backtest.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="glass-dropdown relative w-full max-w-md rounded-3xl border border-[#A855F7]/30 shadow-2xl p-6 overflow-hidden space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative purple glow */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#A855F7] to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#A855F7]/15 border border-[#A855F7]/30 text-[#C084FC] flex items-center justify-center shadow-lg shadow-[#A855F7]/10">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-white">
                Nuevo Backtest
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Crea una pestaña independiente en Google Sheets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-2xl bg-[#FF6B60]/10 border border-[#FF6B60]/30 text-xs text-[#FF6B60] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Nombre del Backtest
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Ejemplo: 2025, Estrategia Oro, Q1-2024..."
              className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.1] focus:border-[#A855F7] focus:outline-none text-white text-sm placeholder:text-neutral-500 transition-colors"
              autoFocus
              disabled={isLoading}
            />
            <p className="text-[11px] text-neutral-400 mt-1.5 font-mono">
              Se creará la pestaña: <span className="text-[#C084FC] font-semibold">{previewSheetName}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#C084FC]" />
                Año de estudio
              </span>
              <span className="text-[10px] text-neutral-400 font-normal">
                Facilita la fecha al registrar trades
              </span>
            </label>
            <input
              type="number"
              min={1990}
              max={2099}
              value={yearInput}
              onChange={(e) => setYearInput(parseInt(e.target.value, 10) || defaultYear)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.1] focus:border-[#A855F7] focus:outline-none text-white font-mono text-sm transition-colors"
              disabled={isLoading}
            />
            <p className="text-[11px] text-neutral-500 mt-1">
              Al registrar o editar trades en este backtest, el formulario se abrirá automáticamente en este año.
            </p>
          </div>

          {!ownerKey && (
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#A855F7]" />
                Clave de Modo Dueño
              </label>
              <input
                type="password"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="Ingresa tu clave de Apps Script..."
                className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.1] focus:border-[#A855F7] focus:outline-none text-white text-sm placeholder:text-neutral-500 transition-colors"
                disabled={isLoading}
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Requerida para autorizar la creación de la hoja en tu Google Spreadsheet.
              </p>
            </div>
          )}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-neutral-300 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !cleanName}
              className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-[#A855F7] to-[#9333EA] hover:brightness-110 text-white transition-all shadow-lg shadow-[#A855F7]/25 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creando pestaña...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Backtest</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
