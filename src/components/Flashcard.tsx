import { useState } from "react";
import { cn } from "@/lib/utils";

interface FlashcardProps {
  question: string;
  answer: string;
  className?: string;
}

export function Flashcard({ question, answer, className }: FlashcardProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  const handleToggle = () => setShowAnswer((prev) => !prev);

  return (
    <div
      className={cn(
        "border rounded-lg p-6 shadow-sm cursor-pointer select-none bg-white dark:bg-slate-800",
        className
      )}
      onClick={handleToggle}
    >
      <p className="text-lg font-semibold mb-4">
        {showAnswer ? "Answer" : "Question"}
      </p>
      <p className="text-base text-slate-700 dark:text-slate-200">
        {showAnswer ? answer : question}
      </p>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 italic">
        {showAnswer ? "Click to hide answer" : "Click to reveal answer"}
      </p>
    </div>
  );
}

