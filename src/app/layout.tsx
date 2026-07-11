import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/QueryProvider";

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
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="beforeInteractive"
        />
      </head>
      <body
        className="font-[Cairo,system-ui,-apple-system,sans-serif] antialiased bg-background text-foreground"
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