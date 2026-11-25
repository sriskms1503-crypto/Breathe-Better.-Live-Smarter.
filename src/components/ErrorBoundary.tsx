import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('AIRWISE UI ErrorBoundary caught error:', error, info.componentStack);
    }
  }

  private handleRecover = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="mx-auto my-12 max-w-lg rounded-xl border border-amber-200 bg-white p-6 text-center shadow-xs"
        >
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-600" aria-hidden="true" />
          <h2 className="mt-3 font-display text-lg font-bold text-[#102A43]">
            Unable to render this view
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            An unexpected display error occurred. Your local preferences remain safe.
          </p>
          <button
            type="button"
            onClick={this.handleRecover}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#102A43] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1a3f63]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
