import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
    "تقرير تدقيق أمني شامل لنظام Ledgererp ERP غير الحضاني المبني لشبكة Pi Network. تحليل 67 ملفًا و4800+ سطر كود عبر الخادم والواجهة الأمامية.",
  keywords: [
    "Pi Network", "Ledgererp", "تدقيق أمني", "ERP", "غير حضانتي",
    "Pi Browser", "Stellar", "Blockchain", "FastAPI", "develop.pinet.com",
    "Security Audit", "أمان",
  ],
  authors: [{ name: "فريق أمان Ledgererp", url: "https://github.com/Mirxou/Ledgererp" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}