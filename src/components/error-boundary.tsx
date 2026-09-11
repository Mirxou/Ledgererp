"use client";

import React from "react";
import { Shield, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary for Ledgererp.
 * Catches runtime errors and displays a recovery UI.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const Fallback = this.props.fallback;
        return <Fallback error={this.state.error} reset={this.handleReset} />;
      }

      return <DefaultErrorFallback error={this.state.error} reset={this.handleReset} />;
    }

    return this.props.children;
  }
}

/** Default error fallback UI */
function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background" dir="rtl">
      <Card className="max-w-md w-full border-0 shadow-xl">
        <CardContent className="pt-8 pb-6 text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <Shield className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold">حدث خطأ غير متوقع</h2>
            <p className="text-xs text-muted-foreground mt-1">
              حدث خطأ أثناء تشغيل التطبيق. يُرجى المحاولة مرة أخرى.
            </p>
          </div>
          {process.env.NODE_ENV === "development" && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-right">
              <p className="text-[10px] font-mono text-red-600 dark:text-red-400 break-all leading-relaxed">
                {error.message}
              </p>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <Button onClick={reset} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              <RefreshCw className="h-3.5 w-3.5 ml-1.5" />
              إعادة المحاولة
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="text-xs">
              إعادة تحميل الصفحة
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
