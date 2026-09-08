import { useEffect, useMemo, useState } from "react";
import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import {
  ChevronRight,
  CircleGauge,
  Download,
  Gamepad2,
  HardDrive,
  Library,
  MemoryStick,
  Microchip,
  PackageOpen,
  Settings2,
  Tag,
  Wifi,
} from "lucide-react";
import pandaLogo from "../assets/pandavault-new-logo.png";
import heroArt from "../assets/pandavault-hero-art.png";
import steamIcon from "../assets/launcher-steam.png";
import epicIcon from "../assets/launcher-epic.png";
import eaIcon from "../assets/launcher-ea.png";
import ubisoftIcon from "../assets/launcher-ubisoft.png";
import xboxIcon from "../assets/launcher-xbox.png";
import battlenetIcon from "../assets/launcher-battlenet.png";
import "./HomePage.css";

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

type GameArtwork = {
  appId: string;
  artworkPath: string | null;
};

type HomePageProps = {
  steamScan: SteamScanResult | null;
  steamError: string | null;
  analytics: AnalyticsSummary | null;
  analyticsError: string | null;
  onNavigate: (destination: string) => void;
};

const browserCardArtwork: Record<string, string> = {
  "4514930": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4514930/268bb497efc35744f6bc6de482e0cbc1b8eb1760/header.jpg",
  "1267910": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1267910/header.jpg",
  "1142710": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1142710/header.jpg",
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 GB";
  const gigabytes = bytes / 1024 / 1024 / 1024;
  if (gigabytes >= 1024) return `${(gigabytes / 1024).toFixed(1)} TB`;
  return `${gigabytes.toFixed(gigabytes >= 100 ? 0 : 1)} GB`;
}

function relativePlayed(timestamp: number) {
  if (!timestamp) return "Not played yet";
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 3600) return "Just played";
  const hours = Math.floor(seconds / 3600);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

const launcherCards = [
  { key: "steam", label: "Steam", icon: steamIcon },
  { key: "epic", label: "Epic Games", icon: epicIcon },
  { key: "ea", label: "EA App", icon: eaIcon },
  { key: "ubisoft", label: "Ubisoft Connect", icon: ubisoftIcon },
  { key: "xbox", label: "Xbox", icon: xboxIcon },
];

export default function HomePage({
  steamScan,
  steamError,
  analyticsError,
  onNavigate,
}: HomePageProps) {
  const games = steamScan?.games ?? [];
  const demoMode = !isTauri();

  const [artwork, setArtwork] = useState<Record<string, string>>({});
  const [brokenArtwork, setBrokenArtwork] = useState<Record<string, boolean>>({});

  const totalStorage = useMemo(
    () => games.reduce((total, game) => total + game.sizeOnDisk, 0),
    [games],
  );

  useEffect(() => {
    let cancelled = false;

    async function refreshArtwork() {
      if (games.length === 0) {
        setArtwork({});
        return;
      }

      if (!isTauri()) {
        const nextArtwork: Record<string, string> = {};
        for (const game of games) {
          nextArtwork[game.appId] = browserCardArtwork[game.appId] ?? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.appId}/header.jpg`;
        }
        if (!cancelled) setArtwork(nextArtwork);
        return;
      }

      if (!steamScan?.steamPath) return;

      try {
        const imported = await invoke<GameArtwork[]>("import_steam_artwork", {
          steamPath: steamScan.steamPath,
          appIds: games.map((game) => game.appId),
        });
        const nextArtwork: Record<string, string> = {};
        for (const item of imported) {
          if (item.artworkPath) nextArtwork[item.appId] = convertFileSrc(item.artworkPath);
        }
        if (!cancelled) setArtwork(nextArtwork);
      } catch (error) {
        console.error("Unable to load PandaVault Home artwork:", error);
      }
    }

    refreshArtwork();
    return () => { cancelled = true; };
  }, [games, steamScan?.steamPath]);

  const recentGames = games.slice(0, 8);
  const remainingSlots = Math.max(0, 8 - recentGames.length);
  const recentLaunchers = launcherCards.slice(0, remainingSlots);
  const systemReady = !steamError && !analyticsError;

  return (
    <div className="pv-ref-home">
      <div className="pv-ref-main-column">
        <section className="pv-ref-panel pv-ref-hero">
          <div className="pv-ref-hero-copy">
            <div className="pv-ref-hero-brand">
              <img src={pandaLogo} alt="" />
              <div>
                <div className="pv-ref-hero-wordmark"><span>PANDA</span><strong>VAULT</strong></div>
                <p>YOUR GAMING PC. ORGANISED.</p>
              </div>
            </div>

            <div className="pv-ref-hero-pillars">
              <div><Gamepad2 size={28} /><span><strong>PLAY</strong><small>Your Games</small></span></div>
              <div><Library size={28} /><span><strong>ORGANISE</strong><small>All Your Content</small></span></div>
              <div><Download size={28} /><span><strong>DOWNLOAD</strong><small>When You Need It</small></span></div>
              <div><span className="pv-ref-star">★</span><span><strong>ENJOY</strong><small>Your Way</small></span></div>
            </div>

            <div className="pv-ref-hero-footer">ONE HUB. TOTAL CONTROL.</div>
          </div>
          <div className="pv-ref-hero-art"><img src={heroArt} alt="" /></div>
        </section>

        <section className="pv-ref-panel pv-ref-quick">
          <h2>Quick Actions</h2>
          <div className="pv-ref-quick-grid">
            <button type="button" onClick={() => onNavigate("Game Library")}>
              <Gamepad2 size={28} /><span><strong>Scan for Games</strong><small>Find installed games</small></span><ChevronRight size={20} />
            </button>
            <button type="button" onClick={() => onNavigate("Game Library")}>
              <Library size={28} /><span><strong>Game Library</strong><small>Browse your collection</small></span><ChevronRight size={20} />
            </button>
            <button type="button" onClick={() => onNavigate("Deals")}>
              <Tag size={28} /><span><strong>Find Deals</strong><small>Wishlist & price tracking</small></span><ChevronRight size={20} />
            </button>
            <button type="button" onClick={() => onNavigate("Tools")}>
              <Settings2 size={28} /><span><strong>Tools</strong><small>Manage your gaming PC</small></span><ChevronRight size={20} />
            </button>
          </div>
        </section>

        <section className="pv-ref-panel pv-ref-recent">
          <div className="pv-ref-section-head"><h2>Recent Games</h2><button type="button" onClick={() => onNavigate("Game Library")}>View All</button></div>
          <div className="pv-ref-game-row">
            {recentGames.map((game) => {
              const key = `ref-${game.appId}`;
              const gameArtwork = artwork[game.appId];
              const broken = brokenArtwork[key];
              return (
                <button className="pv-ref-game-card" key={game.appId} type="button" onClick={() => onNavigate("Game Library")}>
                  <div className="pv-ref-game-art">
                    {gameArtwork && !broken ? (
                      <img src={gameArtwork} alt="" onError={() => setBrokenArtwork((current) => ({ ...current, [key]: true }))} />
                    ) : <span>{initials(game.name)}</span>}
                  </div>
                  <strong>{game.name}</strong>
                  <small>{relativePlayed(game.lastPlayed)}</small>
                </button>
              );
            })}
            {recentLaunchers.map((launcher) => (
              <button className="pv-ref-game-card" key={launcher.key} type="button" onClick={() => onNavigate("Launchers")}>
                <div className="pv-ref-game-art pv-ref-launcher-art"><img src={launcher.icon} alt="" /></div>
                <strong>{launcher.label}</strong>
                <small>Launcher</small>
              </button>
            ))}
          </div>
        </section>

        <section className="pv-ref-bottom-grid">
          <article className="pv-ref-panel pv-ref-bottom-card">
            <div className="pv-ref-section-head"><h2>Latest Download</h2><ChevronRight size={16} /></div>
            <div className="pv-ref-download-row">
              <div className="pv-ref-download-icon"><PackageOpen size={22} /></div>
              <div><strong>{demoMode ? "Forza Horizon 5 - Update" : "No active download"}</strong><div className="pv-ref-progress"><i style={{ width: demoMode ? "56%" : "0%" }} /></div><small>{demoMode ? "2.4 GB / 5.1 GB" : "Downloads are idle"}</small></div>
              <span>{demoMode ? "56%" : "—"}</span>
            </div>
          </article>

          <article className="pv-ref-panel pv-ref-bottom-card">
            <h2>System Overview</h2>
            <div className="pv-ref-system-chips">
              <div><Microchip size={22} /><span>CPU<small>{demoMode ? "12%" : "—"}</small></span></div>
              <div><CircleGauge size={22} /><span>GPU<small>{demoMode ? "28%" : "—"}</small></span></div>
              <div><MemoryStick size={22} /><span>RAM<small>{demoMode ? "46%" : "—"}</small></span></div>
              <div><HardDrive size={22} /><span>Storage<small>{demoMode ? "62%" : "—"}</small></span></div>
            </div>
          </article>

          <article className="pv-ref-panel pv-ref-bottom-card">
            <div className="pv-ref-section-head"><h2>Storage</h2><ChevronRight size={16} /></div>
            <div className="pv-ref-storage-row">
              <HardDrive size={27} />
              <div><strong>Game Storage</strong><div className="pv-ref-progress"><i style={{ width: demoMode ? "60%" : "45%" }} /></div><small>{formatBytes(totalStorage)} detected</small></div>
              <span>{demoMode ? "60%" : ""}</span>
            </div>
          </article>
        </section>
      </div>

      <aside className="pv-ref-right-rail">
        <section className="pv-ref-panel pv-ref-shortcuts">
          <div className="pv-ref-section-head"><h2>Shortcuts</h2><button type="button">◇ Edit</button></div>
          <div className="pv-ref-launchers">
            <button type="button" onClick={() => onNavigate("Game Library")}><img src={steamIcon} alt="" /><span>Steam</span></button>
            <button type="button" onClick={() => onNavigate("Game Library")}><img src={epicIcon} alt="" /><span>Epic Games</span></button>
            <button type="button" onClick={() => onNavigate("Launchers")}><img src={eaIcon} alt="" /><span>EA App</span></button>
            <button type="button" onClick={() => onNavigate("Launchers")}><img src={ubisoftIcon} alt="" /><span>Ubisoft Connect</span></button>
            <button type="button" onClick={() => onNavigate("Launchers")}><img src={xboxIcon} alt="" /><span>Xbox</span></button>
            <button type="button" onClick={() => onNavigate("Launchers")}><img src={battlenetIcon} alt="" /><span>Battle.net</span></button>
          </div>
        </section>

        <section className="pv-ref-panel pv-ref-status">
          <h2>System Status</h2>
          <div className={systemReady ? "pv-ref-all-good" : "pv-ref-all-good pv-ref-attention"}><i /><strong>{systemReady ? "All Systems Go" : "Needs Attention"}</strong></div>
          <div className="pv-ref-status-row"><Wifi size={27} /><span><strong>Internet</strong><small>{demoMode ? "Connected" : "Available in desktop telemetry"}</small></span></div>
          <div className="pv-ref-status-row"><HardDrive size={27} /><span><strong>Disk Space</strong><small>{demoMode ? "412 GB free" : `${formatBytes(totalStorage)} game data`}</small></span></div>
          <div className="pv-ref-status-row"><Settings2 size={27} /><span><strong>Game Scanners</strong><small>{steamError ? "Needs attention" : "Ready"}</small></span></div>
          <div className="pv-ref-status-row"><Download size={27} /><span><strong>Downloads</strong><small>Idle</small></span></div>
        </section>

        <div className="pv-ref-quote">“GAMES, MEDIA, IDEAS.<br />ALL IN ONE PLACE.”<i /></div>
      </aside>
    </div>
  );
}
