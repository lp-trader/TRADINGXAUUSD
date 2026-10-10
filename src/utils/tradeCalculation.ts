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
      // If original had 'Z' or 'T', UTC date matches what was entered
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
 * If exit price matches SL (within tolerance), it's a LOSING trade.
 * If exit price matches TP (within tolerance), it's a WINNING trade.
 * Automatically aligns the sign of MONEY (negative for loss, positive for win).
 */
export function evaluateTradeOutcome(params: {
  direccion: 'Buy' | 'Sell';
  entrada: number;
  salida: number | null;
  sl: number;
  tp: number;
  money?: number | null;
}): TradeEvaluation {
  const { direccion, entrada, salida, sl, tp, money } = params;

  // Planned Risk and Reward
  const risk = Math.abs(entrada - sl);
  const reward = Math.abs(tp - entrada);
  const rrPlanificado = risk > 0 ? Math.round((reward / risk) * 100) / 100 : 0;

  // If trade is still open (no salida)
  if (salida === null || isNaN(salida)) {
    return {
      outcome: 'OPEN',
      isSLHit: false,
      isTPHit: false,
      calculatedMoney: Number(money) || 0,
      rReal: null,
      rrPlanificado,
      statusLabel: 'Abierto / En Curso',
      explanation: 'Operación sin precio de salida registrado aún.'
    };
  }

  const EPSILON = 0.05; // Gold tolerance for price match
  const rawMoney = Number(money) || 0;
  const absMoney = Math.abs(rawMoney);

  // Directional price differences
  // In Buy: positive difference means profit, negative means loss
  // In Sell: entrada - salida; positive means profit, negative means loss
  const priceDiff = direccion === 'Buy' ? salida - entrada : entrada - salida;

  // Tolerance checks for SL and TP
  const isExactSL = Math.abs(salida - sl) <= EPSILON;
  const isExactTP = Math.abs(salida - tp) <= EPSILON;

  // Has it hit or breached SL?
  const isSLHit = isExactSL || (direccion === 'Buy' ? salida <= sl : salida >= sl);

  // Has it hit or breached TP?
  const isTPHit = isExactTP || (direccion === 'Buy' ? salida >= tp : salida <= tp);

  // Realized R calculation
  let rReal: number | null = null;
  if (risk > 0) {
    if (isExactSL) {
      rReal = -1;
    } else if (isExactTP) {
      rReal = Math.round((reward / risk) * 100) / 100;
    } else {
      const calcR = priceDiff / risk;
      if (!isNaN(calcR) && isFinite(calcR)) {
        rReal = Math.round(calcR * 100) / 100;
      }
    }
  }

  // Outcome determination:
  // 1. If matches SL -> definitely LOSS
  // 2. If matches TP -> definitely WIN
  // 3. Otherwise, based on price change relative to entry for BUY vs SELL
  let outcome: 'WIN' | 'LOSS' | 'BREAKEVEN';
  let calculatedMoney = rawMoney;
  let statusLabel = '';
  let explanation = '';

  if (isSLHit) {
    outcome = 'LOSS';
    calculatedMoney = absMoney > 0 ? -absMoney : -100;
    statusLabel = isExactSL ? 'Perdedor (Salida en SL)' : 'Perdedor (Stop Out)';
    explanation = `En ${direccion}, el precio de salida (${salida.toFixed(2)}) alcanzó el SL (${sl.toFixed(2)}). Trade perdedor.`;
  } else if (isTPHit) {
    outcome = 'WIN';
    calculatedMoney = absMoney > 0 ? absMoney : 100;
    statusLabel = isExactTP ? 'Ganador (Salida en TP)' : 'Ganador (Take Profit)';
    explanation = `En ${direccion}, el precio de salida (${salida.toFixed(2)}) alcanzó el TP (${tp.toFixed(2)}). Trade ganador.`;
  } else if (Math.abs(priceDiff) <= EPSILON) {
    outcome = 'BREAKEVEN';
    calculatedMoney = 0;
    statusLabel = 'Breakeven (0)';
    explanation = `En ${direccion}, la salida (${salida.toFixed(2)}) coincide con la entrada (${entrada.toFixed(2)}).`;
  } else if (priceDiff > 0) {
    outcome = 'WIN';
    calculatedMoney = absMoney > 0 ? absMoney : 0;
    statusLabel = 'Ganador (Salida en Ganancia)';
    explanation = `En ${direccion}, la salida (${salida.toFixed(2)}) generó +${priceDiff.toFixed(2)} pts a favor.`;
  } else {
    outcome = 'LOSS';
    calculatedMoney = absMoney > 0 ? -absMoney : 0;
    statusLabel = 'Perdedor (Salida en Pérdida)';
    explanation = `En ${direccion}, la salida (${salida.toFixed(2)}) generó ${priceDiff.toFixed(2)} pts en contra.`;
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
