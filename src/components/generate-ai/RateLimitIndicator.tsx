import React, { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Clock, TrendingUp } from "lucide-react";
import type { RateLimitIndicatorProps } from "../../lib/validation/generate-ai";

export function RateLimitIndicator({ rateLimit, onUpgradeClick }: RateLimitIndicatorProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    const updateTimeRemaining = () => {
      const now = Date.now();
      const resetTime = rateLimit.reset_at.getTime();
      const remaining = Math.max(0, resetTime - now);

      if (remaining === 0) {
        setTimeRemaining("00:00:00");
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      setTimeRemaining(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [rateLimit.reset_at]);

  const progressPercentage = (rateLimit.current_count / rateLimit.limit) * 100;
  const isNearLimit = progressPercentage >= 80;
  const isAtLimit = !rateLimit.can_generate;

  return (
    <Card
      className={`transition-colors ${
        isAtLimit ? "border-destructive" : isNearLimit ? "border-[color:var(--color-warning-strong)]" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Limit generacji
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Wykorzystane: {rateLimit.current_count} / {rateLimit.limit}
          </span>
          <span
            className={`font-medium ${
              isAtLimit
                ? "text-destructive"
                : isNearLimit
                  ? "text-[color:var(--color-warning-strong)]"
                  : "text-[color:var(--color-success-strong)]"
            }`}
          >
            {rateLimit.remaining} pozostało
          </span>
        </div>

        <Progress
          value={progressPercentage}
          className={`h-2 ${
            isAtLimit
              ? "[&>div]:bg-destructive"
              : isNearLimit
                ? "[&>div]:bg-[color:var(--color-warning-strong)]"
                : "[&>div]:bg-[color:var(--color-success-strong)]"
          }`}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Reset za: {timeRemaining}</span>
          </div>

          {onUpgradeClick && (
            <Button variant="outline" size="sm" onClick={onUpgradeClick} className="h-7 text-xs">
              <TrendingUp className="mr-1 h-3 w-3" />
              Upgrade
            </Button>
          )}
        </div>

        {isAtLimit && (
          <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
            Osiągnąłeś limit generacji na tę godzinę. Spróbuj ponownie po resecie limitu.
          </div>
        )}

        {isNearLimit && !isAtLimit && (
          <div className="text-xs text-[color:var(--color-warning-strong)] bg-[color:var(--color-warning-soft)] p-2 rounded">
            Zbliżasz się do limitu generacji. Uważaj na wykorzystanie.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
