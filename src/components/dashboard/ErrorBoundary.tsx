"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";

/* ════════════════════════════════════════════════════════════════════════════
   ERROR BOUNDARY
   Catches React errors gracefully and shows a friendly Arabic error message.
   ════════════════════════════════════════════════════════════════════════════ */

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleCopyError = () => {
    if (this.state.error) {
      navigator.clipboard.writeText(this.state.error.message + "\n\n" + (this.state.error.stack || ""));
      toast.success("تم نسخ تفاصيل الخطأ");
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback onRetry={this.handleRetry} onCopyError={this.handleCopyError} error={this.state.error} />;
    }

    return this.props.children;
  }
}

/* ════════════════════════════════════════════════════════════════════════════
   ERROR FALLBACK UI
   Beautiful error display with Pi shield sad face.
   ════════════════════════════════════════════════════════════════════════════ */

function ErrorFallback({
  onRetry,
  onCopyError,
  error,
}: {
  onRetry: () => void;
  onCopyError: () => void;
  error: Error | null;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="border-red-200/60 dark:border-red-900/40 overflow-hidden">
          <CardContent className="p-6 sm:p-8 text-center space-y-6">
            {/* Pi Shield with Sad Face */}
            <motion.div
              className="mx-auto w-20 h-20 relative"
              initial={{ rotate: [0, -5, 5, 0] }}
              animate={{ rotate: [0, -3, 3, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                  <linearGradient id="errorShieldGrad" x1="10" y1="5" x2="90" y2="95">
                    <stop stopColor="oklch(0.55 0.20 25)" />
                    <stop offset="1" stopColor="oklch(0.45 0.18 20)" />
                  </linearGradient>
                </defs>
                <path
                  d="M50 5 L90 20 L90 50 C90 72 72 90 50 97 C28 90 10 72 10 50 L10 20 Z"
                  fill="url(#errorShieldGrad)"
                  opacity="0.9"
                />
                {/* Sad Pi symbol */}
                <text x="50" y="60" textAnchor="middle" fontSize="32" fontWeight="bold" fill="white" fontFamily="serif" opacity="0.9">
                  π
                </text>
                {/* Sad face eyes */}
                <circle cx="38" cy="35" r="2.5" fill="white" opacity="0.7" />
                <circle cx="62" cy="35" r="2.5" fill="white" opacity="0.7" />
                {/* Sad mouth */}
                <path d="M40 72 Q50 66 60 72" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
              </svg>
            </motion.div>

            {/* Error message */}
            <div className="space-y-2">
              <motion.h3
                className="text-lg font-bold text-foreground flex items-center justify-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <AlertTriangle className="h-5 w-5 text-red-500" />
                حدث خطأ غير متوقع
              </motion.h3>
              <motion.p
                className="text-sm text-muted-foreground leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                عذراً، حدث خطأ أثناء تحميل التطبيق. يرجى المحاولة مرة أخرى.
              </motion.p>

              {error?.message && (
                <motion.div
                  className="p-3 rounded-lg bg-red-50/70 dark:bg-red-950/20 border border-red-200/40 dark:border-red-900/30 text-right"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ delay: 0.4 }}
                >
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-mono break-words leading-relaxed" dir="ltr">
                    {error.message}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Actions */}
            <motion.div
              className="flex items-center justify-center gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button onClick={onRetry} className="gap-2 font-semibold">
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </Button>
              <Button variant="outline" onClick={onCopyError} className="gap-2">
                <Copy className="h-4 w-4" />
                نسخ الخطأ
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}