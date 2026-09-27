"use client";

import React, { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
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
    return { hasError: true, error: error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[40vh] flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-0 shadow-lg">
            <CardContent className="pt-8 pb-6 text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold">حدث خطأ غير متوقع</h2>
                <p className="text-xs text-muted-foreground mt-1">حدث خطأ أثناء عرض هذا المحتوى</p>
              </div>
              {this.state.error && (
                <div className="bg-muted/50 rounded-lg p-3 text-left">
                  <p className="text-[11px] font-mono text-red-500/80 break-all" dir="ltr">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <Button
                onClick={this.handleReset.bind(this)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
              >
                <RefreshCw className="h-4 w-4 ml-2" />
                إعادة المحاولة
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
