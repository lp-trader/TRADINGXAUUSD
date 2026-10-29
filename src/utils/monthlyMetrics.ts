import { Trade } from '../types/trade';
import { parseNumero, normalizeDateToYYYYMMDD } from './tradeCalculation';

export interface MonthlyRecord {
  key: string; // "YYYY-MM"
  year: number;
  month: number; // 1 - 12
  monthLabel: string; // "Octubre 2026"
  shortLabel: string; // "Oct 26"
  totalTrades: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  winRate: number; // 0 - 100
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  avgPlannedRR: number;
  avgRealR: number | null;
  avgWinMoney: number;
  avgLossMoney: number;
  payoffRatio: number;
  // Quantitative edge metrics
  expectancyMoney: number; // Edge $ per trade
  expectancyR: number | null; // Edge R per trade
  maxDrawdown: number; // Peak to valley drop in month
  trades: Trade[];
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_SHORT_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

/**
 * Groups trades by month (YYYY-MM) and computes performance metrics
 */
export function calculateMonthlyRecords(trades: Trade[]): MonthlyRecord[] {
  if (!trades || !Array.isArray(trades) || trades.length === 0) {
    return [];
  }

  const map = new Map<string, Trade[]>();

  trades.forEach((trade) => {
    if (!trade) return;
    const dateStr = normalizeDateToYYYYMMDD(trade.fecha);
    let key = '';

    if (dateStr && /^\d{4}-\d{2}/.test(dateStr)) {
      key = dateStr.slice(0, 7); // "YYYY-MM"
    } else {
      const d = new Date(trade.fecha);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        key = `${y}-${m}`;
      }
    }

    if (!key) return;

    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(trade);
  });

  const records: MonthlyRecord[] = [];

  map.forEach((monthTrades, key) => {
    const [yStr, mStr] = key.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return;

    const monthLabel = `${MONTH_NAMES_ES[month - 1]} ${year}`;
    const shortLabel = `${MONTH_SHORT_ES[month - 1]} ${String(year).slice(-2)}`;

    // Sort chronologically
    const sorted = [...monthTrades].sort((a, b) => {
      const da = normalizeDateToYYYYMMDD(a.fecha);
      const db = normalizeDateToYYYYMMDD(b.fecha);
      return da.localeCompare(db);
    });

    let winCount = 0;
    let lossCount = 0;
    let breakevenCount = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let totalPlannedRR = 0;
    let countPlannedRR = 0;
    let totalRealR = 0;
    let countRealR = 0;

    sorted.forEach((t) => {
      const money = parseNumero(t.money) ?? 0;
      if (money > 0) {
        winCount++;
        grossProfit += money;
      } else if (money < 0) {
        lossCount++;
        grossLoss += Math.abs(money);
      } else {
        breakevenCount++;
      }

      const pRR = parseNumero(t.rrPlanificado);
      if (pRR !== null && pRR > 0 && isFinite(pRR)) {
        totalPlannedRR += pRR;
        countPlannedRR++;
      }

      const r = parseNumero(t.rReal);
      if (r !== null && isFinite(r)) {
        totalRealR += r;
        countRealR++;
      }
    });

    const totalTrades = sorted.length;
    const netProfit = grossProfit - grossLoss;
    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 99.9 : 0);
    const avgPlannedRR = countPlannedRR > 0 ? totalPlannedRR / countPlannedRR : 0;
    const avgRealR = countRealR > 0 ? totalRealR / countRealR : null;

    const avgWinMoney = winCount > 0 ? grossProfit / winCount : 0;
    const avgLossMoney = lossCount > 0 ? grossLoss / lossCount : 0;
    const payoffRatio = avgLossMoney > 0 ? avgWinMoney / avgLossMoney : (avgWinMoney > 0 ? 99.9 : 0);

    // Expectancy
    const expectancyMoney = totalTrades > 0 ? netProfit / totalTrades : 0;
    const expectancyR = countRealR > 0 ? totalRealR / countRealR : null;

    // Drawdown intra-month
    let peak = 0;
    let running = 0;
    let maxDrawdown = 0;
    sorted.forEach((t) => {
      const money = parseNumero(t.money) ?? 0;
      running += money;
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });

    records.push({
      key,
      year,
      month,
      monthLabel,
      shortLabel,
      totalTrades,
      winCount,
      lossCount,
      breakevenCount,
      winRate: Math.round(winRate * 10) / 10,
      netProfit: Math.round(netProfit * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossLoss: Math.round(grossLoss * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      avgPlannedRR: Math.round(avgPlannedRR * 100) / 100,
      avgRealR: avgRealR !== null ? Math.round(avgRealR * 100) / 100 : null,
      avgWinMoney: Math.round(avgWinMoney * 100) / 100,
      avgLossMoney: Math.round(avgLossMoney * 100) / 100,
      payoffRatio: Math.round(payoffRatio * 100) / 100,
      expectancyMoney: Math.round(expectancyMoney * 100) / 100,
      expectancyR: expectancyR !== null ? Math.round(expectancyR * 100) / 100 : null,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      trades: sorted
    });
  });

  // Sort descending by date (most recent first)
  return records.sort((a, b) => b.key.localeCompare(a.key));
}
