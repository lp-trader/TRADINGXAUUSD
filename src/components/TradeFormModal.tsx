import React, { useState } from 'react';
import { TradePayload } from '../types/trade';
import { postTradeToAppsScript, resizeImageToMax1600 } from '../services/api';
import { X, Upload, AlertCircle, CheckCircle2, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';

interface TradeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerKey: string;
  onSuccess: () => void;
}

export const TradeFormModal: React.FC<TradeFormModalProps> = ({
  isOpen,
  onClose,
  ownerKey,
  onSuccess
}) => {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [activo, setActivo] = useState('XAU/USD');
  const [entrada, setEntrada] = useState<string>('');
  const [sl, setSl] = useState<string>('');
  const [tp, setTp] = useState<string>('');
  const [money, setMoney] = useState<string>('');
  const [setup, setSetup] = useState('');
  const [sesion, setSesion] = useState<'Asia' | 'Londres' | 'Nueva York'>('Nueva York');
  const [emotion, setEmotion] = useState<'Calmado' | 'Confiado' | 'Ansioso' | 'FOMO' | 'Revancha'>('Calmado');
  const [leccion, setLeccion] = useState('');

  // Image state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    try {
      setIsProcessingImage(true);
      setErrorMessage('');
      const { previewUrl } = await resizeImageToMax1600(file);
      setSelectedFile(file);
      setImagePreview(previewUrl);
    } catch (err: any) {
      setErrorMessage('Error al procesar la imagen: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!ownerKey.trim()) {
      setErrorMessage('Se requiere la clave del Modo Dueño para publicar operaciones.');
      return;
    }

    const numEntrada = parseFloat(entrada);
    const numSl = parseFloat(sl);
    const numTp = parseFloat(tp);
    const numMoney = parseFloat(money);

    if (isNaN(numEntrada) || isNaN(numSl) || isNaN(numTp) || isNaN(numMoney)) {
      setErrorMessage('Por favor ingresa números válidos para Entrada, SL, TP y MONEY.');
      return;
    }

    setIsSubmitting(true);

    try {
      let imagenPayload: { data: string; type: string } | undefined = undefined;

      if (selectedFile) {
        // Resize to max 1600px width with quality 0.85
        const { base64Data, mimeType } = await resizeImageToMax1600(selectedFile);
        imagenPayload = {
          data: base64Data,
          type: mimeType
        };
      }

      const payload: TradePayload = {
        key: ownerKey.trim(),
        trade: {
          FECHA: fecha,
          ACTIVO: activo.toUpperCase().trim() || 'XAU/USD',
          ENTRADA: numEntrada,
          SL: numSl,
          TP: numTp,
          MONEY: numMoney,
          SETUP: setup.trim() || 'General',
          SESION: sesion,
          EMOTION: emotion,
          LECCION: leccion.trim()
        },
        imagen: imagenPayload
      };

      const res = await postTradeToAppsScript(payload);

      if (res.ok) {
        setSuccessMessage('¡Trade registrado exitosamente en Google Sheets y Google Drive!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else {
        setErrorMessage(res.error || 'Clave incorrecta o error en el backend de Apps Script.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión con Google Apps Script.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="glass-dropdown relative w-full max-w-2xl rounded-3xl border border-white/[0.12] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0E1119]/80 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E0B341]" />
            <h3 className="font-heading text-lg font-bold text-white">
              Nuevo Trade
            </h3>
            <span className="text-xs font-mono text-[#E0B341] px-2 py-0.5 rounded bg-[#E0B341]/10 border border-[#E0B341]/20">
              Modo Dueño
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.04] text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-[#FF6B60]/15 border border-[#FF6B60]/30 text-xs text-[#FF6B60] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-[#34C97A]/15 border border-[#34C97A]/30 text-xs text-[#34C97A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Fecha & Activo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-300 block mb-1 font-medium">Fecha (FECHA)</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-white/[0.04] text-xs text-white px-3 py-2.5 rounded-xl border border-white/[0.08] font-mono focus:outline-none focus:border-[#E0B341]"
                required
              />
            </div>
            <div>
              <label className="text-xs text-neutral-300 block mb-1 font-medium">Activo (ACTIVO)</label>
              <input
                type="text"
                value={activo}
                onChange={(e) => setActivo(e.target.value)}
                placeholder="XAU/USD"
                className="w-full bg-white/[0.04] text-xs text-white px-3 py-2.5 rounded-xl border border-white/[0.08] font-mono focus:outline-none focus:border-[#E0B341]"
                required
              />
            </div>
          </div>

          {/* Prices: Entrada, SL, TP, MONEY */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <span className="text-[11px] font-semibold text-[#E0B341] uppercase tracking-wider block">
              Parámetros de Ejecución
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Entrada</label>
                <input
                  type="number"
                  step="0.01"
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value)}
                  placeholder="2650.00"
                  className="w-full bg-white/[0.04] text-sm text-white px-3 py-2 rounded-xl border border-white/[0.08] font-mono focus:outline-none focus:border-[#E0B341]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-[#FF6B60] block mb-1">Stop Loss (SL)</label>
                <input
                  type="number"
                  step="0.01"
                  value={sl}
                  onChange={(e) => setSl(e.target.value)}
                  placeholder="2642.00"
                  className="w-full bg-white/[0.04] text-sm text-[#FF6B60] px-3 py-2 rounded-xl border border-white/[0.08] font-mono focus:outline-none focus:border-[#FF6B60]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-[#34C97A] block mb-1">Take Profit (TP)</label>
                <input
                  type="number"
                  step="0.01"
                  value={tp}
                  onChange={(e) => setTp(e.target.value)}
                  placeholder="2670.00"
                  className="w-full bg-white/[0.04] text-sm text-[#34C97A] px-3 py-2 rounded-xl border border-white/[0.08] font-mono focus:outline-none focus:border-[#34C97A]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-300 block mb-1 font-medium">Resultado ($ MONEY)</label>
                <input
                  type="number"
                  step="0.01"
                  value={money}
                  onChange={(e) => setMoney(e.target.value)}
                  placeholder="+1500 o -500"
                  className={`w-full bg-white/[0.04] text-sm font-bold px-3 py-2 rounded-xl border border-white/[0.08] font-mono focus:outline-none ${
                    !money || isNaN(parseFloat(money)) ? 'text-white' : parseFloat(money) >= 0 ? 'text-[#34C97A]' : 'text-[#FF6B60]'
                  }`}
                  required
                />
              </div>
            </div>

            {/* Inferred direction & R:R pill */}
            {entrada && sl && !isNaN(parseFloat(entrada)) && !isNaN(parseFloat(sl)) && (
              <div className="flex items-center gap-3 pt-1 text-xs font-mono">
                <span className="text-neutral-400">
                  Dirección:{' '}
                  <strong className={parseFloat(sl) < parseFloat(entrada) ? 'text-[#34C97A]' : 'text-[#FF6B60]'}>
                    {parseFloat(sl) < parseFloat(entrada) ? 'COMPRA (SL < Entrada)' : 'VENTA (SL > Entrada)'}
                  </strong>
                </span>
                {tp && !isNaN(parseFloat(tp)) && Math.abs(parseFloat(entrada) - parseFloat(sl)) > 0 && (
                  <span className="text-[#E0B341]">
                    R:R Planeado:{' '}
                    1:{(Math.abs(parseFloat(tp) - parseFloat(entrada)) / Math.abs(parseFloat(entrada) - parseFloat(sl))).toFixed(2)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Setup, Sesión, Emoción */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-neutral-300 block mb-1 font-medium">Setup (SETUP)</label>
              <input
                type="text"
                value={setup}
                onChange={(e) => setSetup(e.target.value)}
                placeholder="Liquidity Sweep M5"
                className="w-full bg-white/[0.04] text-xs text-white px-3 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#E0B341]"
                required
              />
            </div>

            <div>
              <label className="text-xs text-neutral-300 block mb-1 font-medium">Sesión (SESION)</label>
              <select
                value={sesion}
                onChange={(e) => setSesion(e.target.value as any)}
                className="w-full bg-white/[0.04] text-xs text-white px-3 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#E0B341]"
              >
                <option value="Asia" className="bg-[#10141D]">Asia</option>
                <option value="Londres" className="bg-[#10141D]">Londres</option>
                <option value="Nueva York" className="bg-[#10141D]">Nueva York</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-neutral-300 block mb-1 font-medium">Emoción (EMOTION)</label>
              <select
                value={emotion}
                onChange={(e) => setEmotion(e.target.value as any)}
                className="w-full bg-white/[0.04] text-xs text-white px-3 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#E0B341]"
              >
                <option value="Calmado" className="bg-[#10141D]">Calmado</option>
                <option value="Confiado" className="bg-[#10141D]">Confiado</option>
                <option value="Ansioso" className="bg-[#10141D]">Ansioso</option>
                <option value="FOMO" className="bg-[#10141D]">FOMO</option>
                <option value="Revancha" className="bg-[#10141D]">Revancha</option>
              </select>
            </div>
          </div>

          {/* Lección */}
          <div>
            <label className="text-xs text-neutral-300 block mb-1 font-medium">
              Lección & Conclusión (LECCION)
            </label>
            <textarea
              rows={2}
              value={leccion}
              onChange={(e) => setLeccion(e.target.value)}
              placeholder="Reflexión sobre la ejecución, psicología y cumplimiento del plan..."
              className="w-full bg-white/[0.04] text-xs text-white p-3 rounded-xl border border-white/[0.08] placeholder-neutral-500 focus:outline-none focus:border-[#E0B341]"
            />
          </div>

          {/* Image Upload with Canvas Resize */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <span className="text-xs font-semibold text-[#E0B341] uppercase tracking-wider block">
              Captura del Gráfico
            </span>

            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/[0.12] hover:border-[#E0B341]/50 rounded-2xl cursor-pointer bg-white/[0.01] hover:bg-white/[0.03] transition-all">
              <Upload className="w-5 h-5 text-[#E0B341] mb-1.5" />
              <span className="text-xs font-medium text-white">
                {selectedFile ? selectedFile.name : 'Subir captura del gráfico (TradingView)'}
              </span>
              <span className="text-[10px] text-neutral-500 mt-0.5">
                Se redimensiona a máx 1600px en el navegador antes de subir a Google Drive
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
            </label>

            {isProcessingImage && (
              <div className="text-xs text-[#E0B341] flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Optimizando imagen...</span>
              </div>
            )}

            {imagePreview && (
              <div className="relative aspect-video rounded-xl overflow-hidden border border-white/[0.1] max-h-32 mx-auto">
                <img
                  src={imagePreview}
                  alt="Vista previa"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-[#E0B341] to-[#C99C2E] text-[#0B0D12] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#E0B341]/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B0D12]" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar Trade</span>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
