"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AppSettingsDTO } from "@/lib/dto";
import { defaultMinJalaliYear } from "@/lib/dates";
import { DEFAULT_APP_SETTINGS } from "@/lib/app-settings";

type AppSettingsContextValue = AppSettingsDTO & {
  loading: boolean;
  refresh: () => Promise<void>;
};

const defaultSettings: AppSettingsDTO = {
  minJalaliYear: defaultMinJalaliYear(),
  twoFactorPolicy: "OPTIONAL",
  appName: DEFAULT_APP_SETTINGS.appName,
  appNameShort: DEFAULT_APP_SETTINGS.appNameShort,
  appNameFa: DEFAULT_APP_SETTINGS.appNameFa,
  tagline: DEFAULT_APP_SETTINGS.tagline,
  logoUrl: DEFAULT_APP_SETTINGS.logoUrl,
  iconUrl: DEFAULT_APP_SETTINGS.iconUrl,
  themeColor: DEFAULT_APP_SETTINGS.themeColor,
  updatedAt: new Date(0).toISOString(),
};

const AppSettingsContext = createContext<AppSettingsContextValue>({
  ...defaultSettings,
  loading: true,
  refresh: async () => {},
});

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettingsDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch("/api/settings", { redirect: "manual" });
      const contentType = res.headers.get("content-type") ?? "";
      if (res.ok && contentType.includes("application/json")) {
        setSettings(await res.json());
      }
    } catch {
      /* use defaults when tenant is still provisioning */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const merged = settings ?? defaultSettings;

  return (
    <AppSettingsContext.Provider
      value={{
        ...merged,
        loading,
        refresh: load,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
