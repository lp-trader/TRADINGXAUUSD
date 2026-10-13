import { Trade, DashboardMetrics, EquityPoint, GroupPerformance } from '../types/trade';
import { parseNumero } from './tradeCalculation';

export function calculateDashboardMetrics(trades: Trade[]): DashboardMetrics {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      winCount: 0,
      lossCount: 0,
      winRate: 0,
      netProfit: 0,
      grossProfit: 0,
      grossLoss: 0,
      profitFactor: 0,
      avgPlannedRR: 0,
      avgRealR: null,
      bestTrade: null,
      worstTrade: null
    };
  }

  let winCount = 0;
  let lossCount = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let totalPlannedRR = 0;
  let countPlannedRR = 0;
  let totalRealR = 0;
  let countRealR = 0;

  let bestTrade: Trade | null = null;
  let worstTrade: Trade | null = null;

  trades.forEach((trade) => {
    const money = parseNumero(trade.money) ?? 0;
    if (money > 0) {
      winCount++;
      grossProfit += money;
    } else if (money < 0) {
      lossCount++;
      grossLoss += Math.abs(money);
    }

    const plannedRR = parseNumero(trade.rrPlanificado);
    if (plannedRR !== null && plannedRR > 0 && isFinite(plannedRR)) {
      totalPlannedRR += plannedRR;
      countPlannedRR++;
    }

    const rReal = parseNumero(trade.rReal);
    if (rReal !== null && isFinite(rReal)) {
      totalRealR += rReal;
      countRealR++;
    }

    if (!bestTrade || money > (parseNumero(bestTrade.money) ?? 0)) {
      bestTrade = trade;
    }
    if (!worstTrade || money < (parseNumero(worstTrade.money) ?? 0)) {
      worstTrade = trade;
    }
  });

  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
  const netProfit = grossProfit - grossLoss;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 99.9 : 0);
  const avgPlannedRR = countPlannedRR > 0 ? totalPlannedRR / countPlannedRR : 0;
  const avgRealR = countRealR > 0 ? Math.round((totalRealR / countRealR) * 100) / 100 : null;

  return {
    totalTrades,
    winCount,
    lossCount,
    winRate: Math.round(winRate * 10) / 10,
    netProfit: Math.round(netProfit * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossLoss: Math.round(grossLoss * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    avgPlannedRR: Math.round(avgPlannedRR * 100) / 100,
    avgRealR,
    bestTrade,
    worstTrade
  };
}

export function buildEquityCurve(trades: Trade[]): EquityPoint[] {
  if (!trades || trades.length === 0) return [];

  // Sort chronologically by FECHA
  const sorted = [...trades].sort((a, b) => {
    const dateA = new Date(a.fecha).getTime() || 0;
    const dateB = new Date(b.fecha).getTime() || 0;
    return dateA - dateB;
  });

  let cumulative = 0;
  return sorted.map((trade, idx) => {
    const money = parseNumero(trade.money) ?? 0;
    cumulative += money;
    return {
      index: idx + 1,
      id: trade.id,
      fecha: trade.fecha,
      tradeMoney: money,
      equity: Math.round(cumulative * 100) / 100,
      trade
    };
  });
}

function calculateGroupStats(
  trades: Trade[],
  groupByFn: (trade: Trade) => string
): GroupPerformance[] {
  const map = new Map<string, { count: number; netProfit: number; winCount: number; totalRealR: number; countRealR: number }>();

  trades.forEach((trade) => {
    const key = groupByFn(trade) || 'Otro';
    const current = map.get(key) || { count: 0, netProfit: 0, winCount: 0, totalRealR: 0, countRealR: 0 };
    const money = parseNumero(trade.money) ?? 0;
    current.count++;
    current.netProfit += money;
    if (money > 0) {
      current.winCount++;
    }
    const rReal = parseNumero(trade.rReal);
    if (rReal !== null && isFinite(rReal)) {
      current.totalRealR += rReal;
      current.countRealR++;
    }
    map.set(key, current);
  });

  return Array.from(map.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      netProfit: Math.round(data.netProfit * 100) / 100,
      winCount: data.winCount,
      winRate: data.count > 0 ? Math.round((data.winCount / data.count) * 1000) / 10 : 0,
      avgRealR: data.countRealR > 0 ? Math.round((data.totalRealR / data.countRealR) * 100) / 100 : null
    }))
    .sort((a, b) => b.netProfit - a.netProfit);
}

export function calculatePerformanceBySession(trades: Trade[]): GroupPerformance[] {
  return calculateGroupStats(trades, (t) => t.sesion);
}

export function calculatePerformanceBySetup(trades: Trade[]): GroupPerformance[] {
  return calculateGroupStats(trades, (t) => t.setup);
}

export function calculatePerformanceByEmotion(trades: Trade[]): GroupPerformance[] {
  return calculateGroupStats(trades, (t) => t.emotion);
}
