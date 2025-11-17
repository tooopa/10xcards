import { useState } from "react";
import { AlertCircle, RefreshCw, Wifi, Shield, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ErrorNotificationProps {
  message: string;
  error?: Error | { status?: number; code?: string };
  onRetry?: () => void;
  showRetry?: boolean;
}

export function ErrorNotification({
  message,
  error,
  onRetry,
  showRetry = false
}: ErrorNotificationProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const getErrorIcon = () => {
    if (!error) return <AlertCircle className="h-4 w-4" />;

    // Check for specific error types
    const errorStatus = (error as any).status;
    const errorCode = (error as any).code || (error as any).name;

    if (errorStatus === 401 || errorStatus === 403 || errorCode === 'auth_error') {
      return <Shield className="h-4 w-4" />;
    }

    if (errorStatus === 429 || errorCode === 'rate_limit') {
      return <AlertTriangle className="h-4 w-4" />;
    }

    if (errorStatus >= 500 || errorCode === 'network_error' || errorCode === 'timeout') {
      return <Wifi className="h-4 w-4" />;
    }

    return <AlertCircle className="h-4 w-4" />;
  };

  const getErrorTitle = () => {
    if (!error) return "Error";

    const errorStatus = (error as any).status;
    const errorCode = (error as any).code || (error as any).name;

    if (errorStatus === 400) return "Invalid Request";
    if (errorStatus === 401) return "Authentication Required";
    if (errorStatus === 403) return "Access Denied";
    if (errorStatus === 404) return "Not Found";
    if (errorStatus === 409) return "Conflict";
    if (errorStatus === 429) return "Too Many Requests";
    if (errorStatus >= 500) return "Server Error";

    if (errorCode === 'network_error') return "Connection Error";
    if (errorCode === 'timeout') return "Request Timeout";
    if (errorCode === 'auth_error') return "Authentication Error";

    return "Error";
  };

  const getErrorVariant = () => {
    if (!error) return "destructive";

    const errorStatus = (error as any).status;

    if (errorStatus === 401 || errorStatus === 403) return "destructive";
    if (errorStatus === 429 || errorStatus >= 500) return "default"; // Less alarming for temporary issues

    return "destructive";
  };

  const getRetryText = () => {
    if (!error) return "Try Again";

    const errorStatus = (error as any).status;

    if (errorStatus === 429) return "Retry Later";
    if (errorStatus >= 500) return "Retry";
    if (errorStatus === 401) return "Sign In";

    return "Try Again";
  };

  const handleRetry = async () => {
    if (!onRetry) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const shouldShowRetry = showRetry || (error && (error as any).status === 429) || (error && (error as any).status >= 500);

  return (
    <Alert variant={getErrorVariant()}>
      {getErrorIcon()}
      <div className="flex-1">
        <div className="font-medium">{getErrorTitle()}</div>
        <AlertDescription className="mt-1">{message}</AlertDescription>
        {shouldShowRetry && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            className="mt-2 h-8"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? "Retrying..." : getRetryText()}
          </Button>
        )}
      </div>
    </Alert>
  );
}
