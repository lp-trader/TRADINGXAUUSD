export interface RawTrade {
  ID?: string | number;
  FECHA?: string;
  ACTIVO?: string;
  ENTRADA?: number | string;
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
  entrada: number;
  sl: number;
  tp: number;
  money: number; // positive = win, negative = loss
  setup: string;
  sesion: 'Asia' | 'Londres' | 'Nueva York' | string;
  emotion: 'Calmado' | 'Confiado' | 'Ansioso' | 'FOMO' | 'Revancha' | string;
  leccion: string;
  imagen: string; // Google Drive ID
  imageUrl: string; // full drive thumbnail URL or fallback
  direccion: 'COMPRA' | 'VENTA';
  rrPlanificado: number; // |TP - ENTRADA| / |ENTRADA - SL|
}

export interface TradePayload {
  key: string;
  trade: {
    FECHA: string;
    ACTIVO: string;
    ENTRADA: number;
    SL: number;
    TP: number;
    MONEY: number;
    SETUP: string;
    SESION: string;
    EMOTION: string;
    LECCION: string;
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
}
