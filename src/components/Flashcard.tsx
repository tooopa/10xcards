import { useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface FlashcardProps {
  question: string;
  answer: string;
  className?: string;
}

export function Flashcard({ question, answer, className }: FlashcardProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  const handleToggle = () => setShowAnswer((prev) => !prev);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <div
      className={cn(
        "cursor-pointer select-none rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm transition-colors",
        className
      )}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <p className="heading-sm mb-4">{showAnswer ? "Answer" : "Question"}</p>
      <p className="body-base text-foreground">{showAnswer ? answer : question}</p>
      <p className="body-sm mt-4 italic text-muted-foreground">
        {showAnswer ? "Click to hide answer" : "Click to reveal answer"}
      </p>
    </div>
  );
}
