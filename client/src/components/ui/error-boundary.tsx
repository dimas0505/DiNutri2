import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryState {
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: undefined };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <Alert variant="destructive" className="max-w-md mx-auto mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ocorreu um erro</AlertTitle>
          <AlertDescription>
            Algo deu errado ao processar o formulário. Tente recarregar a página.
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Recarregar Página
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}