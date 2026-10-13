import { RawTrade, Trade, TradePayload, AppMode } from '../types/trade';
import { evaluateTradeOutcome, normalizeDateToYYYYMMDD, parseNumero } from '../utils/tradeCalculation';

export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbybx6mAa-PXrkia4ZdRe1xslt2q1QzKpqgtkpKHeb7ZtE--dFgL1jetmkbivg8dMwG-oA/exec';
export const OWNER_KEY_STORAGE = 'trading_journal_owner_key';
export const APP_MODE_STORAGE = 'trading_journal_app_mode';
export const ACTIVE_BACKTEST_STORAGE = 'trading_journal_active_backtest';
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

export function getStoredAppMode(): AppMode {
  try {
    const mode = localStorage.getItem(APP_MODE_STORAGE);
    if (mode === 'backtest') return 'backtest';
    return 'real';
  } catch {
    return 'real';
  }
}

export function setStoredAppMode(mode: AppMode): void {
  try {
    localStorage.setItem(APP_MODE_STORAGE, mode);
  } catch (err) {
    console.error('Error saving app mode in localStorage:', err);
  }
}

export function getStoredActiveBacktest(): string {
  try {
    return localStorage.getItem(ACTIVE_BACKTEST_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setStoredActiveBacktest(sheetName: string): void {
  try {
    if (sheetName) {
      localStorage.setItem(ACTIVE_BACKTEST_STORAGE, sheetName.trim());
    } else {
      localStorage.removeItem(ACTIVE_BACKTEST_STORAGE);
    }
  } catch (err) {
    console.error('Error saving active backtest in localStorage:', err);
  }
}

function getDeletedStorageKey(hoja?: string): string {
  const clean = hoja && hoja.trim() !== 'Trades' ? hoja.trim().replace(/\s+/g, '_') : 'Trades';
  return `${TRADE_DELETED_STORAGE}_${clean}`;
}

function getOverridesStorageKey(hoja?: string): string {
  const clean = hoja && hoja.trim() !== 'Trades' ? hoja.trim().replace(/\s+/g, '_') : 'Trades';
  return `${TRADE_OVERRIDES_STORAGE}_${clean}`;
}

export function getDeletedTradeIds(hoja?: string): string[] {
  try {
    const key = getDeletedStorageKey(hoja);
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);

    // Fallback to legacy global storage for "Trades"
    if (!hoja || hoja === 'Trades') {
      const legacyRaw = localStorage.getItem(TRADE_DELETED_STORAGE);
      return legacyRaw ? JSON.parse(legacyRaw) : [];
    }
    return [];
  } catch {
    return [];
  }
}

export function saveDeletedTradeId(tradeId: string, hoja?: string): void {
  try {
    const list = getDeletedTradeIds(hoja);
    if (!list.includes(tradeId)) {
      list.push(tradeId);
      const key = getDeletedStorageKey(hoja);
      localStorage.setItem(key, JSON.stringify(list));
    }
    removeLocalOverride(tradeId, hoja);
  } catch (err) {
    console.error('Error saving deleted trade id:', err);
  }
}

export function removeDeletedTradeId(tradeId: string, hoja?: string): void {
  try {
    const list = getDeletedTradeIds(hoja).filter((id) => id !== tradeId);
    const key = getDeletedStorageKey(hoja);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (err) {
    console.error('Error removing deleted trade id:', err);
  }
}

export function getLocalOverrides(hoja?: string): Record<string, Partial<Trade>> {
  try {
    const key = getOverridesStorageKey(hoja);
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);

    // Fallback to legacy global storage for "Trades"
    if (!hoja || hoja === 'Trades') {
      const legacyRaw = localStorage.getItem(TRADE_OVERRIDES_STORAGE);
      return legacyRaw ? JSON.parse(legacyRaw) : {};
    }
    return {};
  } catch {
    return {};
  }
}

export function saveLocalOverride(trade: Trade, hoja?: string): void {
  try {
    const current = getLocalOverrides(hoja);
    current[trade.id] = trade;
    const key = getOverridesStorageKey(hoja);
    localStorage.setItem(key, JSON.stringify(current));
  } catch (err) {
    console.error('Error saving trade override:', err);
  }
}

export function removeLocalOverride(tradeId: string, hoja?: string): void {
  try {
    const current = getLocalOverrides(hoja);
    delete current[tradeId];
    const key = getOverridesStorageKey(hoja);
    localStorage.setItem(key, JSON.stringify(current));
  } catch (err) {
    console.error('Error removing trade override:', err);
  }
}

export function parseTradeFromRaw(raw: RawTrade, fallbackIndex: number = 0, hoja?: string): Trade {
  const entrada = parseNumero(raw.ENTRADA) ?? 0;
  const sl = parseNumero(raw.SL) ?? 0;
  const tp = parseNumero(raw.TP) ?? 0;
  const rawMoney = parseNumero(raw.MONEY) ?? 0;
  const salida = parseNumero(raw.SALIDA);

  // 1. DIRECCION: selector con "Buy" y "Sell". Si una fila no lo tiene, deduce por SL y ENTRADA.
  let direccion: 'Buy' | 'Sell';
  const rawDir = String(raw.DIRECCION || '').trim().toLowerCase();
  if (rawDir === 'buy' || rawDir === 'compra') {
    direccion = 'Buy';
  } else if (rawDir === 'sell' || rawDir === 'venta') {
    direccion = 'Sell';
  } else {
    direccion = sl < entrada ? 'Buy' : 'Sell';
  }

  // 2. Regla institucional y evaluación con parseNumero:
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

  // Merge any locally saved modifications by owner for this sheet
  const overrides = getLocalOverrides(hoja);
  if (overrides[id]) {
    const override = overrides[id];
    const mergedDir = override.direccion || parsedTrade.direccion;
    const mergedEnt = override.entrada !== undefined ? (parseNumero(override.entrada) ?? 0) : parsedTrade.entrada;
    const mergedSal = override.salida !== undefined ? parseNumero(override.salida) : parsedTrade.salida;
    const mergedSl = override.sl !== undefined ? (parseNumero(override.sl) ?? 0) : parsedTrade.sl;
    const mergedTp = override.tp !== undefined ? (parseNumero(override.tp) ?? 0) : parsedTrade.tp;
    const mergedMoney = override.money !== undefined ? (parseNumero(override.money) ?? 0) : parsedTrade.money;

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

export function deduplicateRawTrades(rawList: RawTrade[], hoja?: string): RawTrade[] {
  if (!rawList || rawList.length <= 1) return rawList || [];

  const deletedIds = getDeletedTradeIds(hoja);
  const activeList = rawList.filter((item) => {
    const id = item.ID ? String(item.ID).trim() : '';
    return !id || !deletedIds.includes(id);
  });

  const groups = new Map<string, { item: RawTrade; index: number }[]>();

  activeList.forEach((item, index) => {
    const activo = String(item.ACTIVO || '').trim().toUpperCase();
    const entrada = (parseNumero(item.ENTRADA) ?? 0).toFixed(5);
    const sl = (parseNumero(item.SL) ?? 0).toFixed(5);
    const tp = (parseNumero(item.TP) ?? 0).toFixed(5);
    const setup = String(item.SETUP || '').trim().toLowerCase();
    const lessonSnippet = String(item.LECCION || '').slice(0, 30).trim().toLowerCase();

    const signature = `${activo}___${entrada}___${sl}___${tp}___${setup || lessonSnippet}`;

    if (!groups.has(signature)) {
      groups.set(signature, []);
    }
    groups.get(signature)!.push({ item, index });
  });

  const deduplicated: RawTrade[] = [];
  const obsoleteIds: string[] = [];

  groups.forEach((group) => {
    if (group.length === 1) {
      deduplicated.push(group[0].item);
    } else {
      const itemWithImage = group.find((g) => g.item.IMAGEN && String(g.item.IMAGEN).trim() !== '');
      const bestImage = itemWithImage ? String(itemWithImage.item.IMAGEN).trim() : '';
      const latest = group[group.length - 1].item;

      const merged: RawTrade = {
        ...latest,
        IMAGEN: latest.IMAGEN && String(latest.IMAGEN).trim() !== '' ? latest.IMAGEN : bestImage
      };

      deduplicated.push(merged);

      for (let i = 0; i < group.length - 1; i++) {
        const obsId = group[i].item.ID ? String(group[i].item.ID).trim() : '';
        if (obsId) {
          obsoleteIds.push(obsId);
        }
      }
    }
  });

  if (obsoleteIds.length > 0) {
    obsoleteIds.forEach((id) => saveDeletedTradeId(id, hoja));
  }

  return deduplicated;
}

/**
 * Lists all backtest sheets from Google Apps Script (?action=hojas)
 * Returns array of sheet names starting with "Backtest "
 */
export async function fetchBacktestSheets(): Promise<string[]> {
  const url = `${APPS_SCRIPT_URL}?action=hojas`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (err: any) {
    console.error('Error al listar hojas de backtest:', err);
    return [];
  }

  if (!response.ok) {
    console.warn('Error HTTP al listar hojas de backtest:', response.status);
    return [];
  }

  try {
    const text = await response.text();
    if (!text || !text.trim()) return [];

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return [];
    }

    let list: any[] = [];
    if (Array.isArray(data)) {
      list = data;
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.hojas)) list = data.hojas;
      else if (Array.isArray(data.sheets)) list = data.sheets;
      else if (Array.isArray(data.result)) list = data.result;
      else if (Array.isArray(data.data)) list = data.data;
    }

    // Filter to sheets that start with "Backtest " (case-insensitive)
    const backtestNames = list
      .map((item) => String(item).trim())
      .filter((name) => name.toLowerCase().startsWith('backtest '));

    return Array.from(new Set(backtestNames));
  } catch (err) {
    console.error('Error al procesar listado de hojas:', err);
    return [];
  }
}

/**
 * Creates a new Backtest sheet in Google Apps Script
 * POST { key, action: "crearHoja", hoja: "Backtest 2025" }
 */
export async function createBacktestSheet(
  nombre: string,
  ownerKey: string
): Promise<{ ok: boolean; hoja: string; error?: string }> {
  const clean = nombre.trim();
  if (!clean) {
    return { ok: false, hoja: '', error: 'Por favor ingresa un nombre para el backtest.' };
  }

  // Ensure sheet name starts with "Backtest "
  const sheetName = clean.toLowerCase().startsWith('backtest ')
    ? clean
    : `Backtest ${clean}`;

  const bodyPayload = {
    key: ownerKey.trim(),
    action: 'crearHoja',
    hoja: sheetName
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
  } catch (err: any) {
    return { ok: false, hoja: sheetName, error: `Error de conexión: ${err.message || String(err)}` };
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    return {
      ok: false,
      hoja: sheetName,
      error: `HTTP ${response.status}: ${errorBody.slice(0, 300) || 'Error al crear la pestaña'}`
    };
  }

  const rawText = await response.text();
  try {
    const result = JSON.parse(rawText);
    if (result.error) {
      return { ok: false, hoja: sheetName, error: String(result.error) };
    }
    return { ok: true, hoja: sheetName };
  } catch {
    if (
      rawText.toLowerCase().includes('success') ||
      rawText.toLowerCase().includes('ok') ||
      rawText.toLowerCase().includes('cread')
    ) {
      return { ok: true, hoja: sheetName };
    }
    return { ok: true, hoja: sheetName };
  }
}

/**
 * Fetches trades for the specified sheet.
 * If hoja is omitted or "Trades", reads the live "Trades" sheet without params.
 * If hoja is a backtest sheet, appends ?hoja=NOMBRE (encoded).
 */
export async function fetchTradesFromAppsScript(hoja?: string): Promise<Trade[]> {
  const targetHoja = hoja && hoja.trim() !== 'Trades' ? hoja.trim() : '';
  const url = targetHoja
    ? `${APPS_SCRIPT_URL}?hoja=${encodeURIComponent(targetHoja)}`
    : APPS_SCRIPT_URL;

  let response: Response;
  try {
    response = await fetch(url);
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

  let rawList: RawTrade[] = [];
  if (Array.isArray(data)) {
    rawList = data;
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.trades)) {
      rawList = data.trades;
    } else if (data.error) {
      throw new Error(`Respuesta de Apps Script: ${data.error}`);
    } else if (data.status === 'error' || data.message) {
      throw new Error(`Respuesta de Apps Script: ${data.message || data.status}`);
    }
  }

  // Deduplicate trades and automatically merge superseded edit records for this specific sheet
  const cleanRaw = deduplicateRawTrades(rawList, targetHoja || 'Trades');
  const deletedIds = getDeletedTradeIds(targetHoja || 'Trades');

  return cleanRaw
    .map((item, idx) => parseTradeFromRaw(item, idx, targetHoja || 'Trades'))
    .filter((trade) => !deletedIds.includes(trade.id));
}

export async function postTradeToAppsScript(
  payload: TradePayload,
  hoja?: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const targetHoja = hoja || payload.hoja;

  const entradaNum = parseNumero(payload.trade.ENTRADA) ?? 0;
  const salidaNum = parseNumero(payload.trade.SALIDA);
  const slNum = parseNumero(payload.trade.SL) ?? 0;
  const tpNum = parseNumero(payload.trade.TP) ?? 0;
  const moneyNum = parseNumero(payload.trade.MONEY) ?? 0;

  const sanitizedTrade = {
    ...payload.trade,
    ENTRADA: Number(entradaNum),
    SALIDA: Number(salidaNum !== null ? salidaNum : entradaNum),
    SL: Number(slNum),
    TP: Number(tpNum),
    MONEY: Number(moneyNum)
  };

  const bodyPayload: any = {
    key: payload.key,
    trade: sanitizedTrade,
    imagen: payload.imagen || null
  };

  // Only include hoja if saving to a backtest sheet (if omitted, Apps Script defaults to "Trades")
  if (targetHoja && targetHoja.trim() !== 'Trades') {
    bodyPayload.hoja = targetHoja.trim();
  }

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

export async function updateTradeInAppsScript(
  payload: TradePayload,
  hoja?: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const targetHoja = hoja || payload.hoja;
  const tradeId = payload.trade.ID || payload.id || '';
  if (!tradeId) {
    return { ok: false, error: 'ID de trade no especificado para actualizar.' };
  }

  const entradaNum = parseNumero(payload.trade.ENTRADA) ?? 0;
  const salidaNum = parseNumero(payload.trade.SALIDA);
  const slNum = parseNumero(payload.trade.SL) ?? 0;
  const tpNum = parseNumero(payload.trade.TP) ?? 0;
  const moneyNum = parseNumero(payload.trade.MONEY) ?? 0;

  const rawImage = payload.trade.IMAGEN || '';
  const evaluation = evaluateTradeOutcome({
    direccion: payload.trade.DIRECCION,
    entrada: entradaNum,
    salida: salidaNum,
    sl: slNum,
    tp: tpNum,
    money: moneyNum
  });

  const localUpdated: Trade = {
    id: tradeId,
    fecha: normalizeDateToYYYYMMDD(payload.trade.FECHA),
    activo: payload.trade.ACTIVO,
    direccion: payload.trade.DIRECCION,
    entrada: entradaNum,
    salida: salidaNum,
    sl: slNum,
    tp: tpNum,
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

  // Save in sheet-scoped local overrides
  saveLocalOverride(localUpdated, targetHoja);

  const sanitizedTrade = {
    ...payload.trade,
    ID: tradeId,
    ENTRADA: Number(entradaNum),
    SALIDA: Number(salidaNum !== null ? salidaNum : entradaNum),
    SL: Number(slNum),
    TP: Number(tpNum),
    MONEY: Number(evaluation.calculatedMoney)
  };

  const bodyPayload: any = {
    key: payload.key,
    action: 'update',
    id: tradeId,
    trade: sanitizedTrade,
    imagen: payload.imagen || null
  };

  if (targetHoja && targetHoja.trim() !== 'Trades') {
    bodyPayload.hoja = targetHoja.trim();
  }

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
      let assignedId = tradeId;

      try {
        const result = JSON.parse(rawText);
        if (result.ok || result.status === 'success' || result.success) {
          if (result.id && typeof result.id === 'string' && result.id.trim()) {
            assignedId = result.id.trim();
          }
        }
      } catch {
        if (rawText.toLowerCase().includes('success') || rawText.toLowerCase().includes('ok')) {
          assignedId = tradeId;
        }
      }

      if (assignedId && assignedId !== tradeId) {
        saveDeletedTradeId(tradeId, targetHoja);
        removeLocalOverride(tradeId, targetHoja);

        saveLocalOverride(
          {
            ...localUpdated,
            id: assignedId,
            imagen: localUpdated.imagen || rawImage,
            imageUrl: localUpdated.imageUrl
          },
          targetHoja
        );

        return { ok: true, id: assignedId };
      }

      return { ok: true, id: tradeId };
    }
  } catch (err) {
    console.warn('Apps Script update remote network notice:', err);
  }

  return { ok: true, id: tradeId };
}

export async function deleteTradeInAppsScript(
  tradeId: string,
  ownerKey: string,
  hoja?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!tradeId) {
    return { ok: false, error: 'ID de trade no especificado para eliminar.' };
  }
  if (!ownerKey.trim()) {
    return { ok: false, error: 'Se requiere la clave del Modo Dueño para eliminar trades.' };
  }

  // Persist locally in sheet-scoped deleted storage
  saveDeletedTradeId(tradeId, hoja);

  const bodyPayload: any = {
    key: ownerKey.trim(),
    action: 'delete',
    id: tradeId
  };

  if (hoja && hoja.trim() !== 'Trades') {
    bodyPayload.hoja = hoja.trim();
  }

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

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const fullDataUrl = canvas.toDataURL('image/jpeg', 0.85);
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
