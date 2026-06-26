import React, { Component, ErrorInfo } from 'react';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './firebase';

// CRITICAL: Define removeLoadingScreen in bundled JS so Vite includes it in production.
// The inline <script type="module"> in index.html is STRIPPED by Vite during build,
// causing the #loading-screen overlay (z-index:9999) to never be removed in .exe builds.
if (typeof window !== 'undefined') {
  (window as any).removeLoadingScreen = () => {
    const loader = document.getElementById('loading-screen');
    const logo = document.querySelector('.index-logo');
    const text = document.querySelector('.loading-text-elem');
    const progress = document.querySelector('.progress-bar-container');

    if (text) (text as HTMLElement).style.opacity = '0';
    if (progress) (progress as HTMLElement).style.opacity = '0';

    setTimeout(() => {
      if (logo) {
        (logo as HTMLElement).style.transition = 'transform 3.0s cubic-bezier(0.25, 1, 0.5, 1)';
        (logo as HTMLElement).style.transform = 'translateY(0)';
      }
      if (loader) {
        loader.style.transition = 'background-color 1.0s ease-out';
        loader.style.backgroundColor = 'transparent';
        loader.style.pointerEvents = 'none';
      }
    }, 500);
  };
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
    // Also inject raw HTML in case React fails entirely
    document.body.innerHTML = `<div style="background:black; color: red; padding: 20px; font-family: monospace; z-index: 999999; position: absolute; inset: 0;"><h2>React Render Error</h2><pre>${error.toString()}</pre><pre>${errorInfo.componentStack}</pre></div>`;
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: 'black', color: 'red', padding: '20px', fontFamily: 'monospace', zIndex: 999999, position: 'absolute', inset: 0 }}>
          <h2>React Render Error</h2>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.errorInfo?.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

try {
  // console.log("[GM3000] Starting React app...");
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  // console.log("[GM3000] Root element found, creating root...");
  const root = createRoot(rootElement);
  // console.log("[GM3000] Root created, rendering app...");
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
  // console.log("[GM3000] App rendered successfully!");
} catch (error: any) {
  // console.error("[GM3000] Error starting app:", error);
  document.body.innerHTML = `<div style="color: red; padding: 20px; font-family: monospace;">Error starting GM-3000: ${error.message}</div>`;
}
