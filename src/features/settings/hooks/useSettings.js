import { useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "../../../config/constants.js";
import { loadSettings } from "../../../lib/storage.js";

export function useSettings() {
  const initialSettings = useMemo(loadSettings, []);
  const [settings, setSettings] = useState(initialSettings);
  const [dark, setDark] = useState(() => {
    const preference = initialSettings.theme || "system";
    if (preference === "system" && typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return preference !== "light";
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState("general");
  const [openRouterStatus, setOpenRouterStatus] = useState({ loading: true, ok: false, error: null });

  useEffect(() => {
    if (!settingsOpen) setSettingsView("general");
  }, [settingsOpen]);

  useEffect(() => {
    if (settings.theme !== "system") {
      setDark(settings.theme === "dark");
      return undefined;
    }
    if (!window.matchMedia) return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => setDark(media.matches);
    syncTheme();
    media.addEventListener?.("change", syncTheme);
    return () => media.removeEventListener?.("change", syncTheme);
  }, [settings.theme]);

  useEffect(() => {
    const theme = dark ? "dark" : "light";
    const background = dark ? "#0a0a0a" : "#ffffff";

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.documentElement.style.backgroundColor = background;
    document.documentElement.style.setProperty("--chat-font-size", `${Number(settings.fontSize || 16)}px`);

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", background);
    localStorage.setItem("theme", dark ? "dark" : "light");
    const favicon = document.querySelector("#app-favicon") || document.querySelector('link[rel="icon"]');
    if (favicon) favicon.href = dark ? "/favicon-dark.svg" : "/favicon-light.svg";
  }, [dark, settings.fontSize]);

  useEffect(() => {
    document.documentElement.dataset.reducedMotion =
      settings.reducedMotion ? "true" : "false";
  }, [settings.reducedMotion]);

  useEffect(() => {
    const root = document.documentElement;

    const messageWidth =
      settings.messageWidth ||
      "comfortable";

    const density =
      settings.interfaceDensity ||
      "comfortable";

    const codeFontSize =
      settings.codeFontSize ||
      "normal";


    const conversationWidths = {
      compact: "680px",
      comfortable: "760px",
      wide: "920px",
    };


    const composerWidths = {
      compact: "620px",
      comfortable: "680px",
      wide: "800px",
    };


    const codeSizes = {
      small: "11.5px",
      normal: "12.5px",
      large: "14px",
    };


    root.dataset.messageWidth =
      messageWidth;

    root.dataset.density =
      density;

    root.dataset.codeFontSize =
      codeFontSize;


    root.style.setProperty(
      "--conversation-max-width",
      conversationWidths[
        messageWidth
      ] ||
        conversationWidths
          .comfortable
    );


    root.style.setProperty(
      "--composer-max-width",
      composerWidths[
        messageWidth
      ] ||
        composerWidths
          .comfortable
    );


    root.style.setProperty(
      "--code-font-size",
      codeSizes[
        codeFontSize
      ] ||
        codeSizes.normal
    );
  }, [
    settings.messageWidth,
    settings.interfaceDensity,
    settings.codeFontSize,
  ]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    let cancelled = false;
    let lastAttemptAt = 0;

    async function refreshStatus(force = false) {
      const now = Date.now();

      if (!force && now - lastAttemptAt < 30000) {
        return;
      }

      lastAttemptAt = now;

      try {
        const response = await fetch("/api/openrouter/status", {
          cache: "no-store",
        });

        const data = await response.json().catch(() => ({}));

        if (cancelled) return;

        setOpenRouterStatus(
          response.ok
            ? { loading: false, ...data }
            : {
                loading: false,
                ok: false,
                error: data?.error || "Status unavailable",
              }
        );
      } catch (error) {
        if (!cancelled) {
          setOpenRouterStatus({
            loading: false,
            ok: false,
            error: error?.message || "Status unavailable",
          });
        }
      }
    }

    // Jedna provjera pri pokretanju.
    refreshStatus(true);

    // Ponovno provjeri samo kad se korisnik vrati u aplikaciju
    // ili se mrežna veza ponovno uspostavi.
    const handleFocus = () => refreshStatus(false);
    const handleOnline = () => refreshStatus(true);

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  function applyThemeImmediately(nextDark) {
    const root = document.documentElement;
    const theme = nextDark ? "dark" : "light";
    const background = nextDark ? "#0a0a0a" : "#ffffff";

    /*
     * Theme changes should be instantaneous.
     * Normal hover/focus transitions return immediately afterwards.
     */
    root.classList.add("theme-switching");

    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    root.style.backgroundColor = background;

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", background);

    window.clearTimeout(window.__codaroxThemeSwitchTimer);

    window.__codaroxThemeSwitchTimer = window.setTimeout(() => {
      root.classList.remove("theme-switching");
    }, 80);
  }

  function updateSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));

    if (key === "theme") {
      const nextDark =
        value === "system"
          ? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false)
          : value === "dark";

      /*
       * Ne čekamo React effect.
       * Tema se mijenja u istom kliku.
       */
      applyThemeImmediately(nextDark);
      setDark(nextDark);
    }
  }

  function toggleTheme() {
    const next = !dark;

    applyThemeImmediately(next);
    setDark(next);

    setSettings((current) => ({
      ...current,
      theme: next ? "dark" : "light",
    }));
  }

  return {
    settings,
    setSettings,
    updateSetting,
    dark,
    setDark,
    toggleTheme,
    settingsOpen,
    setSettingsOpen,
    settingsView,
    setSettingsView,
    openRouterStatus,
  };
}
