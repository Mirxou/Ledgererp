import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Ledgererp — Pi Network Security Audit Dashboard",
  description:
    "Comprehensive security audit report for Ledgererp, a non-custodial ERP system built for Pi Network. Analyzing 67 files, 4,800+ lines of code across backend and frontend.",
  keywords: [
    "Pi Network", "Ledgererp", "Security Audit", "ERP", "Non-Custodial",
    "Pi Browser", "Stellar", "Blockchain", "FastAPI", "develop.pinet.com",
  ],
  authors: [{ name: "Ledgererp Security Team", url: "https://github.com/Mirxou/Ledgererp" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>",
  },
  openGraph: {
    title: "Ledgererp Security Audit Report",
    description: "Pi Network ERP Security Audit — 114 issues found, 23 critical. Comprehensive analysis with actionable recommendations.",
    url: "https://ledgererp.online",
    siteName: "Ledgererp",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ledgererp Security Audit Report",
    description: "Pi Network ERP Security Audit — 114 issues, 23 critical vulnerabilities detected.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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