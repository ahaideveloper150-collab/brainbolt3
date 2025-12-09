"use client";

import { useState } from "react";
import ConceptBoosterForm from "@/components/ConceptBoosterForm";
import ConceptBoosterDisplay from "@/components/ConceptBoosterDisplay";
import { ErrorBoundary } from "@/components/ErrorBoundary";

type Mode = "idle" | "loading" | "active";

interface ConceptBoosterResponse {
  status: "OK" | "ERROR";
  step: string;
  content: any;
  metadata?: {
    learning_level: string;
    topic: string;
    tokens_estimate: number;
  };
}

interface ErrorResponse {
  error: string;
  error_code?: string;
  retry_after?: number;
}

export default function ConceptBoosterPage() {
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState<string>("");
  const [learningLevel, setLearningLevel] = useState<string>("");
  const [model, setModel] = useState<string>("auto");
  const [currentStep, setCurrentStep] = useState<string>("");
  const [currentContent, setCurrentContent] = useState<any>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const handleStart = async (data: { topic: string; learning_level: string; model: string }) => {
    setTopic(data.topic);
    setLearningLevel(data.learning_level);
    setModel(data.model);
    setMode("loading");
    setError(null);
    setCurrentStep("diagnostic");
    setCurrentContent(null);
    setConversationHistory([]);

    try {
      const res = await fetch("/api/concept-booster", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: data.topic,
          learning_level: data.learning_level,
          step: "diagnostic",
          model: data.model,
        }),
      });

      if (!res.ok) {
        const errorData: ErrorResponse = await res.json().catch(() => ({ error: "Failed to start learning" }));
        throw new Error(errorData.error || "Failed to start learning");
      }

      const responseData: ConceptBoosterResponse = await res.json();
      setCurrentContent(responseData.content);
      setCurrentStep(responseData.step);
      setMode("active");
    } catch (err) {
      console.error("Concept Booster error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setMode("idle");
    }
  };

  const handleDiagnosticSubmit = async (answers: Array<{ question: string; answer: string }>) => {
    setMode("loading");
    setError(null);

    try {
      const res = await fetch("/api/concept-booster", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          learning_level: learningLevel,
          step: "explanation",
          diagnostic_answers: answers.length > 0 ? answers : undefined,
          skip_diagnostic: answers.length === 0,
          model,
        }),
      });

      if (!res.ok) {
        const errorData: ErrorResponse = await res.json().catch(() => ({ error: "Failed to generate explanation" }));
        throw new Error(errorData.error || "Failed to generate explanation");
      }

      const responseData: ConceptBoosterResponse = await res.json();
      setCurrentContent(responseData.content);
      setCurrentStep(responseData.step);
      setMode("active");
    } catch (err) {
      console.error("Concept Booster error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setMode("active");
    }
  };

  const handleDoubtSubmit = async (doubt: string) => {
    setMode("loading");
    setError(null);

    try {
      const res = await fetch("/api/concept-booster", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          learning_level: learningLevel,
          step: "ask_doubts",
          doubt: doubt.trim() || undefined,
          model,
        }),
      });

      if (!res.ok) {
        const errorData: ErrorResponse = await res.json().catch(() => ({ error: "Failed to process doubt" }));
        throw new Error(errorData.error || "Failed to process doubt");
      }

      const responseData: ConceptBoosterResponse = await res.json();
      setCurrentContent(responseData.content);
      setCurrentStep(responseData.step);
      setMode("active");
    } catch (err) {
      console.error("Concept Booster error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setMode("active");
    }
  };

  const handleUnderstandingSubmit = async (answers: Array<{ question: string; answer: string }>) => {
    setMode("loading");
    setError(null);

    try {
      const res = await fetch("/api/concept-booster", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          learning_level: learningLevel,
          step: answers.length > 0 ? "check_understanding" : "practice",
          understanding_answers: answers.length > 0 ? answers : undefined,
          model,
        }),
      });

      if (!res.ok) {
        const errorData: ErrorResponse = await res.json().catch(() => ({ error: "Failed to process" }));
        throw new Error(errorData.error || "Failed to process");
      }

      const responseData: ConceptBoosterResponse = await res.json();
      setCurrentContent(responseData.content);
      setCurrentStep(responseData.step);
      setMode("active");
    } catch (err) {
      console.error("Concept Booster error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setMode("active");
    }
  };

  const handlePracticeSubmit = async (answer: string) => {
    setMode("loading");
    setError(null);

    try {
      const res = await fetch("/api/concept-booster", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          learning_level: learningLevel,
          step: "feedback",
          user_response: answer,
          conversation_history: conversationHistory,
          model,
        }),
      });

      if (!res.ok) {
        const errorData: ErrorResponse = await res.json().catch(() => ({ error: "Failed to get feedback" }));
        throw new Error(errorData.error || "Failed to get feedback");
      }

      const responseData: ConceptBoosterResponse = await res.json();
      setCurrentContent(responseData.content);
      setCurrentStep(responseData.step);
      setMode("active");
    } catch (err) {
      console.error("Concept Booster error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setMode("active");
    }
  };

  const handleReset = () => {
    setMode("idle");
    setError(null);
    setTopic("");
    setLearningLevel("");
    setCurrentStep("");
    setCurrentContent(null);
    setConversationHistory([]);
  };

  const getLoadingMessage = () => {
    if (currentStep === "diagnostic") return "Preparing diagnostic questions...";
    if (currentStep === "explanation") return "Generating personalized explanation...";
    if (currentStep === "ask_doubts") return "Preparing doubt section...";
    if (currentStep === "check_understanding") return "Preparing understanding check...";
    if (currentStep === "practice") return "Creating practice task...";
    if (currentStep === "feedback") return "Analyzing your response...";
    return "Processing...";
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Premium Header */}
          <header className="mb-12 text-center">
            <div className="inline-flex items-center justify-center gap-3 mb-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
                Concept Booster
              </h1>
            </div>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Adaptive learning engine that personalizes explanations to your level. Get diagnostic questions, layered explanations, and practice with feedback.
            </p>
          </header>

          <div className="space-y-8">
            {/* Form Section */}
            {mode === "idle" && (
              <div className="rounded-2xl border-2 border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-xl p-8">
                <ConceptBoosterForm onSubmit={handleStart} isLoading={false} />
                {error && (
                  <div className="mt-6 rounded-xl border-2 border-rose-200 bg-rose-50/50 p-4">
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-5 w-5 text-rose-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-sm font-medium text-rose-800">{error}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Loading Animation */}
            {mode === "loading" && (
              <div className="rounded-2xl border-2 border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-xl p-16">
                <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl animate-pulse"></div>
                    <svg
                      className="relative h-20 w-20 animate-spin text-green-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-slate-900 mb-2">
                      {getLoadingMessage()}
                    </p>
                    <p className="text-sm text-slate-500">
                      AI is working on your personalized learning experience...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Active Learning Flow */}
            {mode === "active" && currentContent && (
              <div className="space-y-6">
                <div className="flex items-center justify-between rounded-xl border-2 border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-lg px-6 py-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{topic}</h2>
                    <p className="text-sm text-slate-600 mt-1">{learningLevel}</p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Start New Topic
                  </button>
                </div>

                {error && (
                  <div className="rounded-xl border-2 border-rose-200 bg-rose-50/50 p-4">
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-5 w-5 text-rose-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-sm font-medium text-rose-800">{error}</p>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border-2 border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-xl p-8">
                  <ConceptBoosterDisplay
                    step={currentStep}
                    content={currentContent}
                    topic={topic}
                    learningLevel={learningLevel}
                    onDiagnosticSubmit={handleDiagnosticSubmit}
                    onUnderstandingSubmit={handleUnderstandingSubmit}
                    onPracticeSubmit={handlePracticeSubmit}
                    onDoubtSubmit={handleDoubtSubmit}
                    isLoading={false}
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
