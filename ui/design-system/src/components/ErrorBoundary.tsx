import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    correlationId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        correlationId: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, correlationId: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Attempt to extract correlationId if we embed it in our custom API Errors
        let correlationId = "unknown";
        const errorMsg = error.message || "";
        const match = errorMsg.match(/\[Correlation: ([^\]]+)\]/);
        if (match && match[1]) {
            correlationId = match[1];
        }

        this.setState({ correlationId });

        console.error("[ErrorBoundary] Caught UI exception:", {
            message: error.message,
            correlationId,
            stack: errorInfo.componentStack
        });
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div className="p-4 rounded border border-red-200 bg-red-50 text-red-900 font-sans text-sm">
                    <h3 className="font-semibold mb-2">Something went wrong.</h3>
                    <p className="mb-1 text-red-700">Message: {this.state.error?.message}</p>
                    {this.state.correlationId && this.state.correlationId !== "unknown" && (
                        <p className="text-xs text-red-500 font-mono mt-2 opacity-70">
                            Correlation ID: {this.state.correlationId}
                        </p>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
