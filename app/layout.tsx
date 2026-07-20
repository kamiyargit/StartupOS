import { Vazirmatn } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import { SessionProvider } from "@/components/session-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemedToaster } from "@/components/themed-toaster";
import { AppSettingsProvider } from "@/components/app-settings-provider";
import { isControlPlaneAsync } from "@/lib/deployment";
import { getAppSettings } from "@/lib/app-settings";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-vazirmatn",
  weight: "variable",
  display: "swap",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  if (await isControlPlaneAsync()) {
    return {
      title: "Kartin Setup",
      description: "Cloud installation portal for Kartin",
      robots: { index: false, follow: false },
    };
  }

  const settings = await getAppSettings();
  const description =
    settings.tagline ?? "سیستم مدیریت هوشمند کسب‌وکار";

  return {
    title: settings.appName,
    description,
    robots: { index: false, follow: false, nocache: true, noarchive: true },
    applicationName: settings.appName,
    appleWebApp: { capable: true, title: settings.appNameShort, statusBarStyle: "default" },
    formatDetection: { telephone: false },
    icons: {
      icon: [{ url: "/favicon.ico", sizes: "any" }],
      apple: settings.iconUrl ?? "/icons/apple-touch-icon.png",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#534AB7" },
    { media: "(prefers-color-scheme: dark)", color: "#1e1b4b" },
  ],
};

const themeInitScript = `(function(){try{var k='kartin-theme',l='cuty-theme',t=localStorage.getItem(k)||localStorage.getItem(l);var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${vazirmatn.className} min-h-full overflow-x-hidden bg-slate-50 text-slate-900 antialiased dark:bg-gh-canvas dark:text-gh-fg`}
      >
        <ThemeProvider>
          <SessionProvider>
            <AppSettingsProvider>
              <div className="pwa-root">{children}</div>
              <ThemedToaster />
              <PwaRegister />
            </AppSettingsProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
