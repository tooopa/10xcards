import { useState, useEffect } from "react";
import type { DeckDto } from "@/types";

export function OnboardingGuide() {
  const [isNewUser, setIsNewUser] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    checkUserOnboardingStatus();
  }, []);

  const checkUserOnboardingStatus = async () => {
    try {
      // Check if user has completed onboarding
      const onboardingCompleted = localStorage.getItem('onboarding_completed');
      if (onboardingCompleted === 'true') {
        return;
      }

      // Check user's decks to determine if they're new
      const response = await fetch('/api/v1/decks');
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const decks: DeckDto[] = data.data;

      // If user only has the default "Uncategorized" deck with 0 flashcards, they're likely new
      const hasOnlyDefaultDeck = decks.length === 1 &&
        decks[0].is_default &&
        decks[0].flashcard_count === 0;

      if (hasOnlyDefaultDeck) {
        setIsNewUser(true);
        setIsVisible(true);
      }
    } catch (error) {
      // Silently fail - don't show onboarding if we can't determine status
      console.log('Could not determine onboarding status:', error);
    }
  };

  const dismissOnboarding = () => {
    setIsVisible(false);
    localStorage.setItem('onboarding_completed', 'true');
  };

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      dismissOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isVisible || !isNewUser) {
    return null;
  }

  const currentStepData = onboardingSteps[currentStep];

  return (
    <div className="mb-8 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{currentStepData.icon}</div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {currentStepData.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {onboardingSteps.length}
              </span>
              <div className="flex gap-1">
                {onboardingSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentStep
                        ? 'bg-primary'
                        : index < currentStep
                        ? 'bg-primary/50'
                        : 'bg-border'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={dismissOnboarding}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <p className="text-muted-foreground mb-6">
        {currentStepData.description}
      </p>

      {currentStepData.action && (
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={prevStep}
              className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Previous
            </button>
          )}
          {currentStepData.action}
          <button
            onClick={nextStep}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}

const onboardingSteps = [
  {
    icon: "👋",
    title: "Welcome to 10xCards!",
    description: "You're all set up with your default 'Uncategorized' deck. Let's learn how to create your first flashcards using AI.",
    action: null,
  },
  {
    icon: "🤖",
    title: "Generate AI Flashcards",
    description: "Paste any text content (like textbook excerpts, articles, or notes) and our AI will automatically create high-quality flashcards for you.",
    action: (
      <a
        href="/generate"
        className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        Try AI Generation
      </a>
    ),
  },
  {
    icon: "📚",
    title: "Organize with Decks",
    description: "Create custom decks to organize your flashcards by subject, topic, or course. Each deck can have its own tags for better organization.",
    action: null,
  },
  {
    icon: "🏷️",
    title: "Use Tags for Better Search",
    description: "Add tags to your flashcards to make them easier to find. Tags are specific to each deck and help you filter and organize your content.",
    action: null,
  },
  {
    icon: "🎯",
    title: "Start Learning",
    description: "Once you have flashcards, you can start reviewing them. Use the search and filter features to focus on specific topics.",
    action: null,
  },
];
