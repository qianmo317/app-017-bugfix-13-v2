import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AppSettings } from './types';
import { loadSettings, saveSettings } from './lib/settings';
import { usePath } from './router';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import PrintPage from './pages/PrintPage';
import LibraryPage from './pages/LibraryPage';
import SettingsPage from './pages/SettingsPage';

interface SettingsCtx {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
}

export const SettingsContext = createContext<SettingsCtx>({
  settings: loadSettings(),
  update: () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const path = usePath();

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // 无障碍设置应用到根元素：高对比度主题 + 字号缩放
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('high-contrast', settings.highContrast);
    root.style.fontSize = `${(16 * settings.fontScale) / 100}px`;
  }, [settings.highContrast, settings.fontScale]);

  const ctx: SettingsCtx = {
    settings,
    update: (patch) => setSettings((prev) => ({ ...prev, ...patch })),
  };

  let page: JSX.Element;
  if (path === '/' || path === '') page = <HomePage />;
  else if (path === '/library') page = <LibraryPage />;
  else if (path === '/settings') page = <SettingsPage />;
  else if (/^\/editor\/[^/]+\/print$/.test(path)) page = <PrintPage id={path.split('/')[2]} />;
  else if (/^\/editor\/[^/]+$/.test(path)) page = <EditorPage id={path.split('/')[2]} />;
  else page = <HomePage />;

  return (
    <SettingsContext.Provider value={ctx}>
      <a href="#main" className="skip-link">
        跳到主要内容
      </a>
      <nav className="topnav" aria-label="主导航">
        <span className="brand">盲文点字排版与打印工作室</span>
        <a href="/" onClick={(e) => { e.preventDefault(); window.history.pushState(null, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); }}>
          首页
        </a>
        <a href="/library" onClick={(e) => { e.preventDefault(); window.history.pushState(null, '', '/library'); window.dispatchEvent(new PopStateEvent('popstate')); }}>
          模板与词语表
        </a>
        <a href="/settings" onClick={(e) => { e.preventDefault(); window.history.pushState(null, '', '/settings'); window.dispatchEvent(new PopStateEvent('popstate')); }}>
          设置
        </a>
      </nav>
      <main id="main">{page}</main>
      <footer className="footer">纯前端离线应用 · 规则依据 GB/T 15720-1995 与 GF 0019-2018</footer>
    </SettingsContext.Provider>
  );
}
