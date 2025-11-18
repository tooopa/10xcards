import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Clock, DollarSign, Star } from "lucide-react";
import type { ModelSelectorProps, AIModel } from "../../lib/validation/generate-ai";
import { cn } from "@/lib/utils";

interface ModelCardProps {
  model: AIModel;
  isSelected: boolean;
  estimatedCost: number;
  onSelect: () => void;
}

function ModelCard({ model, isSelected, estimatedCost, onSelect }: ModelCardProps) {
  const estimatedTokens = Math.ceil(estimatedCost / (model.cost_per_1m_tokens / 1_000_000));

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary border-primary"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">{model.name}</h3>
              {model.is_recommended && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="mr-1 h-3 w-3" />
                  Polecany
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{model.provider}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono">${model.cost_per_1m_tokens}/M</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span>{model.timeout_seconds}s</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-muted-foreground" />
            <span>Szybki</span>
          </div>
        </div>

        {estimatedCost > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Szacowany koszt:</span>
              <span className="font-semibold text-primary">${estimatedCost.toFixed(4)}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">~{estimatedTokens.toLocaleString()} tokenów</div>
          </div>
        )}

        {model.description && <p className="text-xs text-muted-foreground mt-2">{model.description}</p>}
      </CardContent>
    </Card>
  );
}

export function ModelSelector({ selectedModel, onModelChange, sourceTextLength, availableModels }: ModelSelectorProps) {
  // Calculate estimated cost for selected model
  const selectedModelData = availableModels.find((m) => m.id === selectedModel);
  const estimatedCost =
    selectedModelData && sourceTextLength > 0
      ? (sourceTextLength / 4 / 1_000_000) * selectedModelData.cost_per_1m_tokens
      : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Model AI *</label>
        {estimatedCost > 0 && (
          <div className="text-sm text-muted-foreground">
            Szacowany koszt: <span className="font-semibold text-primary">${estimatedCost.toFixed(4)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {availableModels.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            isSelected={selectedModel === model.id}
            estimatedCost={selectedModel === model.id ? estimatedCost : 0}
            onSelect={() => onModelChange(model.id)}
          />
        ))}
      </div>

      {availableModels.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Zap className="mx-auto h-8 w-8 mb-2" />
          <p>Brak dostępnych modeli AI</p>
        </div>
      )}
    </div>
  );
}
