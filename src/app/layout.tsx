import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { PiProvider } from "@/lib/pi-context";
import { QueryProvider } from "@/components/QueryProvider";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  title: "Ledgererp — تقرير التدقيق الأمني | Pi Network",
  description:
    "تقرير تدقيق أمني شامل لنظام Ledgererp ERP على شبكة Pi Network. تحليل 67 ملفًا و4800+ سطر كود.",
  keywords: [
    "Pi Network", "Ledgererp", "تدقيق أمني", "ERP", "غير حضانتي",
    "Pi Browser", "Stellar", "Blockchain", "FastAPI", "develop.pinet.com",
    "Security Audit", "أمان",
  ],
  authors: [{ name: "فريق أمان Ledgererp", url: "https://github.com/Mirxou/Ledgererp" }],
  icons: {
    icon: "/pi-shield-logo.svg",
    apple: "/apple-touch-icon.svg",
  },
  openGraph: {
    title: "تقرير التدقيق الأمني — Ledgererp",
    description: "تدقيق أمني لـ Ledgererp على شبكة Pi — 114 مشكلة، 23 حرجة. تحليل شامل مع توصيات قابلة للتنفيذ.",
    url: "https://ledgererp.online",
    siteName: "Ledgererp",
    type: "website",
    locale: "ar_DZ",
  },
  twitter: {
    card: "summary_large_image",
    title: "تقرير التدقيق الأمني — Ledgererp",
    description: "تدقيق Ledgererp الأمني — 114 مشكلة، 23 ثغرة حرجة.",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ledgererp Audit",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} ${geistMono.variable} font-[family-name:var(--font-cairo),var(--font-geist-mono),system-ui,sans-serif] antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <PiProvider>
            <QueryProvider>
              <ServiceWorkerRegistrar />
              {children}
            </QueryProvider>
          </PiProvider>
          <Toaster />
        </ThemeProvider>
        {/* Pi Network SDK — loaded only in Pi Browser */}
        <script
          src="https://sdk.minepi.com/pi-sdk.js"
          async
        />
      </body>
    </html>
  );
}