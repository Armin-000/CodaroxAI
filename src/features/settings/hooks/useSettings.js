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
  const [modelInfo, setModelInfo] = useState(null);
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
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.style.setProperty("--chat-font-size", `${Number(settings.fontSize || 16)}px`);
    localStorage.setItem("theme", dark ? "dark" : "light");
    const favicon = document.querySelector("#app-favicon") || document.querySelector('link[rel="icon"]');
    if (favicon) favicon.href = dark ? "/favicon-dark.svg" : "/favicon-light.svg";
  }, [dark, settings.fontSize]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    let cancelled = false;
    async function refreshStatus() {
      try {
        const response = await fetch("/api/openrouter/status", { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        setOpenRouterStatus(response.ok
          ? { loading: false, ...data }
          : { loading: false, ok: false, error: data?.error || "Status unavailable" });
      } catch (error) {
        if (!cancelled) {
          setOpenRouterStatus({ loading: false, ok: false, error: error?.message || "Status unavailable" });
        }
      }
    }
    refreshStatus();
    const timer = window.setInterval(refreshStatus, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => data && setModelInfo(data))
      .catch(() => {});
  }, []);

  function updateSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
    if (key === "theme") {
      if (value === "system") {
        setDark(window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);
      } else {
        setDark(value === "dark");
      }
    }
  }

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    setSettings((current) => ({ ...current, theme: next ? "dark" : "light" }));
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
    modelInfo,
    openRouterStatus,
  };
}
