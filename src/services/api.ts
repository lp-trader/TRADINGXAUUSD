import { RawTrade, Trade, TradePayload } from '../types/trade';

export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbybx6mAa-PXrkia4ZdRe1xslt2q1QzKpqgtkpKHeb7ZtE--dFgL1jetmkbivg8dMwG-oA/exec';
export const OWNER_KEY_STORAGE = 'trading_journal_owner_key';

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

export function parseTradeFromRaw(raw: RawTrade, fallbackIndex: number = 0): Trade {
  const entrada = Number(raw.ENTRADA) || 0;
  const sl = Number(raw.SL) || 0;
  const tp = Number(raw.TP) || 0;
  const money = Number(raw.MONEY) || 0;

  // 1. DIRECCION: selector con "Buy" y "Sell". Si una fila antigua no lo tiene, usa la deducción como respaldo.
  let direccion: 'Buy' | 'Sell';
  const rawDir = String(raw.DIRECCION || '').trim().toLowerCase();
  if (rawDir === 'buy' || rawDir === 'compra') {
    direccion = 'Buy';
  } else if (rawDir === 'sell' || rawDir === 'venta') {
    direccion = 'Sell';
  } else {
    // Respaldo para filas antiguas: si SL < ENTRADA es Buy, si no es Sell
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

  // Planned Risk/Reward ratio: |TP - ENTRADA| / |ENTRADA - SL|
  const risk = Math.abs(entrada - sl);
  const reward = Math.abs(tp - entrada);
  const rrPlanificado = risk > 0 ? Math.round((reward / risk) * 100) / 100 : 0;

  // R Real: R = (SALIDA - ENTRADA) × (1 si Buy, -1 si Sell) / |ENTRADA - SL|
  let rReal: number | null = null;
  if (salida !== null && !isNaN(salida) && risk > 0) {
    const mult = direccion === 'Buy' ? 1 : -1;
    const calcR = ((salida - entrada) * mult) / risk;
    if (!isNaN(calcR) && isFinite(calcR)) {
      rReal = Math.round(calcR * 100) / 100;
    }
  }

  const rawImage = String(raw.IMAGEN || '').trim();
  let imageUrl = '';
  if (rawImage) {
    if (rawImage.startsWith('http')) {
      imageUrl = rawImage;
    } else {
      imageUrl = `https://drive.google.com/thumbnail?id=${encodeURIComponent(rawImage)}&sz=w1600`;
    }
  }

  let fecha = '';
  if (raw.FECHA) {
    const rawFechaStr = String(raw.FECHA).trim();
    // Handles ISO strings like "2026-10-01T04:00:00.000Z", "2026-10-01 04:00:00", or "2026-10-01"
    const dateOnly = rawFechaStr.split('T')[0].split(' ')[0];
    const parts = dateOnly.split(/[-/]/);
    if (parts.length === 3) {
      fecha = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else {
      fecha = dateOnly;
    }
  } else {
    fecha = new Date().toISOString().split('T')[0];
  }

  return {
    id: String(raw.ID || `T-${fallbackIndex + 1}`),
    fecha,
    activo: String(raw.ACTIVO || 'XAU/USD').toUpperCase(),
    direccion,
    entrada,
    salida,
    sl,
    tp,
    money,
    setup: String(raw.SETUP || 'Sin setup'),
    sesion: String(raw.SESION || 'Nueva York'),
    emotion: String(raw.EMOTION || 'Calmado'),
    leccion: String(raw.LECCION || ''),
    imagen: rawImage,
    imageUrl,
    rrPlanificado,
    rReal
  };
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

  // Si la respuesta es un arreglo vacío, NO es un error: es un diario sin trades.
  if (Array.isArray(data)) {
    return data.map((item, idx) => parseTradeFromRaw(item, idx));
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.trades)) {
      return data.trades.map((item: any, idx: number) => parseTradeFromRaw(item, idx));
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
