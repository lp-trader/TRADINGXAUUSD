export interface TradeEvaluation {
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN';
  isSLHit: boolean;
  isTPHit: boolean;
  calculatedMoney: number;
  rReal: number | null;
  rrPlanificado: number;
  statusLabel: string;
  explanation: string;
}

/**
 * Unifies parsing of numeric strings in Spanish and English formats (commas and dots).
 * Reglas en este orden estricto:
 * 1. Quita espacios y símbolos como "$".
 * 2. Si el texto contiene un punto ".", ese punto es el decimal y TODAS las comas son separadores de miles: se eliminan.
 *    "2,670.88" -> 2670.88. "4152.82" -> 4152.82.
 * 3. Si NO hay punto y hay una coma seguida de exactamente 3 dígitos ("2,630"), la coma es de miles -> 2630.
 * 4. Si NO hay punto y hay una coma seguida de cualquier otra cantidad de dígitos ("4152,82"), la coma es decimal -> 4152.82.
 * 5. Si no es un número válido, devuelve null (nunca NaN).
 */
export function parseNumero(texto: any): number | null {
  if (texto === null || texto === undefined) return null;

  if (typeof texto === 'number') {
    if (isNaN(texto) || !isFinite(texto)) return null;
    return texto;
  }

  let s = String(texto).trim();
  if (!s) return null;

  // 1. Quita espacios y símbolos como "$" (y monedas comunes)
  s = s.replace(/[\$\s\u00A0€£]/g, '');
  if (!s) return null;

  // Extrae signo si existe
  let isNegative = false;
  if (s.startsWith('-')) {
    isNegative = true;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }
  if (!s) return null;

  // 2. Si el texto contiene un punto ".", ese punto es el decimal y TODAS las comas son separadores de miles: se eliminan.
  if (s.includes('.')) {
    s = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    // 3. Si NO hay punto y hay una coma seguida de exactamente 3 dígitos ("2,630"), la coma es de miles -> 2630.
    // 4. Si NO hay punto y hay una coma seguida de cualquier otra cantidad de dígitos ("4152,82"), la coma es decimal -> 4152.82.
    const commaCount = (s.match(/,/g) || []).length;
    if (commaCount === 1) {
      const parts = s.split(',');
      if (parts[1].length === 3 && /^\d{3}$/.test(parts[1])) {
        // La coma es de miles ("2,630" -> 2630)
        s = parts[0] + parts[1];
      } else {
        // La coma es decimal ("4152,82" -> 4152.82 o "2,5" -> 2.5)
        s = parts[0] + '.' + parts[1];
      }
    } else {
      // Múltiples comas sin punto ("1,000,000") -> todas son de miles
      s = s.replace(/,/g, '');
    }
  }

  // 5. Si no es un número válido, devuelve null (nunca NaN).
  const num = Number(s);
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  return isNegative ? -num : num;
}

/**
 * Formats a price value with dynamic precision without cutting off decimal places.
 * Accepts numbers or strings in either format ("2,64183" or 2.64183).
 */
export function formatPrice(val: number | string | null | undefined): string {
  const num = parseNumero(val);
  if (num === null) return '—';
  const str = String(num);
  if (str.includes('.')) {
    const decimals = str.split('.')[1].length;
    const precision = Math.min(Math.max(decimals, 2), 6);
    return num.toFixed(precision);
  }
  return num.toFixed(2);
}

/**
 * Normalizes any date string or Date object strictly into YYYY-MM-DD format
 * without suffering from locale/timezone day-shift bugs.
 */
export function normalizeDateToYYYYMMDD(rawDate: string | number | Date | null | undefined): string {
  if (!rawDate) return '';
  const str = String(rawDate).trim();
  if (!str) return '';

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Starts with YYYY-MM-DD (e.g. ISO "2026-10-05T04:00:00.000Z" or "2026-10-05 04:00:00")
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Format DD/MM/YYYY or DD-MM-YYYY (or D/M/YYYY)
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const [, p1, p2, year] = dmyMatch;
    const day = p1.padStart(2, '0');
    const month = p2.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Fallback parsing
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      if (str.includes('T') || str.includes('Z')) {
        const y = parsed.getUTCFullYear();
        const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
        const d = String(parsed.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  } catch {}

  return str.split('T')[0].split(' ')[0];
}

/**
 * Evaluates trade outcome based on BUY / SELL direction, Entry, Exit, SL, and TP.
 * Reglas de estado:
 * - Buy: SALIDA >= TP es "Salió en TP" (ganador); SALIDA <= SL es "Salió en SL" (perdedor); si no, salida manual.
 * - Sell: SALIDA <= TP es "Salió en TP"; SALIDA >= SL es "Salió en SL"; si no, salida manual.
 * - R real = (SALIDA - ENTRADA) × (1 si Buy, -1 si Sell) / |ENTRADA - SL|.
 */
export function evaluateTradeOutcome(params: {
  direccion: 'Buy' | 'Sell';
  entrada: number | string;
  salida: number | string | null | undefined;
  sl: number | string;
  tp: number | string;
  money?: number | string | null;
}): TradeEvaluation {
  const { direccion } = params;
  const entradaNum = parseNumero(params.entrada) ?? 0;
  const slNum = parseNumero(params.sl) ?? 0;
  const tpNum = parseNumero(params.tp) ?? 0;
  const salidaNum = parseNumero(params.salida);
  const rawMoney = parseNumero(params.money) ?? 0;
  const absMoney = Math.abs(rawMoney);

  // Planned Risk and Reward
  const risk = Math.abs(entradaNum - slNum);
  const reward = Math.abs(tpNum - entradaNum);
  const rrPlanificado = risk > 0 ? Math.round((reward / risk) * 100) / 100 : 0;

  // If trade is still open (no salida)
  if (salidaNum === null) {
    return {
      outcome: 'OPEN',
      isSLHit: false,
      isTPHit: false,
      calculatedMoney: rawMoney,
      rReal: null,
      rrPlanificado,
      statusLabel: 'Abierto / En Curso',
      explanation: 'Operación sin precio de salida registrado aún.'
    };
  }

  // Tolerancia mínima por precisión de punto flotante en IEEE 754
  const EPSILON = 1e-6;

  let isTPHit = false;
  let isSLHit = false;

  // Comprobación de TP / SL según la dirección
  if (direccion === 'Buy') {
    // Buy: SALIDA >= TP es "Salió en TP" (ganador); SALIDA <= SL es "Salió en SL" (perdedor)
    if (salidaNum >= tpNum - EPSILON) {
      isTPHit = true;
    } else if (salidaNum <= slNum + EPSILON) {
      isSLHit = true;
    }
  } else {
    // Sell: SALIDA <= TP es "Salió en TP"; SALIDA >= SL es "Salió en SL"
    if (salidaNum <= tpNum + EPSILON) {
      isTPHit = true;
    } else if (salidaNum >= slNum - EPSILON) {
      isSLHit = true;
    }
  }

  // R real = (SALIDA - ENTRADA) × (1 si Buy, -1 si Sell) / |ENTRADA - SL|
  let rReal: number | null = null;
  if (risk > 0) {
    const directionMultiplier = direccion === 'Buy' ? 1 : -1;
    const calcR = ((salidaNum - entradaNum) * directionMultiplier) / risk;
    if (!isNaN(calcR) && isFinite(calcR)) {
      rReal = Math.round(calcR * 100) / 100;
    }
  }

  const priceDiff = direccion === 'Buy' ? salidaNum - entradaNum : entradaNum - salidaNum;

  let outcome: 'WIN' | 'LOSS' | 'BREAKEVEN';
  let calculatedMoney = rawMoney;
  let statusLabel = '';
  let explanation = '';

  if (isTPHit) {
    outcome = 'WIN';
    calculatedMoney = absMoney > 0 ? absMoney : 100;
    statusLabel = 'Salió en TP';
    explanation = `En ${direccion}, la salida (${formatPrice(salidaNum)}) alcanzó el TP (${formatPrice(tpNum)}). Trade ganador.`;
  } else if (isSLHit) {
    outcome = 'LOSS';
    calculatedMoney = absMoney > 0 ? -absMoney : -100;
    statusLabel = 'Salió en SL';
    explanation = `En ${direccion}, la salida (${formatPrice(salidaNum)}) alcanzó el SL (${formatPrice(slNum)}). Trade perdedor.`;
  } else if (Math.abs(priceDiff) <= EPSILON) {
    outcome = 'BREAKEVEN';
    calculatedMoney = 0;
    statusLabel = 'Salida manual';
    explanation = `En ${direccion}, la salida manual (${formatPrice(salidaNum)}) coincide con la entrada (Breakeven).`;
  } else if (priceDiff > 0) {
    outcome = 'WIN';
    calculatedMoney = absMoney > 0 ? absMoney : 0;
    statusLabel = 'Salida manual';
    explanation = `En ${direccion}, la salida manual (${formatPrice(salidaNum)}) cerró a favor con ganancia.`;
  } else {
    outcome = 'LOSS';
    calculatedMoney = absMoney > 0 ? -absMoney : 0;
    statusLabel = 'Salida manual';
    explanation = `En ${direccion}, la salida manual (${formatPrice(salidaNum)}) cerró en contra con pérdida.`;
  }

  return {
    outcome,
    isSLHit,
    isTPHit,
    calculatedMoney,
    rReal,
    rrPlanificado,
    statusLabel,
    explanation
  };
}
