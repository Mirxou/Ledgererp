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
  title: "Ledgererp — دراسة معمقة: إكوسيستم Pi والتجارة الإلكترونية",
  description:
    "دراسة معمقة من منظور الدكتور نيكولاس كوكاليس حول إكوسيستم شبكة Pi وأهمية تطبيقات الفواتير والضمان للتجارة الإلكترونية.",
  keywords: [
    "Pi Network", "Ledgererp", "دراسة إكوسيستم", "فواتير", "ضمان",
    "Pi Browser", "Escrow", "Commerce", "Mainnet", "develop.pinet.com",
    "Security Audit", "أمان",
  ],
  authors: [{ name: "Ledgererp", url: "https://github.com/Mirxou/Ledgererp" }],
  icons: {
    icon: "/pi-shield-logo.svg",
    apple: "/apple-touch-icon.svg",
  },
  openGraph: {
    title: "دراسة إكوسيستم Pi — Ledgererp",
    description: "دراسة معمقة حول إكوسيستم Pi Network وأهمية تطبيقات الفواتير والضمان التجاري.",
    url: "https://ledgererp.online",
    siteName: "Ledgererp",
    type: "website",
    locale: "ar_DZ",
  },
  twitter: {
    card: "summary_large_image",
    title: "دراسة إكوسيستم Pi — Ledgererp",
    description: "دراسة معمقة حول إكوسيستم Pi Network وتطبيقات التجارة الإلكترونية.",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ledgererp — Pi Study",
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