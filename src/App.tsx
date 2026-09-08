import { useEffect, useState } from "react";
import {
  Bell,
  CircleUserRound,
  Download,
  Gamepad2,
  HeartPulse,
  Home,
  Library,
  Minus,
  Newspaper,
  PackageOpen,
  Rocket,
  Search,
  Settings,
  Square,
  Tag,
  Wrench,
  X,
} from "lucide-react";
import pandaVaultLogo from "./assets/pandavault-new-logo.png";
import { invoke, isTauri } from "@tauri-apps/api/core";
import GameLibrariesPage from "./components/GameLibrariesPage";
import LibraryPage from "./components/LibraryPage";
import HomePage from "./components/HomePage";
import FeaturePreviewPage from "./components/FeaturePreviewPage";
import "./App.css";
import "./Shell.css";

type SteamGame = {
  appId: string;
  name: string;
  installDir: string;
  installPath: string;
  libraryPath: string;
  sizeOnDisk: number;
  buildId: string;
  stateFlags: number;
  lastUpdated: number;
  lastPlayed: number;
  steamPlaytimeMinutes: number | null;
  steamPlaytime2weeksMinutes: number | null;
};

type SteamScanResult = {
  steamPath: string;
  libraryPaths: string[];
  games: SteamGame[];
};

type EpicGame = {
  appName: string;
  name: string;
  installPath: string;
  installSize: number;
  version: string | null;
  catalogNamespace: string | null;
  catalogItemId: string | null;
  mainGameAppName: string | null;
  mainGameCatalogNamespace: string | null;
  mainGameCatalogItemId: string | null;
  appCategories: string[];
  technicalType: string | null;
  launchExecutable: string | null;
  isExecutable: boolean | null;
};

type EpicScanResult = {
  launcherFound: boolean;
  manifestDirectoryFound: boolean;
  manifestPath: string;
  games: EpicGame[];
  warnings: string[];
};

type XboxCandidate = {
  name: string;
  packageName: string;
  packageFamilyName: string;
  packageFullName: string;
  applicationId: string;
  aumid: string;
  version: string;
  publisher: string;
  installLocation: string;
};

type XboxScanResult = {
  available: boolean;
  games: XboxCandidate[];
  warnings: string[];
};

type GameAnalytics = {
  appId: string;
  gameName: string;
  totalSeconds: number;
  sessionCount: number;
};

type RecentSession = {
  id: number;
  appId: string;
  gameName: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
};

type AnalyticsSummary = {
  totalSeconds: number;
  sessionCount: number;
  uniqueGames: number;
  topGames: GameAnalytics[];
  recentSessions: RecentSession[];
};

const browserDevGames: SteamGame[] = [
  {
    appId: "1267910",
    name: "Melvor Idle",
    installDir: "Melvor Idle",
    installPath: "",
    libraryPath: "",
    sizeOnDisk: 1450000000,
    buildId: "dev",
    stateFlags: 4,
    lastUpdated: 0,
    lastPlayed: Math.floor(Date.now() / 1000) - 86400,
    steamPlaytimeMinutes: 1255,
    steamPlaytime2weeksMinutes: 180,
  },
  {
    appId: "4514930",
    name: "The Undercut",
    installDir: "The Undercut",
    installPath: "",
    libraryPath: "",
    sizeOnDisk: 4200000000,
    buildId: "dev",
    stateFlags: 4,
    lastUpdated: 0,
    lastPlayed: Math.floor(Date.now() / 1000) - 3600,
    steamPlaytimeMinutes: 486,
    steamPlaytime2weeksMinutes: 486,
  },
  {
    appId: "1142710",
    name: "Total War: WARHAMMER III",
    installDir: "Total War WARHAMMER III",
    installPath: "",
    libraryPath: "",
    sizeOnDisk: 86000000000,
    buildId: "dev",
    stateFlags: 4,
    lastUpdated: 0,
    lastPlayed: Math.floor(Date.now() / 1000) - 172800,
    steamPlaytimeMinutes: 49,
    steamPlaytime2weeksMinutes: 0,
  },
];

const browserDevSteamScan: SteamScanResult = {
  steamPath: "",
  libraryPaths: [],
  games: browserDevGames,
};

const browserDevAnalytics: AnalyticsSummary = {
  totalSeconds: 54600,
  sessionCount: 8,
  uniqueGames: 3,
  topGames: [
    { appId: "4514930", gameName: "The Undercut", totalSeconds: 25200, sessionCount: 3 },
    { appId: "1267910", gameName: "Melvor Idle", totalSeconds: 19800, sessionCount: 3 },
    { appId: "1142710", gameName: "Total War: WARHAMMER III", totalSeconds: 9600, sessionCount: 2 },
  ],
  recentSessions: [],
};

type NavIconName =
  | "home"
  | "games"
  | "library"
  | "launchers"
  | "health"
  | "downloads"
  | "deals"
  | "news"
  | "mods"
  | "tools";

type NavItem = {
  label: string;
  icon: NavIconName;
};

const navItems: NavItem[] = [
  { label: "Home", icon: "home" },
  { label: "Games & Apps", icon: "games" },
  { label: "Game Library", icon: "library" },
  { label: "Launchers", icon: "launchers" },
  { label: "Game Health", icon: "health" },
  { label: "Downloads", icon: "downloads" },
  { label: "Deals", icon: "deals" },
  { label: "News", icon: "news" },
  { label: "Mods", icon: "mods" },
  { label: "Tools", icon: "tools" },
];

function NavIcon({ name }: { name: NavIconName }) {
  const props = { size: 20, strokeWidth: 2, "aria-hidden": true };

  switch (name) {
    case "home":
      return <Home {...props} />;
    case "games":
      return <Gamepad2 {...props} />;
    case "library":
      return <Library {...props} />;
    case "launchers":
      return <Rocket {...props} />;
    case "health":
      return <HeartPulse {...props} />;
    case "downloads":
      return <Download {...props} />;
    case "deals":
      return <Tag {...props} />;
    case "news":
      return <Newspaper {...props} />;
    case "mods":
      return <PackageOpen {...props} />;
    case "tools":
      return <Wrench {...props} />;
  }
}

function App() {
  const [activeNav, setActiveNav] = useState("Home");
  const [steamScan, setSteamScan] = useState<SteamScanResult | null>(null);
  const [steamError, setSteamError] = useState<string | null>(null);
  const [epicScan, setEpicScan] = useState<EpicScanResult | null>(null);
  const [epicError, setEpicError] = useState<string | null>(null);
  const [, setXboxScan] = useState<XboxScanResult | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isTauri()) {
      setSteamScan(browserDevSteamScan);
      setSteamError(null);
      return () => { cancelled = true; };
    }
    invoke<SteamScanResult>("scan_steam_games")
      .then((result) => { if (!cancelled) { setSteamScan(result); setSteamError(null); } })
      .catch((error) => { if (!cancelled) { setSteamScan(null); setSteamError(String(error)); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isTauri()) {
      setEpicScan({ launcherFound: false, manifestDirectoryFound: false, manifestPath: "", games: [], warnings: [] });
      setEpicError(null);
      return () => { cancelled = true; };
    }
    invoke<EpicScanResult>("scan_epic_games")
      .then((result) => { if (!cancelled) { setEpicScan(result); setEpicError(null); } })
      .catch((error) => { if (!cancelled) { setEpicScan(null); setEpicError(String(error)); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isTauri()) {
      setXboxScan({ available: false, games: [], warnings: [] });
      return () => { cancelled = true; };
    }
    invoke<XboxScanResult>("scan_xbox_games")
      .then((result) => { if (!cancelled) setXboxScan(result); })
      .catch((error) => { if (!cancelled) { console.warn("Xbox discovery unavailable:", error); setXboxScan(null); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isTauri()) {
      setAnalytics(browserDevAnalytics);
      setAnalyticsError(null);
      return () => { cancelled = true; };
    }
    const loadAnalytics = () => {
      invoke<AnalyticsSummary>("get_analytics_summary")
        .then((result) => { if (!cancelled) { setAnalytics(result); setAnalyticsError(null); } })
        .catch((error) => { if (!cancelled) { setAnalytics(null); setAnalyticsError(String(error)); } });
    };
    loadAnalytics();
    const interval = window.setInterval(loadAnalytics, 10_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);

  const libraryActive = activeNav === "Games & Apps" || activeNav === "Game Library" || activeNav === "Library";

  return (
    <div className="pv-app-shell">
      <header className="pv-app-header">
        <div className="pv-header-brand">
          <img src={pandaVaultLogo} alt="" />
          <div className="pv-header-brand-copy">
            <div className="pv-header-wordmark"><span>PANDA</span><strong>VAULT</strong></div>
            <div className="pv-header-tagline">YOUR GAMING PC. ORGANISED.</div>
          </div>
        </div>

        <label className="pv-header-search">
          <Search size={20} aria-hidden="true" />
          <input type="search" placeholder="Search games, apps, or files..." aria-label="Search PandaVault" />
        </label>

        <div className="pv-header-right">
          <div className="pv-window-controls" aria-hidden="true">
            <button type="button" tabIndex={-1}><Minus size={16} /></button>
            <button type="button" tabIndex={-1}><Square size={13} /></button>
            <button type="button" tabIndex={-1}><X size={16} /></button>
          </div>
          <div className="pv-header-bottom-row">
            <div className="pv-header-motto">
              <span>PLAY</span><i />
              <span>ORGANISE</span><i />
              <span>DOWNLOAD</span><i />
              <span>ENJOY</span>
            </div>
            <button className="pv-header-icon" type="button" onClick={() => setActiveNav("Settings")} aria-label="Settings"><Settings size={20} /></button>
            <button className="pv-header-profile" type="button" aria-label="Profile"><CircleUserRound size={22} /></button>
            <button className="pv-header-icon pv-header-notify" type="button" aria-label="Notifications"><Bell size={18} /></button>
          </div>
        </div>
      </header>

      <aside className="pv-app-sidebar" aria-label="PandaVault navigation">
        <nav className="pv-sidebar-nav">
          {navItems.map((item) => {
            const active = activeNav === item.label || (item.label === "Game Library" && libraryActive && activeNav === "Library");
            return (
              <button key={item.label} type="button" className={active ? "pv-sidebar-item is-active" : "pv-sidebar-item"} onClick={() => setActiveNav(item.label)} aria-current={active ? "page" : undefined}>
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="pv-sidebar-bottom">
          <button className={activeNav === "Settings" ? "pv-sidebar-settings is-active" : "pv-sidebar-settings"} type="button" onClick={() => setActiveNav("Settings") }>
            <Settings size={20} />
            <span>Settings</span>
          </button>
          <div className="pv-sidebar-brand-card">
            <img src={pandaVaultLogo} alt="" />
            <div><strong>PANDA<span>VAULT</span></strong><small>v0.1.0 · ALPHA</small></div>
          </div>
        </div>
      </aside>

      <main className="pv-app-main">
        {activeNav === "Settings" ? (
          <GameLibrariesPage />
        ) : libraryActive ? (
          <LibraryPage
            games={steamScan?.games ?? []}
            epicGames={epicScan?.games ?? []}
            steamPath={steamScan?.steamPath ?? null}
            loading={!steamScan && !steamError}
            error={steamError ?? epicError}
          />
        ) : activeNav === "Home" ? (
          <HomePage
            steamScan={steamScan}
            steamError={steamError}
            analytics={analytics}
            analyticsError={analyticsError}
            onNavigate={setActiveNav}
          />
        ) : (
          <FeaturePreviewPage feature={activeNav} onNavigate={setActiveNav} />
        )}
      </main>
    </div>
  );
}

export default App;
