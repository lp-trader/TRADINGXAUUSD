export interface RawTrade {
  ID?: string | number;
  FECHA?: string;
  ACTIVO?: string;
  DIRECCION?: string;
  ENTRADA?: number | string;
  SALIDA?: number | string;
  SL?: number | string;
  TP?: number | string;
  MONEY?: number | string;
  SETUP?: string;
  SESION?: string;
  EMOTION?: string;
  LECCION?: string;
  IMAGEN?: string;
}

export interface Trade {
  id: string;
  fecha: string; // YYYY-MM-DD
  activo: string; // XAU/USD
  direccion: 'Buy' | 'Sell';
  entrada: number;
  salida: number | null;
  sl: number;
  tp: number;
  money: number; // positive = win, negative = loss
  setup: string;
  sesion: 'Asia' | 'Londres' | 'Nueva York' | string;
  emotion: 'Calmado' | 'Confiado' | 'Ansioso' | 'FOMO' | 'Revancha' | string;
  leccion: string;
  imagen: string; // Google Drive ID
  imageUrl: string; // full drive thumbnail URL or fallback
  rrPlanificado: number; // |TP - ENTRADA| / |ENTRADA - SL|
  rReal: number | null; // (SALIDA - ENTRADA) * (1 si Buy, -1 si Sell) / |ENTRADA - SL|
  outcome?: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN';
  isSLHit?: boolean;
  isTPHit?: boolean;
}

export interface TradePayload {
  key: string;
  action?: 'create' | 'update';
  id?: string;
  trade: {
    ID?: string;
    FECHA: string;
    ACTIVO: string;
    DIRECCION: 'Buy' | 'Sell';
    ENTRADA: number;
    SALIDA: number;
    SL: number;
    TP: number;
    MONEY: number;
    SETUP: string;
    SESION: string;
    EMOTION: string;
    LECCION: string;
    IMAGEN?: string;
  };
  imagen?: {
    data: string; // Base64 without 'data:image/...;base64,' prefix
    type: string; // 'image/jpeg'
  };
}

export interface DashboardMetrics {
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number; // 0 - 100
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  avgPlannedRR: number;
  avgRealR: number | null;
  bestTrade: Trade | null;
  worstTrade: Trade | null;
}

export interface EquityPoint {
  index: number;
  id: string;
  fecha: string;
  tradeMoney: number;
  equity: number;
  trade: Trade;
}

export interface GroupPerformance {
  name: string;
  count: number;
  netProfit: number;
  winCount: number;
  winRate: number;
  avgRealR?: number | null;
}
