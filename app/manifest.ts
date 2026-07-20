import { getAppSettings } from "@/lib/app-settings";
import type { MetadataRoute } from "next";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getAppSettings();
  const icon = settings.iconUrl ?? "/icons/icon-512.png";

  return {
    name: settings.appName,
    short_name: settings.appNameShort,
    description: settings.tagline ?? "سیستم مدیریت هوشمند کسب‌وکار",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    lang: "fa",
    dir: "rtl",
    background_color: "#000000",
    theme_color: settings.themeColor,
    icons: [
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { src: icon, sizes: "192x192", type: "image/png" },
      { src: icon, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: icon, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
