import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      const isNotFound =
        this.state.error?.message?.includes("404") ||
        this.state.error?.message?.includes("not found");

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
          <div className="p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <AlertTriangle className="h-10 w-10 text-yellow-600" />
          </div>
          <h2 className="text-xl font-semibold">
            {isNotFound
              ? "This content is no longer available"
              : "Something went wrong"}
          </h2>
          <p className="text-muted-foreground max-w-md">
            {isNotFound
              ? "The content you were looking for has been removed or is no longer accessible."
              : "An unexpected error occurred. Please try going back or refreshing the page."}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/";
              }}
            >
              Go Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
