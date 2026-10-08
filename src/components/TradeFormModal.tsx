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
  const [direccion, setDireccion] = useState<'Buy' | 'Sell'>('Buy');
  const [entrada, setEntrada] = useState<string>('');
  const [salida, setSalida] = useState<string>('');
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
    const numSalida = parseFloat(salida);
    const numSl = parseFloat(sl);
    const numTp = parseFloat(tp);
    const numMoney = parseFloat(money);

    if (isNaN(numEntrada) || isNaN(numSalida) || isNaN(numSl) || isNaN(numTp) || isNaN(numMoney)) {
      setErrorMessage('Por favor ingresa números válidos para Entrada, Salida, SL, TP y MONEY.');
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
          DIRECCION: direccion,
          ENTRADA: numEntrada,
          SALIDA: numSalida,
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

  // Live calculation preview
  const numEnt = parseFloat(entrada);
  const numSal = parseFloat(salida);
  const numS = parseFloat(sl);
  const numT = parseFloat(tp);
  const risk = !isNaN(numEnt) && !isNaN(numS) ? Math.abs(numEnt - numS) : 0;
  const liveRReal = !isNaN(numEnt) && !isNaN(numSal) && !isNaN(numS) && risk > 0
    ? Math.round((((numSal - numEnt) * (direccion === 'Buy' ? 1 : -1)) / risk) * 100) / 100
    : null;
  const liveRRPlan = !isNaN(numEnt) && !isNaN(numT) && !isNaN(numS) && risk > 0
    ? Math.round((Math.abs(numT - numEnt) / risk) * 100) / 100
    : null;

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

          {/* 1. FECHA, 2. ACTIVO, 3. DIRECCION */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-neutral-300 block mb-1 font-medium">1. Fecha (FECHA)</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-white/[0.04] text-xs text-white px-3 py-2.5 rounded-xl border border-white/[0.08] font-mono focus:outline-none focus:border-[#E0B341]"
                required
              />
            </div>
            <div>
              <label className="text-xs text-neutral-300 block mb-1 font-medium">2. Activo (ACTIVO)</label>
              <input
                type="text"
                value={activo}
                onChange={(e) => setActivo(e.target.value)}
                placeholder="XAU/USD"
                className="w-full bg-white/[0.04] text-xs text-white px-3 py-2.5 rounded-xl border border-white/[0.08] font-mono focus:outline-none focus:border-[#E0B341]"
                required
              />
            </div>
            <div>
              <label className="text-xs text-neutral-300 block mb-1 font-medium">3. Dirección (DIRECCION)</label>
              <select
                value={direccion}
                onChange={(e) => setDireccion(e.target.value as 'Buy' | 'Sell')}
                className={`w-full text-xs font-bold font-mono px-3 py-2.5 rounded-xl border transition-colors focus:outline-none ${
                  direccion === 'Buy'
                    ? 'bg-[#34C97A]/15 text-[#34C97A] border-[#34C97A]/40'
                    : 'bg-[#FF6B60]/15 text-[#FF6B60] border-[#FF6B60]/40'
                }`}
              >
                <option value="Buy" className="bg-[#10141D] text-[#34C97A]">Buy</option>
                <option value="Sell" className="bg-[#10141D] text-[#FF6B60]">Sell</option>
              </select>
            </div>
          </div>

          {/* 4. ENTRADA, 5. SALIDA, 6. SL, 7. TP, 8. MONEY */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <span className="text-[11px] font-semibold text-[#E0B341] uppercase tracking-wider block">
              Parámetros de Ejecución
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">4. Entrada</label>
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
                <label className="text-[11px] text-[#E0B341] block mb-1 font-medium">5. Salida</label>
                <input
                  type="number"
                  step="0.01"
                  value={salida}
                  onChange={(e) => setSalida(e.target.value)}
                  placeholder="2665.00"
                  className="w-full bg-white/[0.04] text-sm text-[#E0B341] px-3 py-2 rounded-xl border border-white/[0.08] font-mono focus:outline-none focus:border-[#E0B341]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-[#FF6B60] block mb-1">6. Stop Loss (SL)</label>
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
                <label className="text-[11px] text-[#34C97A] block mb-1">7. Take Profit (TP)</label>
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

              <div className="col-span-2 sm:col-span-1">
                <label className="text-[11px] text-neutral-300 block mb-1 font-medium">8. Resultado ($ MONEY)</label>
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

            {/* Live calculation badges for instant trader feedback */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono">
              <span className="text-neutral-400">
                Dirección seleccionada:{' '}
                <strong className={direccion === 'Buy' ? 'text-[#34C97A]' : 'text-[#FF6B60]'}>
                  {direccion}
                </strong>
              </span>

              {liveRReal !== null && (
                <span className={liveRReal >= 0 ? 'text-[#34C97A]' : 'text-[#FF6B60]'}>
                  R Real estimado: <strong>{liveRReal >= 0 ? '+' : ''}{liveRReal.toFixed(2)}R</strong>
                </span>
              )}

              {liveRRPlan !== null && (
                <span className="text-[#E0B341]">
                  R:R Planeado: <strong>1:{liveRRPlan.toFixed(2)}</strong>
                </span>
              )}
            </div>
          </div>

          {/* 9. SETUP, 10. SESION, 11. EMOTION */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-neutral-300 block mb-1 font-medium">9. Setup (SETUP)</label>
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
              <label className="text-xs text-neutral-300 block mb-1 font-medium">10. Sesión (SESION)</label>
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
              <label className="text-xs text-neutral-300 block mb-1 font-medium">11. Emoción (EMOTION)</label>
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

          {/* 12. LECCION */}
          <div>
            <label className="text-xs text-neutral-300 block mb-1 font-medium">
              12. Lección & Conclusión (LECCION)
            </label>
            <textarea
              rows={2}
              value={leccion}
              onChange={(e) => setLeccion(e.target.value)}
              placeholder="Reflexión sobre la ejecución, psicología y cumplimiento del plan..."
              className="w-full bg-white/[0.04] text-xs text-white p-3 rounded-xl border border-white/[0.08] placeholder-neutral-500 focus:outline-none focus:border-[#E0B341]"
            />
          </div>

          {/* 13. IMAGEN (Captura del Gráfico) */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <span className="text-xs font-semibold text-[#E0B341] uppercase tracking-wider block">
              13. Captura del Gráfico
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
