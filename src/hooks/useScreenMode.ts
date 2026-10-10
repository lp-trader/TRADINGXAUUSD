import { useState, useEffect } from 'react';

export type ScreenMode = 'phone' | 'tablet' | 'pc';

export interface ScreenInfo {
  mode: ScreenMode; // 'phone' | 'tablet' | 'pc'
  isPhone: boolean;
  isTablet: boolean;
  isPc: boolean;
  width: number;
  height: number;
  label: string;
  icon: string;
}

const STORAGE_KEY = 'trading_journal_screen_mode_override';

export function getDeviceMode(width: number): ScreenMode {
  if (width < 768) {
    return 'phone';
  } else if (width < 1024) {
    return 'tablet';
  } else {
    return 'pc';
  }
}

export function useScreenMode() {
  const [windowWidth, setWindowWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 1200;
  });

  const [windowHeight, setWindowHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight;
    }
    return 800;
  });

  // Optional manual override for user testing or preference ('auto' | 'phone' | 'tablet' | 'pc')
  const [modeOverride, setModeOverride] = useState<'auto' | ScreenMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'phone' || stored === 'tablet' || stored === 'pc') {
        return stored;
      }
    }
    return 'auto';
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const detectedMode: ScreenMode = getDeviceMode(windowWidth);
  const activeMode: ScreenMode = modeOverride === 'auto' ? detectedMode : modeOverride;

  const setOverride = (newMode: 'auto' | ScreenMode) => {
    setModeOverride(newMode);
    if (typeof window !== 'undefined') {
      if (newMode === 'auto') {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, newMode);
      }
    }
  };

  const info: ScreenInfo = {
    mode: activeMode,
    isPhone: activeMode === 'phone',
    isTablet: activeMode === 'tablet',
    isPc: activeMode === 'pc',
    width: windowWidth,
    height: windowHeight,
    label: activeMode === 'phone' ? 'Teléfono' : activeMode === 'tablet' ? 'Tablet' : 'PC',
    icon: activeMode === 'phone' ? '📱' : activeMode === 'tablet' ? '💻' : '🖥️'
  };

  return {
    ...info,
    detectedMode,
    modeOverride,
    setOverride
  };
}
