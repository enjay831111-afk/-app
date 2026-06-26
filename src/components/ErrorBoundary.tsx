import React, { Component, ReactNode } from 'react';
import { RefreshCw, AlertOctagon } from 'lucide-react';

interface Props   { children: ReactNode; fallbackLabel?: string; }
interface State   { hasError: boolean; errorMsg: string; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error?.message || '未知錯誤' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 min-h-[200px]">
          <AlertOctagon className="h-10 w-10 text-rose-400" />
          <div>
            <p className="text-sm font-bold text-rose-700">
              {this.props.fallbackLabel || '此區塊發生錯誤，其他功能不受影響。'}
            </p>
            <p className="text-xs text-rose-500 mt-1 font-mono">{this.state.errorMsg}</p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, errorMsg: '' })}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition cursor-pointer active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            重新載入此區塊
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
