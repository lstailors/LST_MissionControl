import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Crash:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-aegis-bg text-aegis-text p-8">
          <div className="text-4xl mb-4">💥</div>
          <h2 className="text-xl font-bold mb-2">حصل خطأ!</h2>
          <p className="text-aegis-text-muted text-sm mb-4 text-center max-w-md">
            {this.state.error?.message || 'خطأ غير معروف'}
          </p>
          <pre className="text-xs text-aegis-text-dim bg-aegis-surface p-4 rounded-lg max-w-lg overflow-auto max-h-40 mb-4" dir="ltr">
            {this.state.error?.stack?.substring(0, 500)}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-2 bg-aegis-primary text-white rounded-xl hover:bg-aegis-primary-hover"
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
