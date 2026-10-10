import React, { useState, useMemo, useEffect } from 'react';
import { Trade } from '../types/trade';
import { normalizeDateToYYYYMMDD } from '../utils/tradeCalculation';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  X, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  TrendingDown, 
  Maximize2, 
  Image as ImageIcon,
  Edit3,
  Sparkles,
  Trash2
} from 'lucide-react';

interface TradingCalendarProps {
  trades: Trade[];
  onSelectTrade: (trade: Trade) => void;
  onEditTrade?: (trade: Trade) => void;
  onDeleteTrade?: (trade: Trade) => void;
  isOwner?: boolean;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_LABELS = [
  { short: 'L', full: 'Lun' },
  { short: 'M', full: 'Mar' },
  { short: 'X', full: 'Mié' },
  { short: 'J', full: 'Jue' },
  { short: 'V', full: 'Vie' },
  { short: 'S', full: 'Sáb' },
  { short: 'D', full: 'Dom' }
];

interface CalendarCell {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  summary?: {
    trades: Trade[];
    netMoney: number;
  };
}

interface CalendarWeek {
  weekIndex: number;
  days: CalendarCell[];
  weeklyNetMoney: number;
  weeklyTradesCount: number;
}

function normalizeDateStr(rawDate: string): string {
  return normalizeDateToYYYYMMDD(rawDate);
}

export const TradingCalendar: React.FC<TradingCalendarProps> = ({ 
  trades, 
  onSelectTrade, 
  onEditTrade, 
  onDeleteTrade,
  isOwner = false 
}) => {
  // Today's date reference
  const today = useMemo(() => new Date(), []);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  const todayDateStr = `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;

  // Find latest trade year and month
  const latestTradeInfo = useMemo(() => {
    if (!trades || trades.length === 0) return null;
    const sorted = [...trades].sort((a, b) => {
      const da = normalizeDateToYYYYMMDD(a.fecha);
      const db = normalizeDateToYYYYMMDD(b.fecha);
      return db.localeCompare(da);
    });
    const latestStr = sorted[0]?.fecha ? normalizeDateToYYYYMMDD(sorted[0].fecha) : null;
    if (latestStr) {
      const parts = latestStr.split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
          return { year: y, month: m, dateStr: latestStr, trade: sorted[0] };
        }
      }
    }
    return null;
  }, [trades]);

  // Initial month/year: most recent trade if available, else today
  const initialYearMonth = useMemo(() => {
    if (latestTradeInfo) {
      return { year: latestTradeInfo.year, month: latestTradeInfo.month };
    }
    return { year: todayYear, month: todayMonth };
  }, [latestTradeInfo, todayYear, todayMonth]);

  const [viewYear, setViewYear] = useState<number>(initialYearMonth.year);
  const [viewMonth, setViewMonth] = useState<number>(initialYearMonth.month);

  // Auto-sync calendar view to the most recent trade when trades change
  useEffect(() => {
    if (latestTradeInfo) {
      setViewYear(latestTradeInfo.year);
      setViewMonth(latestTradeInfo.month);
    }
  }, [latestTradeInfo]);

  // Modal for day's trades details
  const [activeDayModal, setActiveDayModal] = useState<{
    dateStr: string;
    dayNumber: number;
    trades: Trade[];
    netMoney: number;
  } | null>(null);

  // Group trades strictly by string FECHA "yyyy-MM-dd" without new Date(FECHA) timezone conversions
  const tradesByDate = useMemo(() => {
    const map = new Map<string, { trades: Trade[]; netMoney: number }>();
    if (!trades || trades.length === 0) return map;

    trades.forEach((trade) => {
      if (!trade.fecha) return;
      const key = normalizeDateToYYYYMMDD(trade.fecha);
      const money = Number(trade.money) || 0;

      const current = map.get(key) || { trades: [], netMoney: 0 };
      current.trades.push(trade);
      current.netMoney += money;
      map.set(key, current);
    });

    return map;
  }, [trades]);

  // Monthly summary metrics for the visible month
  const monthStats = useMemo(() => {
    let netMoney = 0;
    let totalTrades = 0;
    let greenDays = 0;
    let redDays = 0;
    let bestDay: { dateStr: string; dayNumber: number; netMoney: number } | null = null;
    let worstDay: { dateStr: string; dayNumber: number; netMoney: number } | null = null;
    let maxAbsDay = 0;

    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = tradesByDate.get(dateStr);
      if (dayData && dayData.trades.length > 0) {
        const dayNet = Math.round(dayData.netMoney * 100) / 100;
        netMoney += dayNet;
        totalTrades += dayData.trades.length;

        const absNet = Math.abs(dayNet);
        if (absNet > maxAbsDay) {
          maxAbsDay = absNet;
        }

        if (dayNet > 0) {
          greenDays++;
          if (!bestDay || dayNet > bestDay.netMoney) {
            bestDay = { dateStr, dayNumber: d, netMoney: dayNet };
          }
        } else if (dayNet < 0) {
          redDays++;
          if (!worstDay || dayNet < worstDay.netMoney) {
            worstDay = { dateStr, dayNumber: d, netMoney: dayNet };
          }
        }
      }
    }

    return {
      netMoney: Math.round(netMoney * 100) / 100,
      totalTrades,
      greenDays,
      redDays,
      bestDay,
      worstDay,
      maxAbsDay: maxAbsDay > 0 ? maxAbsDay : 500
    };
  }, [viewYear, viewMonth, tradesByDate]);

  // Build calendar grid (Monday to Sunday) + weekly totals
  const weeks = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    // (getDay() + 6) % 7 maps Sun(0)->6, Mon(1)->0, ..., Sat(6)->5
    const firstDow = (new Date(viewYear, viewMonth - 1, 1).getDay() + 6) % 7;
    const prevMonthTotalDays = new Date(viewYear, viewMonth - 1, 0).getDate();

    const cells: CalendarCell[] = [];

    // Previous month padding
    for (let i = firstDow - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1;
      const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear;
      const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayDateStr,
        summary: tradesByDate.get(dateStr)
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayDateStr,
        summary: tradesByDate.get(dateStr)
      });
    }

    // Next month padding to complete 7-day row
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      const needed = 7 - remainder;
      const nextMonth = viewMonth === 12 ? 1 : viewMonth + 1;
      const nextYear = viewMonth === 12 ? viewYear + 1 : viewYear;
      for (let d = 1; d <= needed; d++) {
        const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push({
          dateStr,
          dayNumber: d,
          isCurrentMonth: false,
          isToday: dateStr === todayDateStr,
          summary: tradesByDate.get(dateStr)
        });
      }
    }

    // Group into 7-day weeks and calculate weekly total
    const result: CalendarWeek[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      const weekDays = cells.slice(i, i + 7);
      let weeklyNetMoney = 0;
      let weeklyTradesCount = 0;

      weekDays.forEach((cell) => {
        if (cell.summary) {
          weeklyNetMoney += cell.summary.netMoney;
          weeklyTradesCount += cell.summary.trades.length;
        }
      });

      result.push({
        weekIndex: Math.floor(i / 7) + 1,
        days: weekDays,
        weeklyNetMoney: Math.round(weeklyNetMoney * 100) / 100,
        weeklyTradesCount
      });
    }

    return result;
  }, [viewYear, viewMonth, todayDateStr, tradesByDate]);

  const handlePrevMonth = () => {
    setViewMonth((prev) => {
      if (prev === 1) {
        setViewYear((y) => y - 1);
        return 12;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setViewMonth((prev) => {
      if (prev === 12) {
        setViewYear((y) => y + 1);
        return 1;
      }
      return prev + 1;
    });
  };

  const handleGoToToday = () => {
    setViewYear(todayYear);
    setViewMonth(todayMonth);
  };

  const formatMoney = (val: number): string => {
    if (isNaN(val)) return '$0';
    const isPos = val > 0;
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    const formatted = absVal.toLocaleString('en-US', {
      minimumFractionDigits: absVal % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    });
    return `${isPos ? '+' : isNeg ? '-' : ''}$${formatted}`;
  };

  return (
    <section className="glass-panel rounded-3xl p-4 sm:p-7 lg:p-8 border border-white/[0.08] shadow-2xl relative overflow-hidden mb-6">
      
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#E0B341]/60 to-transparent opacity-70" />

      {/* Header Bar: Title & Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-white tracking-tight">
              Calendario de Resultados
            </h2>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#E0B341]/10 text-[#E0B341] border border-[#E0B341]/20">
              Vista Diaria
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Rendimiento neto y operaciones por sesión agrupadas por fecha de ejecución
          </p>
        </div>

        {/* Month Selector & "Hoy" Button */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {latestTradeInfo && (viewYear !== latestTradeInfo.year || viewMonth !== latestTradeInfo.month) && (
            <button
              onClick={() => {
                setViewYear(latestTradeInfo.year);
                setViewMonth(latestTradeInfo.month);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#E0B341]/15 hover:bg-[#E0B341]/25 text-[#E0B341] border border-[#E0B341]/30 transition-all"
              title={`Ir al mes con operaciones (${MONTH_NAMES[latestTradeInfo.month - 1]} ${latestTradeInfo.year})`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E0B341]" />
              <span>Ver {MONTH_NAMES[latestTradeInfo.month - 1].slice(0, 3)} {latestTradeInfo.year}</span>
            </button>
          )}

          <button
            onClick={handleGoToToday}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-200 hover:text-white border border-white/[0.08] transition-all"
            title="Ir al mes actual"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-[#E0B341]" />
            <span>Hoy</span>
          </button>

          <div className="flex items-center bg-white/[0.03] rounded-xl border border-white/[0.08] p-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-heading text-xs sm:text-sm font-bold text-white px-3 font-mono min-w-[130px] text-center">
              {MONTH_NAMES[viewMonth - 1]} {viewYear}
            </span>

            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Month Visible Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {/* Resultado Neto del Mes */}
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[11px] text-neutral-400 font-medium block">
            Resultado Neto ({MONTH_NAMES[viewMonth - 1].slice(0, 3)})
          </span>
          <div className={`font-heading text-lg sm:text-xl font-bold tabular-nums mt-0.5 ${
            monthStats.netMoney > 0
              ? 'text-[#34C97A]'
              : monthStats.netMoney < 0
                ? 'text-[#FF6B60]'
                : 'text-neutral-400'
          }`}>
            {monthStats.totalTrades === 0
              ? '$0.00'
              : `${monthStats.netMoney >= 0 ? '+' : '-'}$${Math.abs(monthStats.netMoney).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}`}
          </div>
          <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">
            {monthStats.totalTrades} {monthStats.totalTrades === 1 ? 'trade registrado' : 'trades registrados'}
          </span>
        </div>

        {/* Días Verdes vs Días Rojos */}
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[11px] text-neutral-400 font-medium block">
            Días Verdes vs Rojos
          </span>
          <div className="font-heading text-lg sm:text-xl font-bold tabular-nums mt-0.5 text-white flex items-center gap-1.5">
            <span className="text-[#34C97A]">{monthStats.greenDays}W</span>
            <span className="text-neutral-500 font-normal">·</span>
            <span className="text-[#FF6B60]">{monthStats.redDays}L</span>
          </div>
          <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">
            {monthStats.greenDays + monthStats.redDays > 0
              ? `${Math.round((monthStats.greenDays / (monthStats.greenDays + monthStats.redDays)) * 100)}% días positivos`
              : 'Sin sesiones operadas'}
          </span>
        </div>

        {/* Mejor Día */}
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[11px] text-[#34C97A] font-medium block flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Mejor Día</span>
          </span>
          <div className="font-heading text-lg sm:text-xl font-bold tabular-nums mt-0.5 text-[#34C97A]">
            {monthStats.bestDay ? `+$${monthStats.bestDay.netMoney.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
          </div>
          <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block truncate">
            {monthStats.bestDay ? `${monthStats.bestDay.dayNumber} de ${MONTH_NAMES[viewMonth - 1]}` : 'Sin ganancias'}
          </span>
        </div>

        {/* Peor Día */}
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[11px] text-[#FF6B60] font-medium block flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            <span>Peor Día</span>
          </span>
          <div className="font-heading text-lg sm:text-xl font-bold tabular-nums mt-0.5 text-[#FF6B60]">
            {monthStats.worstDay ? `-$${Math.abs(monthStats.worstDay.netMoney).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
          </div>
          <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block truncate">
            {monthStats.worstDay ? `${monthStats.worstDay.dayNumber} de ${MONTH_NAMES[viewMonth - 1]}` : 'Sin pérdidas'}
          </span>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[640px] select-none">
          
          {/* Day of week headers + Total Semanal */}
          <div className="grid grid-cols-8 gap-1.5 sm:gap-2 mb-2 text-center text-[11px] font-mono font-medium text-neutral-400">
            {DAY_LABELS.map((day, idx) => (
              <div key={idx} className="py-1">
                <span className="sm:hidden">{day.short}</span>
                <span className="hidden sm:inline">{day.full}</span>
              </div>
            ))}
            <div className="py-1 text-[#E0B341] font-bold">
              <span className="sm:hidden">Sem.</span>
              <span className="hidden sm:inline">Total Sem.</span>
            </div>
          </div>

          {/* Calendar Weeks */}
          <div className="space-y-1.5 sm:space-y-2">
            {weeks.map((week) => (
              <div key={week.weekIndex} className="grid grid-cols-8 gap-1.5 sm:gap-2">
                
                {/* 7 Days of the week */}
                {week.days.map((cell, dayIdx) => {
                  const hasTrades = Boolean(cell.summary && cell.summary.trades.length > 0);
                  const netMoney = cell.summary ? cell.summary.netMoney : 0;
                  const isPositive = netMoney > 0;
                  const isNegative = netMoney < 0;
                  const tradesCount = cell.summary ? cell.summary.trades.length : 0;

                  // Calculate proportional heatmap intensity (0.12 - 0.48)
                  const ratio = hasTrades ? Math.min(Math.abs(netMoney) / monthStats.maxAbsDay, 1) : 0;

                  let cellBg = 'bg-white/[0.02]';
                  let cellBorder = 'border-white/[0.05]';
                  let textColor = 'text-neutral-400';

                  if (hasTrades) {
                    if (isPositive) {
                      cellBg = `rgba(52, 201, 122, ${0.12 + ratio * 0.36})`;
                      cellBorder = `rgba(52, 201, 122, ${0.25 + ratio * 0.45})`;
                      textColor = 'text-[#34C97A]';
                    } else if (isNegative) {
                      cellBg = `rgba(255, 107, 96, ${0.12 + ratio * 0.36})`;
                      cellBorder = `rgba(255, 107, 96, ${0.25 + ratio * 0.45})`;
                      textColor = 'text-[#FF6B60]';
                    } else {
                      cellBg = 'rgba(224, 179, 65, 0.12)';
                      cellBorder = 'rgba(224, 179, 65, 0.3)';
                      textColor = 'text-[#E0B341]';
                    }
                  }

                  // Non-current month days (faded)
                  const opacityClass = !cell.isCurrentMonth ? 'opacity-30 pointer-events-none' : '';

                  // Today highlight with gold border
                  const todayBorder = cell.isToday
                    ? 'ring-2 ring-[#E0B341] border-[#E0B341] shadow-[0_0_12px_rgba(224,179,65,0.25)]'
                    : '';

                  return (
                    <div
                      key={dayIdx}
                      onClick={() => {
                        if (hasTrades && cell.summary) {
                          setActiveDayModal({
                            dateStr: cell.dateStr,
                            dayNumber: cell.dayNumber,
                            trades: cell.summary.trades,
                            netMoney: cell.summary.netMoney
                          });
                        }
                      }}
                      style={{
                        backgroundColor: hasTrades ? cellBg : undefined,
                        borderColor: hasTrades ? cellBorder : undefined
                      }}
                      className={`relative min-h-[56px] sm:min-h-[72px] lg:min-h-[80px] p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between ${
                        hasTrades ? cellBorder : 'border-white/[0.05] bg-white/[0.02]'
                      } ${todayBorder} ${opacityClass} ${
                        hasTrades ? 'cursor-pointer hover:scale-[1.02] hover:brightness-110 active:scale-95 shadow-md' : ''
                      }`}
                    >
                      {/* Top row: Day Number + Today indicator */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] sm:text-xs font-mono font-bold leading-none ${
                          cell.isToday ? 'text-[#E0B341]' : cell.isCurrentMonth ? 'text-neutral-300' : 'text-neutral-600'
                        }`}>
                          {cell.dayNumber}
                        </span>

                        {cell.isToday && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E0B341] animate-pulse" title="Hoy" />
                        )}
                      </div>

                      {/* Content: Money and Trades Count (Only if trades exist, else blank neutral) */}
                      {hasTrades && (
                        <div className="my-auto text-center sm:text-right">
                          <div className={`font-mono text-[11px] sm:text-xs lg:text-sm font-bold tabular-nums leading-tight ${textColor}`}>
                            {formatMoney(netMoney)}
                          </div>
                          
                          {/* Trades count: hidden on small screens if space is short */}
                          <div className="hidden sm:block text-[9px] font-mono text-neutral-400 mt-0.5 truncate">
                            {tradesCount} {tradesCount === 1 ? 'trade' : 'trades'}
                          </div>
                        </div>
                      )}

                      {/* Bottom placeholder for consistent alignment */}
                      {!hasTrades && <div className="h-2" />}
                    </div>
                  );
                })}

                {/* 8th Column: Weekly Total */}
                <div className={`min-h-[56px] sm:min-h-[72px] lg:min-h-[80px] p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border flex flex-col justify-between bg-white/[0.03] border-white/[0.08] ${
                  week.weeklyTradesCount > 0 ? 'border-[#E0B341]/30' : ''
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] sm:text-[10px] font-mono uppercase text-neutral-500 font-semibold">
                      Sem {week.weekIndex}
                    </span>
                  </div>

                  <div className="my-auto text-center sm:text-right">
                    <div className={`font-mono text-[11px] sm:text-xs lg:text-sm font-bold tabular-nums leading-tight ${
                      week.weeklyNetMoney > 0
                        ? 'text-[#34C97A]'
                        : week.weeklyNetMoney < 0
                          ? 'text-[#FF6B60]'
                          : 'text-neutral-500'
                    }`}>
                      {week.weeklyTradesCount === 0 ? '$0' : formatMoney(week.weeklyNetMoney)}
                    </div>

                    <div className="hidden sm:block text-[9px] font-mono text-neutral-500 mt-0.5 truncate">
                      {week.weeklyTradesCount} {week.weeklyTradesCount === 1 ? 'trade' : 'trades'}
                    </div>
                  </div>

                  <div className="h-1" />
                </div>

              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Modal: Day's Trades Details Popup */}
      {activeDayModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveDayModal(null)}
        >
          <div 
            className="glass-dropdown relative w-full max-w-2xl rounded-3xl border border-white/[0.12] shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0E1119]/90 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  activeDayModal.netMoney >= 0 ? 'bg-[#34C97A]' : 'bg-[#FF6B60]'
                }`} />
                <div>
                  <h3 className="font-heading text-base sm:text-lg font-bold text-white">
                    Operaciones del {activeDayModal.dayNumber} de {MONTH_NAMES[viewMonth - 1]} {viewYear}
                  </h3>
                  <span className="text-xs font-mono text-neutral-400">
                    Fecha: {activeDayModal.dateStr}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveDayModal(null)}
                className="p-2 rounded-xl bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Day Summary Banner */}
            <div className="px-6 py-3.5 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">Resultado Diario</span>
                <span className={`font-heading text-xl font-bold tabular-nums ${
                  activeDayModal.netMoney >= 0 ? 'text-[#34C97A]' : 'text-[#FF6B60]'
                }`}>
                  {formatMoney(activeDayModal.netMoney)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-neutral-400 block">Total Operaciones</span>
                <span className="font-mono text-xs font-semibold text-white">
                  {activeDayModal.trades.length} {activeDayModal.trades.length === 1 ? 'trade' : 'trades'}
                </span>
              </div>
            </div>

            {/* List of Trades for that Day */}
            <div className="p-6 overflow-y-auto space-y-3">
              {activeDayModal.trades.map((trade) => {
                const isWin = trade.money >= 0;
                const isBuy = trade.direccion === 'Buy';

                return (
                  <div
                    key={trade.id}
                    onClick={() => {
                      setActiveDayModal(null);
                      onSelectTrade(trade);
                    }}
                    className="group p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-[#E0B341]/40 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="flex items-center gap-3">
                      {/* Thumbnail or Fallback Icon */}
                      <div className="w-12 h-12 rounded-xl bg-[#12151E] border border-white/[0.08] overflow-hidden shrink-0 flex items-center justify-center">
                        {trade.imageUrl ? (
                          <img
                            src={trade.imageUrl}
                            alt={trade.activo || ''}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-neutral-500" />
                        )}
                      </div>

                      {/* Direction & Asset Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                            isBuy
                              ? 'bg-[#34C97A]/20 text-[#34C97A] border border-[#34C97A]/30'
                              : 'bg-[#FF6B60]/20 text-[#FF6B60] border border-[#FF6B60]/30'
                          }`}>
                            {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {trade.direccion || '—'}
                          </span>

                          <span className="font-heading text-sm font-bold text-white">
                            {trade.activo || '—'}
                          </span>

                          <span className="text-[11px] font-mono text-neutral-400 hidden sm:inline">
                            {trade.sesion || '—'}
                          </span>
                        </div>

                        {/* Prices: In & Out */}
                        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 mt-1">
                          <span>In: <strong className="text-white">{trade.entrada != null && !isNaN(trade.entrada) ? trade.entrada.toFixed(2) : '—'}</strong></span>
                          <span>·</span>
                          <span>Out: <strong className="text-[#E0B341]">{trade.salida != null && !isNaN(trade.salida) ? trade.salida.toFixed(2) : '—'}</strong></span>
                          <span>·</span>
                          <span>Setup: {trade.setup || '—'}</span>
                        </div>

                        {/* SL / TP Outcome Status */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {trade.isSLHit && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#FF6B60]/20 text-[#FF6B60] border border-[#FF6B60]/30">
                              🛑 Salió en SL (Perdedor)
                            </span>
                          )}
                          {trade.isTPHit && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#34C97A]/20 text-[#34C97A] border border-[#34C97A]/30">
                              🎯 Salió en TP (Ganador)
                            </span>
                          )}
                          {trade.rReal !== null && !isNaN(trade.rReal) && (
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              trade.rReal >= 0 ? 'bg-[#34C97A]/15 text-[#34C97A]' : 'bg-[#FF6B60]/15 text-[#FF6B60]'
                            }`}>
                              {trade.rReal >= 0 ? '+' : ''}{trade.rReal.toFixed(2)}R
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Result & Actions Trigger */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-white/[0.05] gap-2">
                      <span className={`font-heading text-base font-bold tabular-nums ${
                        isWin ? 'text-[#34C97A]' : 'text-[#FF6B60]'
                      }`}>
                        {trade.money != null && !isNaN(trade.money) ? `${isWin ? '+' : ''}$${trade.money.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                      </span>

                      <div className="flex items-center gap-2">
                        {isOwner && onEditTrade && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDayModal(null);
                              onEditTrade(trade);
                            }}
                            className="px-2 py-1 rounded-lg bg-[#E0B341]/10 hover:bg-[#E0B341]/25 text-[#E0B341] border border-[#E0B341]/30 text-[11px] font-medium flex items-center gap-1 transition-colors"
                            title="Editar trade"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                        )}

                        {isOwner && onDeleteTrade && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDayModal(null);
                              onDeleteTrade(trade);
                            }}
                            className="p-1.5 rounded-lg bg-[#FF6B60]/10 hover:bg-[#FF6B60]/25 text-[#FF6B60] border border-[#FF6B60]/30 text-[11px] font-medium flex items-center justify-center transition-colors"
                            title="Eliminar trade"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}

                        <span className="text-[11px] font-medium text-[#E0B341] group-hover:underline flex items-center gap-1">
                          <Maximize2 className="w-3 h-3" />
                          <span>Detalle</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-white/[0.08] bg-[#0E1119]/90 flex justify-end shrink-0">
              <button
                onClick={() => setActiveDayModal(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};
