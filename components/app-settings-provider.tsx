"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AppSettingsDTO } from "@/lib/dto";
import { defaultMinJalaliYear } from "@/lib/dates";

type AppSettingsContextValue = {
  minJalaliYear: number;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AppSettingsContext = createContext<AppSettingsContextValue>({
  minJalaliYear: defaultMinJalaliYear(),
  loading: true,
  refresh: async () => {},
});

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettingsDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        setSettings(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AppSettingsContext.Provider
      value={{
        minJalaliYear: settings?.minJalaliYear ?? defaultMinJalaliYear(),
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
