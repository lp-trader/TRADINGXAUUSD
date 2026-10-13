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
 * - "2,64183" and "2.64183" -> 2.64183.
 * - If the text has both comma and dot, the LAST of the two is the decimal separator,
 *   and the other is thousands separator ("1.234,56" and "1,234.56" -> 1234.56).
 * - Strips whitespace and currency symbols like "$", "€", "£".
 * - If not a valid number, returns null (NEVER NaN).
 */
export function parseNumero(texto: any): number | null {
  if (texto === null || texto === undefined) return null;

  if (typeof texto === 'number') {
    if (isNaN(texto) || !isFinite(texto)) return null;
    return texto;
  }

  let s = String(texto).trim();
  if (!s) return null;

  // Remove currency symbols, whitespace and non-numeric chars except + - . ,
  s = s.replace(/[\$\s\u00A0€£]/g, '');
  if (!s) return null;

  // Extract sign
  let isNegative = false;
  if (s.startsWith('-')) {
    isNegative = true;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');

  if (lastDot !== -1 && lastComma !== -1) {
    // Both present: the LAST one is the decimal separator
    if (lastDot > lastComma) {
      // Dot is decimal, comma is thousands
      s = s.replace(/,/g, '');
    } else {
      // Comma is decimal, dot is thousands
      s = s.replace(/\./g, '').replace(/,/g, '.');
    }
  } else if (lastComma !== -1) {
    // Only comma present
    const commaCount = (s.match(/,/g) || []).length;
    if (commaCount === 1) {
      // Single comma is decimal separator (e.g. "2,64183")
      s = s.replace(',', '.');
    } else {
      // Multiple commas are thousands separators (e.g. "1,000,000")
      s = s.replace(/,/g, '');
    }
  } else if (lastDot !== -1) {
    // Only dot present
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount > 1) {
      // Multiple dots are European thousands separators (e.g. "1.000.000")
      s = s.replace(/\./g, '');
    }
  }

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
 * Uses parseNumero to safely parse all numeric arguments.
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

  // Dynamic tolerance: 0.5% of risk or 1e-5
  const tolerance = risk > 0 ? Math.min(0.05, Math.max(1e-5, risk * 0.005)) : 1e-5;

  // Directional price differences
  // In Buy: positive difference means profit, negative means loss
  // In Sell: positive difference means profit, negative means loss
  const priceDiff = direccion === 'Buy' ? salidaNum - entradaNum : entradaNum - salidaNum;

  // Directional checks for TP and SL
  let isTPHit = false;
  let isSLHit = false;

  if (direccion === 'Buy') {
    // In Buy: TP is above entry, SL is below entry
    if (salidaNum >= tpNum || Math.abs(salidaNum - tpNum) <= tolerance) {
      isTPHit = true;
    } else if (salidaNum <= slNum || Math.abs(salidaNum - slNum) <= tolerance) {
      isSLHit = true;
    }
  } else {
    // In Sell: TP is below entry, SL is above entry
    if (salidaNum <= tpNum || Math.abs(salidaNum - tpNum) <= tolerance) {
      isTPHit = true;
    } else if (salidaNum >= slNum || Math.abs(salidaNum - slNum) <= tolerance) {
      isSLHit = true;
    }
  }

  // Realized R calculation
  let rReal: number | null = null;
  if (risk > 0) {
    if (isTPHit && Math.abs(salidaNum - tpNum) <= tolerance) {
      rReal = Math.round((reward / risk) * 100) / 100;
    } else if (isSLHit && Math.abs(salidaNum - slNum) <= tolerance) {
      rReal = -1;
    } else {
      const calcR = priceDiff / risk;
      if (!isNaN(calcR) && isFinite(calcR)) {
        rReal = Math.round(calcR * 100) / 100;
      }
    }
  }

  let outcome: 'WIN' | 'LOSS' | 'BREAKEVEN';
  let calculatedMoney = rawMoney;
  let statusLabel = '';
  let explanation = '';

  if (isTPHit) {
    outcome = 'WIN';
    calculatedMoney = absMoney > 0 ? absMoney : 100;
    statusLabel = 'Ganador (Salió en TP)';
    explanation = `En ${direccion}, el precio de salida (${formatPrice(salidaNum)}) alcanzó el TP (${formatPrice(tpNum)}). Trade ganador.`;
  } else if (isSLHit) {
    outcome = 'LOSS';
    calculatedMoney = absMoney > 0 ? -absMoney : -100;
    statusLabel = 'Perdedor (Salió en SL)';
    explanation = `En ${direccion}, el precio de salida (${formatPrice(salidaNum)}) alcanzó el SL (${formatPrice(slNum)}). Trade perdedor.`;
  } else if (Math.abs(priceDiff) <= tolerance) {
    outcome = 'BREAKEVEN';
    calculatedMoney = 0;
    statusLabel = 'Breakeven (0)';
    explanation = `En ${direccion}, la salida (${formatPrice(salidaNum)}) coincide con la entrada (${formatPrice(entradaNum)}).`;
  } else if (priceDiff > 0) {
    outcome = 'WIN';
    calculatedMoney = absMoney > 0 ? absMoney : 0;
    statusLabel = 'Ganador (Cierre manual)';
    explanation = `En ${direccion}, la salida (${formatPrice(salidaNum)}) generó ganancia a favor.`;
  } else {
    outcome = 'LOSS';
    calculatedMoney = absMoney > 0 ? -absMoney : 0;
    statusLabel = 'Perdedor (Cierre manual)';
    explanation = `En ${direccion}, la salida (${formatPrice(salidaNum)}) generó pérdida en contra.`;
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
