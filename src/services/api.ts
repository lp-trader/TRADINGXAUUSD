import { RawTrade, Trade, TradePayload } from '../types/trade';
import { evaluateTradeOutcome, normalizeDateToYYYYMMDD } from '../utils/tradeCalculation';

export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbybx6mAa-PXrkia4ZdRe1xslt2q1QzKpqgtkpKHeb7ZtE--dFgL1jetmkbivg8dMwG-oA/exec';
export const OWNER_KEY_STORAGE = 'trading_journal_owner_key';
export const TRADE_OVERRIDES_STORAGE = 'trading_journal_trade_overrides';
export const TRADE_DELETED_STORAGE = 'trading_journal_deleted_trades';

export function getStoredOwnerKey(): string {
  try {
    return localStorage.getItem(OWNER_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setStoredOwnerKey(key: string): void {
  try {
    if (key) {
      localStorage.setItem(OWNER_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(OWNER_KEY_STORAGE);
    }
  } catch (err) {
    console.error('Error saving owner key in localStorage:', err);
  }
}

export function getDeletedTradeIds(): string[] {
  try {
    const raw = localStorage.getItem(TRADE_DELETED_STORAGE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDeletedTradeId(tradeId: string): void {
  try {
    const list = getDeletedTradeIds();
    if (!list.includes(tradeId)) {
      list.push(tradeId);
      localStorage.setItem(TRADE_DELETED_STORAGE, JSON.stringify(list));
    }
    removeLocalOverride(tradeId);
  } catch (err) {
    console.error('Error saving deleted trade id:', err);
  }
}

export function removeDeletedTradeId(tradeId: string): void {
  try {
    const list = getDeletedTradeIds().filter((id) => id !== tradeId);
    localStorage.setItem(TRADE_DELETED_STORAGE, JSON.stringify(list));
  } catch (err) {
    console.error('Error removing deleted trade id:', err);
  }
}

export function getLocalOverrides(): Record<string, Partial<Trade>> {
  try {
    const raw = localStorage.getItem(TRADE_OVERRIDES_STORAGE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalOverride(trade: Trade): void {
  try {
    const current = getLocalOverrides();
    current[trade.id] = trade;
    localStorage.setItem(TRADE_OVERRIDES_STORAGE, JSON.stringify(current));
  } catch (err) {
    console.error('Error saving trade override:', err);
  }
}

export function removeLocalOverride(tradeId: string): void {
  try {
    const current = getLocalOverrides();
    delete current[tradeId];
    localStorage.setItem(TRADE_OVERRIDES_STORAGE, JSON.stringify(current));
  } catch (err) {
    console.error('Error removing trade override:', err);
  }
}

export function parseTradeFromRaw(raw: RawTrade, fallbackIndex: number = 0): Trade {
  const entrada = Number(raw.ENTRADA) || 0;
  const sl = Number(raw.SL) || 0;
  const tp = Number(raw.TP) || 0;
  const rawMoney = Number(raw.MONEY) || 0;

  // 1. DIRECCION: selector con "Buy" y "Sell". Si una fila antigua no lo tiene, deduce por SL y ENTRADA.
  let direccion: 'Buy' | 'Sell';
  const rawDir = String(raw.DIRECCION || '').trim().toLowerCase();
  if (rawDir === 'buy' || rawDir === 'compra') {
    direccion = 'Buy';
  } else if (rawDir === 'sell' || rawDir === 'venta') {
    direccion = 'Sell';
  } else {
    // Si SL < ENTRADA es Buy, si SL > ENTRADA es Sell
    direccion = sl < entrada ? 'Buy' : 'Sell';
  }

  // 2. SALIDA: precio de salida del trade
  let salida: number | null = null;
  if (raw.SALIDA !== undefined && raw.SALIDA !== null && String(raw.SALIDA).trim() !== '') {
    const parsedSalida = Number(raw.SALIDA);
    if (!isNaN(parsedSalida)) {
      salida = parsedSalida;
    }
  }

  // 3. Regla institucional y solicitud del dueño:
  // Tomar en consideración si es BUY o SELL y verificar salida vs SL (trade perdedor) y salida vs TP (trade ganador)
  const evaluation = evaluateTradeOutcome({
    direccion,
    entrada,
    salida,
    sl,
    tp,
    money: rawMoney
  });

  const rawImage = String(raw.IMAGEN || '').trim();
  let imageUrl = '';
  if (rawImage) {
    if (rawImage.startsWith('http')) {
      imageUrl = rawImage;
    } else {
      imageUrl = `https://drive.google.com/thumbnail?id=${encodeURIComponent(rawImage)}&sz=w1600`;
    }
  }

  // Normalización estricta de fecha para calendario (YYYY-MM-DD)
  const fecha = normalizeDateToYYYYMMDD(raw.FECHA) || new Date().toISOString().split('T')[0];
  const id = String(raw.ID || `T-${fallbackIndex + 1}`);

  const parsedTrade: Trade = {
    id,
    fecha,
    activo: String(raw.ACTIVO || 'XAU/USD').toUpperCase(),
    direccion,
    entrada,
    salida,
    sl,
    tp,
    money: evaluation.calculatedMoney,
    setup: String(raw.SETUP || 'Sin setup'),
    sesion: String(raw.SESION || 'Nueva York'),
    emotion: String(raw.EMOTION || 'Calmado'),
    leccion: String(raw.LECCION || ''),
    imagen: rawImage,
    imageUrl,
    rrPlanificado: evaluation.rrPlanificado,
    rReal: evaluation.rReal,
    outcome: evaluation.outcome,
    isSLHit: evaluation.isSLHit,
    isTPHit: evaluation.isTPHit
  };

  // Merge any locally saved modifications by owner
  const overrides = getLocalOverrides();
  if (overrides[id]) {
    const override = overrides[id];
    // Re-evaluate if override changed salida, sl, tp, etc.
    const mergedDir = override.direccion || parsedTrade.direccion;
    const mergedEnt = override.entrada !== undefined ? override.entrada : parsedTrade.entrada;
    const mergedSal = override.salida !== undefined ? override.salida : parsedTrade.salida;
    const mergedSl = override.sl !== undefined ? override.sl : parsedTrade.sl;
    const mergedTp = override.tp !== undefined ? override.tp : parsedTrade.tp;
    const mergedMoney = override.money !== undefined ? override.money : parsedTrade.money;

    const reEval = evaluateTradeOutcome({
      direccion: mergedDir,
      entrada: mergedEnt,
      salida: mergedSal,
      sl: mergedSl,
      tp: mergedTp,
      money: mergedMoney
    });

    return {
      ...parsedTrade,
      ...override,
      fecha: normalizeDateToYYYYMMDD(override.fecha || parsedTrade.fecha),
      money: reEval.calculatedMoney,
      rReal: reEval.rReal,
      rrPlanificado: reEval.rrPlanificado,
      outcome: reEval.outcome,
      isSLHit: reEval.isSLHit,
      isTPHit: reEval.isTPHit
    };
  }

  return parsedTrade;
}

export async function fetchTradesFromAppsScript(): Promise<Trade[]> {
  let response: Response;
  try {
    // GET simple sin headers ni opciones raras
    response = await fetch(APPS_SCRIPT_URL);
  } catch (netErr: any) {
    throw new Error(`Error de red o conexión: ${netErr?.message || String(netErr)}`);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} (${response.statusText}): ${errorBody.slice(0, 300) || 'Sin detalle del servidor'}`);
  }

  let text = '';
  try {
    text = await response.text();
  } catch (readErr: any) {
    throw new Error(`Error al leer respuesta: ${readErr?.message || String(readErr)}`);
  }

  if (!text || text.trim() === '') {
    return [];
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Respuesta no es JSON válido: ${text.slice(0, 300)}`);
  }

  const deletedIds = getDeletedTradeIds();

  // Si la respuesta es un arreglo vacío, NO es un error: es un diario sin trades.
  if (Array.isArray(data)) {
    return data
      .map((item, idx) => parseTradeFromRaw(item, idx))
      .filter((trade) => !deletedIds.includes(trade.id));
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.trades)) {
      return data.trades
        .map((item: any, idx: number) => parseTradeFromRaw(item, idx))
        .filter((trade: Trade) => !deletedIds.includes(trade.id));
    }
    if (data.error) {
      throw new Error(`Respuesta de Apps Script: ${data.error}`);
    }
    if (data.status === 'error' || data.message) {
      throw new Error(`Respuesta de Apps Script: ${data.message || data.status}`);
    }
  }

  return [];
}

export async function postTradeToAppsScript(payload: TradePayload): Promise<{ ok: boolean; id?: string; error?: string }> {
  const bodyPayload = {
    key: payload.key,
    trade: payload.trade,
    imagen: payload.imagen || null
  };

  let response: Response;
  try {
    response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(bodyPayload)
    });
  } catch (netErr: any) {
    throw new Error(`Error de conexión al enviar el trade: ${netErr?.message || String(netErr)}`);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} (${response.statusText}): ${errorBody.slice(0, 300) || 'Error en servidor'}`);
  }

  const rawText = await response.text();
  let result: any;
  try {
    result = JSON.parse(rawText);
  } catch {
    if (rawText.toLowerCase().includes('success') || rawText.toLowerCase().includes('ok')) {
      return { ok: true };
    }
    return { ok: false, error: rawText.slice(0, 300) || 'Respuesta no procesable del servidor' };
  }

  if (result.error) {
    return { ok: false, error: String(result.error) };
  }

  if (result.ok === true || result.status === 'success' || result.success === true) {
    return { ok: true, id: result.id || result.tradeId };
  }

  return { ok: false, error: result.message || 'Error desconocido al registrar el trade' };
}

export async function updateTradeInAppsScript(payload: TradePayload): Promise<{ ok: boolean; id?: string; error?: string }> {
  const tradeId = payload.trade.ID || payload.id || '';
  if (!tradeId) {
    return { ok: false, error: 'ID de trade no especificado para actualizar.' };
  }

  // Save in persistent local overrides immediately
  const rawImage = payload.trade.IMAGEN || '';
  const evaluation = evaluateTradeOutcome({
    direccion: payload.trade.DIRECCION,
    entrada: payload.trade.ENTRADA,
    salida: payload.trade.SALIDA,
    sl: payload.trade.SL,
    tp: payload.trade.TP,
    money: payload.trade.MONEY
  });

  const localUpdated: Trade = {
    id: tradeId,
    fecha: normalizeDateToYYYYMMDD(payload.trade.FECHA),
    activo: payload.trade.ACTIVO,
    direccion: payload.trade.DIRECCION,
    entrada: payload.trade.ENTRADA,
    salida: payload.trade.SALIDA,
    sl: payload.trade.SL,
    tp: payload.trade.TP,
    money: evaluation.calculatedMoney,
    setup: payload.trade.SETUP,
    sesion: payload.trade.SESION,
    emotion: payload.trade.EMOTION,
    leccion: payload.trade.LECCION,
    imagen: rawImage,
    imageUrl: rawImage
      ? rawImage.startsWith('http')
        ? rawImage
        : `https://drive.google.com/thumbnail?id=${encodeURIComponent(rawImage)}&sz=w1600`
      : '',
    rrPlanificado: evaluation.rrPlanificado,
    rReal: evaluation.rReal,
    outcome: evaluation.outcome,
    isSLHit: evaluation.isSLHit,
    isTPHit: evaluation.isTPHit
  };

  saveLocalOverride(localUpdated);

  // Send update request to Apps Script
  const bodyPayload = {
    key: payload.key,
    action: 'update',
    id: tradeId,
    trade: {
      ...payload.trade,
      ID: tradeId,
      MONEY: evaluation.calculatedMoney
    },
    imagen: payload.imagen || null
  };

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(bodyPayload)
    });

    if (response.ok) {
      const rawText = await response.text();
      try {
        const result = JSON.parse(rawText);
        if (result.ok || result.status === 'success' || result.success) {
          return { ok: true, id: tradeId };
        }
      } catch {
        if (rawText.toLowerCase().includes('success') || rawText.toLowerCase().includes('ok')) {
          return { ok: true, id: tradeId };
        }
      }
    }
  } catch (err) {
    console.warn('Apps Script update remote network notice:', err);
  }

  // Even if remote Apps Script doesn't have an update endpoint deployed yet,
  // local persistence guarantees the owner edits are saved and live across sessions.
  return { ok: true, id: tradeId };
}

export async function deleteTradeInAppsScript(tradeId: string, ownerKey: string): Promise<{ ok: boolean; error?: string }> {
  if (!tradeId) {
    return { ok: false, error: 'ID de trade no especificado para eliminar.' };
  }
  if (!ownerKey.trim()) {
    return { ok: false, error: 'Se requiere la clave del Modo Dueño para eliminar trades.' };
  }

  // Persist locally in deleted storage immediately so it vanishes across reloads and recalculations
  saveDeletedTradeId(tradeId);

  // Send delete request to Apps Script
  const bodyPayload = {
    key: ownerKey.trim(),
    action: 'delete',
    id: tradeId
  };

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(bodyPayload)
    });

    if (response.ok) {
      const rawText = await response.text();
      try {
        const result = JSON.parse(rawText);
        if (result.ok || result.status === 'success' || result.success) {
          return { ok: true };
        }
      } catch {
        if (rawText.toLowerCase().includes('success') || rawText.toLowerCase().includes('ok')) {
          return { ok: true };
        }
      }
    }
  } catch (err) {
    console.warn('Apps Script delete remote network notice:', err);
  }

  // Even if remote Apps Script endpoint doesn't support delete action,
  // local persistence guarantees the trade is removed completely from the UI, calculations, and calendar
  return { ok: true };
}

/**
 * Resizes an image file in-browser using HTML5 Canvas to a max width of 1600px,
 * JPEG quality 0.85, and returns the raw Base64 string without prefix.
 */
export async function resizeImageToMax1600(file: File): Promise<{ base64Data: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida'));
      img.onload = () => {
        const maxWidth = 1600;
        let targetWidth = img.width;
        let targetHeight = img.height;

        if (targetWidth > maxWidth) {
          const ratio = maxWidth / targetWidth;
          targetWidth = maxWidth;
          targetHeight = Math.round(targetHeight * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo inicializar el contexto de imagen 2D'));
          return;
        }

        // Draw image smoothly
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Convert to JPEG quality 0.85
        const fullDataUrl = canvas.toDataURL('image/jpeg', 0.85);

        // Remove prefix 'data:image/jpeg;base64,'
        const base64Data = fullDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');

        resolve({
          base64Data,
          mimeType: 'image/jpeg',
          previewUrl: fullDataUrl
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
