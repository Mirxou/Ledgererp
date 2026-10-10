import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/QueryProvider";
import { ErrorBoundary } from "@/components/error-boundary";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { OfflineIndicator } from "@/components/offline-indicator";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#10b981" },
    { media: "(prefers-color-scheme: dark)", color: "#10b981" },
  ],
};

export const metadata: Metadata = {
  title: "Ledgererp",
  description: "منصة الفواتير والضمان لتجارة Pi Network الآمنة",
  keywords: ["Ledgererp", "فواتير", "ضمان", "Escrow", "Commerce", "Pi Network", "تاجر", "فاتورة"],
  authors: [{ name: "Ledgererp" }],
  openGraph: {
    title: "Ledgererp",
    description: "منصة الفواتير والضمان لتجارة Pi Network الآمنة",
    siteName: "Ledgererp",
    type: "website",
    locale: "ar_DZ",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ledgererp",
    description: "منصة الفواتير والضمان لتجارة Pi Network الآمنة",
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10b981" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="antialiased bg-background text-foreground" style={{ fontFamily: "'Cairo', system-ui, -apple-system, sans-serif" }}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <QueryProvider>
            <ErrorBoundary>
              <OfflineIndicator />
              {children}
            </ErrorBoundary>
          </QueryProvider>
        </ThemeProvider>
        <ServiceWorkerRegistrar />
        <Toaster />
      </body>
    </html>
  );
}