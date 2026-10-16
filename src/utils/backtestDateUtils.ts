import { Trade } from '../types/trade';
import { normalizeDateToYYYYMMDD } from './tradeCalculation';

const STUDY_YEAR_STORAGE_PREFIX = 'trading_journal_study_year_';

/**
 * Detects a 4-digit year (between 1990 and 2099) from any text string.
 * Example: "Backtest 2023" -> 2023, "Oro 2024 Q1" -> 2024.
 */
export function detectYearFromText(text: string): number | null {
  if (!text) return null;
  const match = text.match(/\b(19\d\d|20\d\d)\b/);
  if (match && match[1]) {
    const yr = parseInt(match[1], 10);
    if (!isNaN(yr) && yr >= 1990 && yr <= 2099) {
      return yr;
    }
  }
  return null;
}

/**
 * Gets the stored study year for a specific backtest sheet name from localStorage.
 */
export function getStoredStudyYear(sheetName: string): number | null {
  if (!sheetName) return null;
  try {
    const clean = sheetName.trim();
    const stored = localStorage.getItem(`${STUDY_YEAR_STORAGE_PREFIX}${clean}`);
    if (stored) {
      const yr = parseInt(stored, 10);
      if (!isNaN(yr) && yr >= 1990 && yr <= 2099) {
        return yr;
      }
    }
  } catch (err) {
    console.error('Error reading study year from localStorage:', err);
  }
  return null;
}

/**
 * Stores the study year for a specific backtest sheet name in localStorage.
 */
export function setStoredStudyYear(sheetName: string, year: number): void {
  if (!sheetName || isNaN(year)) return;
  try {
    const clean = sheetName.trim();
    localStorage.setItem(`${STUDY_YEAR_STORAGE_PREFIX}${clean}`, String(year));
  } catch (err) {
    console.error('Error saving study year in localStorage:', err);
  }
}

/**
 * Gets the latest trade date (YYYY-MM-DD) from a list of trades.
 */
export function getLatestTradeDate(trades?: Trade[]): string | null {
  if (!trades || trades.length === 0) return null;

  const validTrades = trades
    .map((t) => normalizeDateToYYYYMMDD(t.fecha))
    .filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f));

  if (validTrades.length === 0) return null;

  // Sort descending by date string
  validTrades.sort((a, b) => b.localeCompare(a));
  return validTrades[0] || null;
}

/**
 * Resolves the study year for a backtest with the following hierarchy:
 * 1. User manual selection in localStorage for this sheet.
 * 2. 4-digit year in sheet name (e.g. "Backtest 2023").
 * 3. Most recent trade year or most frequent trade year in this sheet.
 * 4. Fallback: previous calendar year (e.g. 2025/2024), or current year.
 */
export function detectStudyYear(sheetName: string, trades?: Trade[]): number {
  // 1. Check user preference stored in localStorage
  const stored = getStoredStudyYear(sheetName);
  if (stored) return stored;

  // 2. Check year embedded in sheet name
  const nameYear = detectYearFromText(sheetName);
  if (nameYear) return nameYear;

  // 3. Check existing trades in this sheet
  if (trades && trades.length > 0) {
    const yearCounts = new Map<number, number>();
    let latestYear: number | null = null;
    let latestDateStr = '';

    for (const t of trades) {
      const normalized = normalizeDateToYYYYMMDD(t.fecha);
      if (normalized && /^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        const yr = parseInt(normalized.slice(0, 4), 10);
        if (!isNaN(yr) && yr >= 1990 && yr <= 2099) {
          yearCounts.set(yr, (yearCounts.get(yr) || 0) + 1);
          if (normalized > latestDateStr) {
            latestDateStr = normalized;
            latestYear = yr;
          }
        }
      }
    }

    if (latestYear) return latestYear;
  }

  // 4. Default fallback: previous year if we're in current year, or reasonable recent backtest year
  const currentYear = new Date().getFullYear();
  return currentYear > 2024 ? currentYear - 1 : currentYear;
}

/**
 * Returns the default date string (YYYY-MM-DD) for a new trade:
 * - In real mode: today's date.
 * - In backtest mode:
 *   - If there is an existing trade in the backtest with the same study year,
 *     it returns that exact latest trade date (so the user doesn't have to navigate from 2026).
 *   - If there is a latest trade but from a different year, it shifts that date to the study year.
 *   - If there are no trades yet, it returns `${studyYear}-01-02`.
 */
export function getDefaultDateForNewTrade(params: {
  isBacktest: boolean;
  studyYear?: number;
  trades?: Trade[];
}): string {
  const { isBacktest, studyYear, trades } = params;

  if (!isBacktest) {
    return new Date().toISOString().split('T')[0];
  }

  const effectiveYear = studyYear || detectStudyYear('', trades);
  const latestDate = getLatestTradeDate(trades);

  if (latestDate) {
    const parts = latestDate.split('-');
    if (parts.length === 3) {
      const [, m, d] = parts;
      // Retain the month and day of the latest trade, but ensure the year is the study year
      return `${effectiveYear}-${m}-${d}`;
    }
  }

  // If no trades exist yet, default to January 2nd of the study year
  return `${effectiveYear}-01-02`;
}

/**
 * Replaces the year of a YYYY-MM-DD string with targetYear.
 * Handles February 29th for non-leap years.
 */
export function shiftDateYear(dateStr: string, targetYear: number): string {
  if (!dateStr) return `${targetYear}-01-02`;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return `${targetYear}-01-02`;

  let m = parts[1];
  let d = parts[2];

  // Adjust Feb 29 for non-leap years
  if (m === '02' && d === '29') {
    const isLeap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || (targetYear % 400 === 0);
    if (!isLeap) {
      d = '28';
    }
  }

  return `${targetYear}-${m}-${d}`;
}

/**
 * Adds or subtracts days to a YYYY-MM-DD string.
 */
export function addDaysToDate(dateStr: string, days: number): string {
  if (!dateStr) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);

  const dt = new Date(y, m, d);
  dt.setDate(dt.getDate() + days);

  const newY = dt.getFullYear();
  const newM = String(dt.getMonth() + 1).padStart(2, '0');
  const newD = String(dt.getDate()).padStart(2, '0');

  return `${newY}-${newM}-${newD}`;
}
