import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Cairo } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/QueryProvider";

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
  title: "Ledgererp",
  description:
    "منصة الفواتير والضمان لتجارة Pi Network الآمنة",
  keywords: [
    "Pi Network",
    "Ledgererp",
    "فواتير",
    "ضمان",
    "Escrow",
    "Commerce",
    "Mainnet",
    "تاجر",
    "فاتورة",
  ],
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
      <head>
        {/* Pi Network SDK — loaded before interactive so window.Pi is
            available when client components hydrate. */}
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={`${cairo.variable} ${geistMono.variable} font-[family-name:var(--font-cairo),var(--font-geist-mono),system-ui,sans-serif] antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
          </QueryProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}