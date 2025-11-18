import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, X, AlertCircle, CheckCircle } from "lucide-react";
import type { GenerationProgressProps, GenerationStep } from "../../lib/validation/generate-ai";

const STEP_MESSAGES: Record<GenerationStep, string> = {
  validating: "Sprawdzanie danych wejściowych...",
  sending_request: "Wysyłanie żądania do AI...",
  waiting_for_ai: "Oczekiwanie na odpowiedź AI...",
  parsing_response: "Przetwarzanie odpowiedzi...",
  processing_suggestions: "Przygotowywanie sugestii fiszek...",
  complete: "Generowanie zakończone pomyślnie!",
};


export function GenerationProgress({
  isVisible,
  currentStep,
  progress,
  estimatedTimeRemaining,
  onCancel,
}: GenerationProgressProps) {
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, startTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isComplete = currentStep === "complete";
  const hasError = currentStep === "complete" && progress < 100; // Simplified error detection

  return (
    <Dialog open={isVisible} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : hasError ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
            Generowanie fiszek z AI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Postęp</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress
              value={progress}
              className={`h-2 ${isComplete ? "[&>div]:bg-green-600" : hasError ? "[&>div]:bg-destructive" : ""}`}
            />
          </div>

          {/* Current Step */}
          <div className="text-center">
            <p className="text-sm font-medium mb-1">{STEP_MESSAGES[currentStep]}</p>
            {!isComplete && (
              <p className="text-xs text-muted-foreground">Pozostały czas: ~{formatTime(estimatedTimeRemaining)}</p>
            )}
          </div>

          {/* Time Information */}
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 p-3 rounded">
            <span>Czas trwania: {formatTime(Math.floor(elapsedTime / 1000))}</span>
            {estimatedTimeRemaining > 0 && !isComplete && <span>Pozostało: {formatTime(estimatedTimeRemaining)}</span>}
          </div>

          {/* Error State */}
          {hasError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Wystąpił błąd podczas generowania fiszek. Spróbuj ponownie lub skontaktuj się z pomocą techniczną.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!isComplete && !hasError && (
              <Button variant="outline" onClick={onCancel} className="flex-1" disabled={currentStep === "validating"}>
                <X className="mr-2 h-4 w-4" />
                Anuluj
              </Button>
            )}

            {isComplete && (
              <Button onClick={() => window.location.reload()} className="w-full">
                <CheckCircle className="mr-2 h-4 w-4" />
                Kontynuuj
              </Button>
            )}

            {hasError && (
              <div className="flex gap-2 w-full">
                <Button variant="outline" onClick={onCancel} className="flex-1">
                  Zamknij
                </Button>
                <Button onClick={() => window.location.reload()} className="flex-1">
                  Spróbuj ponownie
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
