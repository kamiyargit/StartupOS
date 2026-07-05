import { Vazirmatn } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import { SessionProvider } from "@/components/session-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemedToaster } from "@/components/themed-toaster";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-vazirmatn",
  weight: "variable",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cuty Expenses",
  description: "مدیریت هزینه‌ها و آرشیو صورتجلسات",
  robots: { index: false, follow: false, nocache: true, noarchive: true },
  applicationName: "پنل کیوتی",
  appleWebApp: { capable: true, title: "پنل کیوتی", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('cuty-theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full overflow-x-hidden bg-slate-50 font-sans text-slate-900 antialiased dark:bg-gh-canvas dark:text-gh-fg">
        <ThemeProvider>
          <SessionProvider>
            <div className="pwa-root">{children}</div>
            <ThemedToaster />
            <PwaRegister />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
