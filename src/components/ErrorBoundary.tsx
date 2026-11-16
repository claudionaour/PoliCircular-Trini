import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let displayMessage = error.message || 'Ocurrió un error inesperado en la plataforma.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string; path?: string };
      if (parsed?.error) {
        displayMessage = `Error de acceso a datos (${parsed.operationType || 'operación'}): ${parsed.error}`;
      }
    } catch {
      // No JSON
    }
    return { hasError: true, message: displayMessage };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('PoliCircular ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B1E33] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-3xl bg-[#102C49] border border-[#244B73] p-8 shadow-sm text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-[#2A2015] border border-[#F28C28]/40 text-[#FFA94D] flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="font-display text-xl font-bold text-white">
              Algo interrumpió esta vista
            </h1>
            <p className="text-sm text-slate-200 leading-relaxed">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F28C28] px-5 py-2.5 text-sm font-bold text-[#0B1E33] hover:bg-[#FFA242]"
            >
              <RefreshCw className="h-4 w-4" />
              Recargar PoliCircular
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
