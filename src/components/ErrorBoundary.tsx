"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error.message, errorInfo.componentStack);
    console.error("ErrorBoundary details:", {
      componentStack: errorInfo.componentStack,
      errorString: error.toString(),
      errorMessage: error.message,
      errorName: error.name,
      stack: error.stack,
    });
    if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
      console.error("Full error details:", { error: error.toString(), errorInfo });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[200px] items-center justify-center bg-mantle rounded-lg border border-red p-6 text-center">
          <div>
            <h3 className="text-lg font-bold text-red mb-2">Something went wrong</h3>
            <p className="text-sm text-subtext0 mb-4">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue text-on-primary rounded-lg hover:opacity-90 transition-opacity text-sm"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
