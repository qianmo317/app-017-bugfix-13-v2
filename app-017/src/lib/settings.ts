/**
 * 应用设置：localStorage 持久化（沿用项目命名约定 app-017: 前缀）。
 */
import type { AppSettings } from '../types';

const KEY = 'app-017:settings';

export const DEFAULT_SETTINGS: AppSettings = {
  toneMode: 'national',
  autoDetectPinyin: true,
  showPageNumbers: true,
  highContrast: false,
  fontScale: 100,
  printer: {
    dotDiameterMm: 1.5,
    dotPitchMm: 2.5,
    cellPitchMm: 6.2,
    linePitchMm: 10,
    paperWidthMm: 210,
    paperHeightMm: 297,
  },
  dictEntries: [],
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      printer: { ...DEFAULT_SETTINGS.printer, ...(parsed.printer ?? {}) },
      dictEntries: parsed.dictEntries ?? [],
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: AppSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}

/** 返回一份全新的默认设置（深拷贝，避免修改共享的 DEFAULT_SETTINGS），词语表一并清空 */
export function createDefaultSettings(): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    printer: { ...DEFAULT_SETTINGS.printer },
    dictEntries: [],
  };
}
