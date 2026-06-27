"use client";

import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-600">頁面發生錯誤，請重新整理</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-3 rounded-md border border-red-300 px-4 py-1.5 text-xs text-red-600 hover:bg-red-100"
            >
              重試
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
