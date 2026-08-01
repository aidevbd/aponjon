import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Route-level error boundary with heirloom-styled fallback UI.
 * Catches uncaught render errors so the whole app doesn't white-screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught render error:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-dvh flex-col bg-heirloom-bg">
        <main
          id="main-content"
          className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-14"
        >
          <article className="heirloom-page relative w-full max-w-xl overflow-hidden rounded-sm border p-6 sm:p-10">
            <div aria-hidden className="heirloom-texture pointer-events-none absolute inset-0" />
            <div aria-hidden className="heirloom-corner absolute left-0 top-0 h-10 w-10 border-l-2 border-t-2 rounded-tl-sm sm:h-14 sm:w-14" />
            <div aria-hidden className="heirloom-corner absolute right-0 top-0 h-10 w-10 border-r-2 border-t-2 rounded-tr-sm sm:h-14 sm:w-14" />
            <div aria-hidden className="heirloom-corner absolute bottom-0 left-0 h-10 w-10 border-b-2 border-l-2 rounded-bl-sm sm:h-14 sm:w-14" />
            <div aria-hidden className="heirloom-corner absolute bottom-0 right-0 h-10 w-10 border-b-2 border-r-2 rounded-br-sm sm:h-14 sm:w-14" />

            <div className="relative flex flex-col items-center text-center">
              <p className="mt-6 font-display text-5xl leading-none tracking-tight text-heirloom-gold-deep sm:text-6xl">
                ও মা!
              </p>

              <div
                aria-hidden
                className="mt-5 h-px w-24 bg-gradient-to-r from-transparent via-heirloom-gold to-transparent"
              />

              <h1 className="mt-5 font-display text-2xl leading-[1.2] tracking-tight text-heirloom-ink sm:text-3xl">
                একটু অসুবিধা হয়েছে
              </h1>

              <p className="mt-4 max-w-md text-[15px] leading-[1.6] text-heirloom-ink-soft sm:text-base">
                অপ্রত্যাশিত কিছু একটা ঘটে গেছে। চিন্তার কিছু নেই — আপনার তথ্য নিরাপদ আছে। নিচের যেকোনো একটি করে দেখুন।
              </p>

              {import.meta.env.DEV && this.state.error && (
                <pre className="mt-5 w-full max-w-md overflow-x-auto rounded-sm border border-heirloom-line bg-heirloom-cream/[0.5] p-3 text-left text-[11px] text-heirloom-ink-mute">
                  {this.state.error.message}
                </pre>
              )}

              <div className="mt-8 flex w-full max-w-[420px] flex-col gap-3">
                <button
                  onClick={this.handleReset}
                  className="heirloom-btn-primary flex w-full items-center justify-center rounded-sm px-5 py-3.5 text-[15px] font-medium transition-all duration-300"
                >
                  আবার চেষ্টা করি
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex w-full items-center justify-center rounded-sm border border-heirloom-line bg-transparent px-5 py-3.5 text-[14px] font-medium text-heirloom-ink transition-colors hover:bg-heirloom-cream/[0.5]"
                >
                  পেজটি রিলোড করুন
                </button>
                <button
                  onClick={this.handleHome}
                  className="flex w-full items-center justify-center rounded-sm px-5 py-2 text-[13px] text-heirloom-ink-soft transition-colors hover:text-heirloom-gold-deep"
                >
                  হোমপেজে ফিরে যাই
                </button>
              </div>
            </div>
          </article>
        </main>
      </div>
    );
  }
}
