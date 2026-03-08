import { logger } from '../utils/logger';
import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          gap: '12px',
          minHeight: '200px',
          background: 'rgba(255, 0, 0, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 0, 0, 0.2)'
        }}>
          <div style={{ 
            fontSize: '48px',
            opacity: 0.6
          }}>
            💥
          </div>
          <div style={{ 
            color: 'rgba(255, 100, 100, 0.9)', 
            fontSize: '16px',
            textAlign: 'center',
            fontWeight: 600
          }}>
            Что-то пошло не так
          </div>
          <div style={{ 
            color: 'rgba(255, 255, 255, 0.5)', 
            fontSize: '12px',
            textAlign: 'center',
            maxWidth: '300px'
          }}>
            {this.state.error?.message || 'Произошла непредвиденная ошибка'}
          </div>
          <button
            onClick={this.handleReset}
            style={{
              marginTop: '8px',
              padding: '8px 16px',
              background: 'rgba(0, 242, 255, 0.2)',
              border: '1px solid rgba(0, 242, 255, 0.4)',
              borderRadius: '6px',
              color: 'rgba(0, 242, 255, 0.9)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 242, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 242, 255, 0.2)';
            }}
          >
            Попробовать снова
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
