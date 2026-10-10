import React, { useState, useEffect, useMemo } from 'react';
import { Trade, TradePayload } from '../types/trade';
import { postTradeToAppsScript, updateTradeInAppsScript, resizeImageToMax1600 } from '../services/api';
import { evaluateTradeOutcome, normalizeDateToYYYYMMDD } from '../utils/tradeCalculation';
import { 
  X, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  Image as ImageIcon,
  Edit3,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  ArrowRightLeft,
  Trash2
} from 'lucide-react';

interface TradeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerKey: string;
  tradeToEdit?: Trade | null;
  onSuccess: () => void;
  onDeleteTrade?: (trade: Trade) => void;
}

export const TradeFormModal: React.FC<TradeFormModalProps> = ({
  isOpen,
  onClose,
  ownerKey,
  tradeToEdit = null,
  onSuccess,
  onDeleteTrade
}) => {
  const isEditing = Boolean(tradeToEdit);

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [activo, setActivo] = useState('XAU/USD');
  const [direccion, setDireccion] = useState<'Buy' | 'Sell'>('Buy');
  const [entrada, setEntrada] = useState<string>('');
  const [salida, setSalida] = useState<string>('');
  const [sl, setSl] = useState<string>('');
  const [tp, setTp] = useState<string>('');
  const [money, setMoney] = useState<string>('');
  const [setup, setSetup] = useState('');
  const [sesion, setSesion] = useState<'Asia' | 'Londres' | 'Nueva York' | string>('Nueva York');
  const [emotion, setEmotion] = useState<'Calmado' | 'Confiado' | 'Ansioso' | 'FOMO' | 'Revancha' | 'MIEDO/DUDA' | string>('Calmado');
  const [leccion, setLeccion] = useState('');

  // Image state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [existingImageId, setExistingImageId] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sync state when opening or when tradeToEdit changes
  useEffect(() => {
    if (!isOpen) return;

    if (tradeToEdit) {
      setFecha(normalizeDateToYYYYMMDD(tradeToEdit.fecha) || new Date().toISOString().split('T')[0]);
      setActivo(tradeToEdit.activo || 'XAU/USD');
      setDireccion(tradeToEdit.direccion || 'Buy');
      setEntrada(tradeToEdit.entrada != null ? String(tradeToEdit.entrada) : '');
      setSalida(tradeToEdit.salida != null ? String(tradeToEdit.salida) : '');
      setSl(tradeToEdit.sl != null ? String(tradeToEdit.sl) : '');
      setTp(tradeToEdit.tp != null ? String(tradeToEdit.tp) : '');
      setMoney(tradeToEdit.money != null ? String(tradeToEdit.money) : '');
      setSetup(tradeToEdit.setup || '');
      setSesion(tradeToEdit.sesion || 'Nueva York');
      setEmotion(tradeToEdit.emotion || 'Calmado');
      setLeccion(tradeToEdit.leccion || '');
      setExistingImageId(tradeToEdit.imagen || '');
      setImagePreview(tradeToEdit.imageUrl || '');
      setSelectedFile(null);
    } else {
      // Default blank values for new trade
      setFecha(new Date().toISOString().split('T')[0]);
      setActivo('XAU/USD');
      setDireccion('Buy');
      setEntrada('');
      setSalida('');
      setSl('');
      setTp('');
      setMoney('');
      setSetup('');
      setSesion('Nueva York');
      setEmotion('Calmado');
      setLeccion('');
      setExistingImageId('');
      setImagePreview('');
      setSelectedFile(null);
    }
    setErrorMessage('');
    setSuccessMessage('');
  }, [isOpen, tradeToEdit]);

  // Live evaluated outcome calculation (all hooks and calculations kept before conditional return)
  const numEntrada = parseFloat(entrada);
  const numSalida = salida.trim() !== '' ? parseFloat(salida) : null;
  const numSl = parseFloat(sl);
  const numTp = parseFloat(tp);
  const numMoney = parseFloat(money);

  const liveEvaluation = useMemo(() => {
    if (!isOpen) return null;
    if (isNaN(numEntrada) || isNaN(numSl) || isNaN(numTp)) {
      return null;
    }
    return evaluateTradeOutcome({
      direccion,
      entrada: numEntrada,
      salida: numSalida !== null && !isNaN(numSalida) ? numSalida : null,
      sl: numSl,
      tp: numTp,
      money: !isNaN(numMoney) ? numMoney : null
    });
  }, [isOpen, direccion, numEntrada, numSalida, numSl, numTp, numMoney]);

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

  // Quick Action: Match Exit to TP
  const handleSetExitToTP = () => {
    if (!isNaN(numTp)) {
      setSalida(String(numTp));
      // If money was negative or empty, make positive
      if (!isNaN(numMoney)) {
        setMoney(String(Math.abs(numMoney)));
      }
    }
  };

  // Quick Action: Match Exit to SL
  const handleSetExitToSL = () => {
    if (!isNaN(numSl)) {
      setSalida(String(numSl));
      // If money was positive or empty, make negative
      if (!isNaN(numMoney)) {
        setMoney(String(-Math.abs(numMoney)));
      }
    }
  };

  // Quick Action: Match Exit to Entrada (Breakeven)
  const handleSetExitToBE = () => {
    if (!isNaN(numEntrada)) {
      setSalida(String(numEntrada));
      setMoney('0');
    }
  };

  // Quick Action: Auto-align Money Sign based on Outcome
  const handleAutoAlignMoney = () => {
    if (!liveEvaluation) return;
    if (liveEvaluation.outcome === 'BREAKEVEN') {
      setMoney('0');
      return;
    }
    const currentAbs = !isNaN(numMoney) && Math.abs(numMoney) > 0 ? Math.abs(numMoney) : 100;
    if (liveEvaluation.outcome === 'WIN') {
      setMoney(String(currentAbs));
    } else if (liveEvaluation.outcome === 'LOSS') {
      setMoney(String(-currentAbs));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!ownerKey.trim()) {
      setErrorMessage('Se requiere la clave del Modo Dueño para publicar o modificar operaciones.');
      return;
    }

    if (isNaN(numEntrada) || isNaN(numSl) || isNaN(numTp)) {
      setErrorMessage('Por favor ingresa números válidos para Entrada, SL y TP.');
      return;
    }

    // Auto-align money sign to ensure no accidental positive money for losing trades
    let finalMoney = !isNaN(numMoney) ? numMoney : 0;
    if (liveEvaluation) {
      if (liveEvaluation.outcome === 'LOSS') {
        finalMoney = -Math.abs(finalMoney);
      } else if (liveEvaluation.outcome === 'WIN') {
        finalMoney = Math.abs(finalMoney);
      } else if (liveEvaluation.outcome === 'BREAKEVEN') {
        finalMoney = 0;
      }
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

      const tradeId = isEditing && tradeToEdit ? tradeToEdit.id : undefined;

      const payload: TradePayload = {
        key: ownerKey.trim(),
        action: isEditing ? 'update' : 'create',
        id: tradeId,
        trade: {
          ID: tradeId,
          FECHA: fecha,
          ACTIVO: activo.toUpperCase().trim() || 'XAU/USD',
          DIRECCION: direccion,
          ENTRADA: numEntrada,
          SALIDA: numSalida !== null && !isNaN(numSalida) ? numSalida : numEntrada,
          SL: numSl,
          TP: numTp,
          MONEY: finalMoney,
          SETUP: setup.trim() || 'General',
          SESION: sesion,
          EMOTION: emotion,
          LECCION: leccion.trim(),
          IMAGEN: existingImageId || (tradeToEdit?.imagen || '')
        },
        imagen: imagenPayload
      };

      let res;
      if (isEditing) {
        res = await updateTradeInAppsScript(payload);
      } else {
        res = await postTradeToAppsScript(payload);
      }

      if (res.ok) {
        setSuccessMessage(
          isEditing
            ? '¡Trade actualizado exitosamente en tu diario!'
            : '¡Trade registrado exitosamente!'
        );
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1100);
      } else {
        setErrorMessage(res.error || 'Error al procesar la operación.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión con el backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="glass-dropdown relative w-full max-w-2xl rounded-2xl sm:rounded-3xl border border-white/[0.12] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/[0.08] bg-[#0E1119]/80 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isEditing ? 'bg-[#34C97A]' : 'bg-[#E0B341]'}`} />
            <h3 className="font-heading text-base sm:text-lg font-bold text-white">
              {isEditing ? `Editar Trade ${tradeToEdit?.id ? `(${tradeToEdit.id})` : ''}` : 'Nuevo Trade'}
            </h3>
            <span className="text-[10px] sm:text-xs font-mono text-[#E0B341] px-1.5 sm:px-2 py-0.5 rounded bg-[#E0B341]/10 border border-[#E0B341]/20">
              Modo Dueño
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-white/[0.04] text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-3.5 sm:space-y-4">
          
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
              <label className="text-xs text-neutral-300 block mb-1 font-medium">1. Fecha de Operación</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-white/[0.04] text-xs text-white px-3 py-2.5 rounded-xl border border-white/[0.08] font-mono focus:outline-none focus:border-[#E0B341]"
                required
              />
            </div>
            <div>
              <label className="text-xs text-neutral-300 block mb-1 font-medium">2. Activo</label>
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
              <label className="text-xs text-neutral-300 block mb-1 font-medium">3. Dirección (BUY / SELL)</label>
              <select
                value={direccion}
                onChange={(e) => setDireccion(e.target.value as 'Buy' | 'Sell')}
                className={`w-full text-xs font-bold font-mono px-3 py-2.5 rounded-xl border transition-colors focus:outline-none ${
                  direccion === 'Buy'
                    ? 'bg-[#34C97A]/15 text-[#34C97A] border-[#34C97A]/40'
                    : 'bg-[#FF6B60]/15 text-[#FF6B60] border-[#FF6B60]/40'
                }`}
              >
                <option value="Buy" className="bg-[#10141D] text-[#34C97A]">BUY (Compra - Long)</option>
                <option value="Sell" className="bg-[#10141D] text-[#FF6B60]">SELL (Venta - Short)</option>
              </select>
            </div>
          </div>

          {/* 4. ENTRADA, 5. SALIDA, 6. SL, 7. TP, 8. MONEY */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-[#E0B341] uppercase tracking-wider block">
                Precios de Ejecución & Resultado
              </span>

              {/* Quick Fill Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleSetExitToTP}
                  className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-[#34C97A]/15 hover:bg-[#34C97A]/30 text-[#34C97A] border border-[#34C97A]/30 transition-colors flex items-center gap-1"
                  title="Fijar salida igual al TP"
                >
                  <Target className="w-3 h-3" />
                  <span>Salió en TP</span>
                </button>

                <button
                  type="button"
                  onClick={handleSetExitToSL}
                  className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-[#FF6B60]/15 hover:bg-[#FF6B60]/30 text-[#FF6B60] border border-[#FF6B60]/30 transition-colors flex items-center gap-1"
                  title="Fijar salida igual al SL"
                >
                  <ShieldAlert className="w-3 h-3" />
                  <span>Salió en SL</span>
                </button>

                <button
                  type="button"
                  onClick={handleSetExitToBE}
                  className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 border border-white/[0.1] transition-colors flex items-center gap-1"
                  title="Fijar salida igual a la entrada (Breakeven)"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  <span>Breakeven</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">4. Entrada</label>
                <input
                  type="number"
                  step="0.01"
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value)}
                  placeholder="4152.87"
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
                  placeholder="4162.49"
                  className="w-full bg-white/[0.04] text-sm text-[#E0B341] px-3 py-2 rounded-xl border border-white/[0.08] font-mono focus:outline-none focus:border-[#E0B341]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-[#FF6B60] block mb-1 font-medium">6. Stop Loss (SL)</label>
                <input
                  type="number"
                  step="0.01"
                  value={sl}
                  onChange={(e) => setSl(e.target.value)}
                  placeholder="4162.49"
                  className="w-full bg-white/[0.04] text-sm text-[#FF6B60] px-3 py-2 rounded-xl border border-white/[0.08] font-mono focus:outline-none focus:border-[#FF6B60]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-[#34C97A] block mb-1 font-medium">7. Take Profit (TP)</label>
                <input
                  type="number"
                  step="0.01"
                  value={tp}
                  onChange={(e) => setTp(e.target.value)}
                  placeholder="4124.12"
                  className="w-full bg-white/[0.04] text-sm text-[#34C97A] px-3 py-2 rounded-xl border border-white/[0.08] font-mono focus:outline-none focus:border-[#34C97A]"
                  required
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-neutral-300 font-medium">8. Resultado ($ MONEY)</label>
                  {liveEvaluation && (
                    <button
                      type="button"
                      onClick={handleAutoAlignMoney}
                      className="text-[10px] text-[#E0B341] hover:underline"
                      title="Ajustar signo automáticamente"
                    >
                      Ajustar +/-
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={money}
                  onChange={(e) => setMoney(e.target.value)}
                  placeholder="+300 o -100"
                  className={`w-full bg-white/[0.04] text-sm font-bold px-3 py-2 rounded-xl border border-white/[0.08] font-mono focus:outline-none ${
                    !money || isNaN(parseFloat(money)) 
                      ? 'text-white' 
                      : parseFloat(money) > 0 
                        ? 'text-[#34C97A]' 
                        : parseFloat(money) < 0 
                          ? 'text-[#FF6B60]' 
                          : 'text-neutral-400'
                  }`}
                  required
                />
              </div>
            </div>

            {/* Smart calculation banner */}
            {liveEvaluation && (
              <div className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                liveEvaluation.outcome === 'WIN'
                  ? 'bg-[#34C97A]/10 border-[#34C97A]/30 text-[#34C97A]'
                  : liveEvaluation.outcome === 'LOSS'
                    ? 'bg-[#FF6B60]/10 border-[#FF6B60]/30 text-[#FF6B60]'
                    : 'bg-[#E0B341]/10 border-[#E0B341]/30 text-[#E0B341]'
              }`}>
                <div className="flex items-center gap-2">
                  {liveEvaluation.outcome === 'WIN' ? (
                    <TrendingUp className="w-4 h-4 shrink-0" />
                  ) : liveEvaluation.outcome === 'LOSS' ? (
                    <TrendingDown className="w-4 h-4 shrink-0" />
                  ) : (
                    <ArrowRightLeft className="w-4 h-4 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold">
                      {liveEvaluation.statusLabel}
                    </span>
                    <p className="text-[11px] opacity-90 font-mono mt-0.5">
                      {liveEvaluation.explanation}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 font-mono text-[11px]">
                  {liveEvaluation.rReal !== null && (
                    <span className="px-2 py-0.5 rounded bg-black/40 font-bold">
                      R: {liveEvaluation.rReal >= 0 ? '+' : ''}{liveEvaluation.rReal.toFixed(2)}R
                    </span>
                  )}
                  {liveEvaluation.rrPlanificado > 0 && (
                    <span className="px-2 py-0.5 rounded bg-black/40 text-neutral-300">
                      Plan: 1:{liveEvaluation.rrPlanificado.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 9. SETUP, 10. SESION, 11. EMOTION */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-neutral-300 block mb-1 font-medium">9. Setup (SETUP)</label>
              <input
                type="text"
                value={setup}
                onChange={(e) => setSetup(e.target.value)}
                placeholder="FIBO 2 / Sweep M5"
                className="w-full bg-white/[0.04] text-xs text-white px-3 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#E0B341]"
                required
              />
            </div>

            <div>
              <label className="text-xs text-neutral-300 block mb-1 font-medium">10. Sesión</label>
              <select
                value={sesion}
                onChange={(e) => setSesion(e.target.value)}
                className="w-full bg-white/[0.04] text-xs text-white px-3 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#E0B341]"
              >
                <option value="Asia" className="bg-[#10141D]">Asia</option>
                <option value="Londres" className="bg-[#10141D]">Londres</option>
                <option value="Nueva York" className="bg-[#10141D]">Nueva York</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-neutral-300 block mb-1 font-medium">11. Emoción</label>
              <select
                value={emotion}
                onChange={(e) => setEmotion(e.target.value)}
                className="w-full bg-white/[0.04] text-xs text-white px-3 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#E0B341]"
              >
                <option value="Calmado" className="bg-[#10141D]">Calmado</option>
                <option value="Confiado" className="bg-[#10141D]">Confiado</option>
                <option value="Ansioso" className="bg-[#10141D]">Ansioso</option>
                <option value="FOMO" className="bg-[#10141D]">FOMO</option>
                <option value="Revancha" className="bg-[#10141D]">Revancha</option>
                <option value="MIEDO/DUDA" className="bg-[#10141D]">MIEDO/DUDA</option>
                {!['Calmado', 'Confiado', 'Ansioso', 'FOMO', 'Revancha', 'MIEDO/DUDA'].includes(emotion) && emotion && (
                  <option value={emotion} className="bg-[#10141D]">{emotion}</option>
                )}
              </select>
            </div>
          </div>

          {/* 12. LECCION */}
          <div>
            <label className="text-xs text-neutral-300 block mb-1 font-medium">
              12. Lección & Conclusión (LECCION)
            </label>
            <textarea
              rows={3}
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
                {selectedFile 
                  ? selectedFile.name 
                  : imagePreview 
                    ? 'Reemplazar imagen actual del trade' 
                    : 'Subir captura del gráfico (TradingView)'}
              </span>
              <span className="text-[10px] text-neutral-500 mt-0.5">
                Se redimensiona a máx 1600px en el navegador antes de subir
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
              <div className="relative aspect-video rounded-xl overflow-hidden border border-white/[0.1] max-h-36 mx-auto">
                <img
                  src={imagePreview}
                  alt="Vista previa"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
            <div>
              {isEditing && tradeToEdit && onDeleteTrade && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteTrade(tradeToEdit);
                  }}
                  disabled={isSubmitting}
                  className="px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-[#FF6B60]/10 hover:bg-[#FF6B60]/20 text-[#FF6B60] border border-[#FF6B60]/30 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  title="Eliminar este trade permanentemente"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Trade</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
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
                    <span>{isEditing ? 'Actualizando...' : 'Guardando...'}</span>
                  </>
                ) : (
                  <span>{isEditing ? 'Guardar Cambios' : 'Guardar Trade'}</span>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
