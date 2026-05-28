// ============================================================
// ErrorBoundary — Catches React render errors gracefully
// Prevents full app white-screen on component crashes
// ============================================================

import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Allow custom fallback UI via props
      if (this.props.fallback) {
        return this.props.fallback({ error: this.state.error, reset: this.handleReset });
      }

      return (
        <div className="flex-1 flex items-center justify-center py-24 px-4">
          <div className="bg-surface-lowest rounded-lg ghost-border clinical-shadow p-10 max-w-md text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-200">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="font-display text-2xl font-bold text-on-surface mb-3">
              Something went wrong
            </h2>
            <p className="text-sm text-on-surface/60 mb-8 leading-relaxed">
              An unexpected error occurred. Please try refreshing the page or navigating back.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary py-3 px-6 text-sm"
              >
                Refresh Page
              </button>
              <button
                onClick={this.handleReset}
                className="btn-secondary py-3 px-6 text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
