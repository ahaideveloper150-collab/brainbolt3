"use client";

import { useState } from "react";
import FlashcardForm from "@/components/FlashcardForm";
import FlashcardDisplay, { Flashcard } from "@/components/FlashcardDisplay";
import { ErrorBoundary } from "@/components/ErrorBoundary";

type Mode = "idle" | "loading" | "done" | "error";

interface FlashcardResponse {
  status: "OK" | "ERROR";
  flashcards: Flashcard[];
  metadata?: {
    learning_level: string;
    total_cards: number;
    concept_cards: number;
    application_cards: number;
    trick_cards: number;
    tokens_estimate: number;
  };
}

interface ErrorResponse {
  error: string;
  error_code?: string;
  retry_after?: number;
}

export default function FlashcardsPage() {
  const [mode, setMode] = useState<Mode>("idle");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<FlashcardResponse["metadata"]>();

  const handleGenerate = async (data: { content: string; learning_level: string; model: string }) => {
    setMode("loading");
    setError(null);
    setFlashcards([]);
    setMetadata(undefined);

    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: data.content,
          learning_level: data.learning_level,
          model: data.model,
        }),
      });

      if (!res.ok) {
        let errorMessage = "Failed to generate flashcards";
        let errorDetails = "";
        let retryAfter: number | undefined;

        try {
          const errorData: ErrorResponse = await res.json();
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.error_code || "";
          retryAfter = errorData.retry_after;
        } catch {
          errorMessage = res.statusText || errorMessage;
        }

        if (res.status === 429 && retryAfter) {
          errorMessage = `${errorMessage} Please try again in ${retryAfter} seconds.`;
        }

        const fullError = errorDetails ? `${errorMessage} (${errorDetails})` : errorMessage;
        throw new Error(fullError);
      }

      const responseData: FlashcardResponse = await res.json();

      if (!responseData.flashcards || !Array.isArray(responseData.flashcards) || responseData.flashcards.length === 0) {
        throw new Error("Invalid response format from server");
      }

      setFlashcards(responseData.flashcards);
      setMetadata(responseData.metadata);
      setMode("done");
    } catch (err) {
      console.error("Flashcard generation error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
      setMode("error");
    }
  };

  const handleReset = () => {
    setMode("idle");
    setFlashcards([]);
    setError(null);
    setMetadata(undefined);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Premium Header */}
          <header className="mb-12 text-center">
            <div className="inline-flex items-center justify-center gap-3 mb-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg">
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
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
                Flashcard Generator
              </h1>
            </div>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Convert your study material into perfectly structured flashcards optimized for memory. Generate concept, application, and trick cards.
            </p>
          </header>

          <div className="space-y-8">
            {/* Form Section */}
            {mode !== "done" && (
              <div className="rounded-2xl border-2 border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-xl p-8">
                <FlashcardForm onSubmit={handleGenerate} isLoading={mode === "loading"} />
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
                    <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl animate-pulse"></div>
                    <svg
                      className="relative h-20 w-20 animate-spin text-indigo-600"
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
                      Generating your flashcards
                    </p>
                    <p className="text-sm text-slate-500">
                      AI is creating optimized flashcards from your content...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Results Section */}
            {mode === "done" && flashcards.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between rounded-xl border-2 border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-lg px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                      <svg
                        className="h-5 w-5 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        {flashcards.length} Flashcard{flashcards.length !== 1 ? "s" : ""} Generated
                      </h2>
                      {metadata && (
                        <p className="text-xs text-slate-500">
                          {metadata.concept_cards} Concept • {metadata.application_cards} Application • {metadata.trick_cards} Trick/Mistake
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    Generate New Set
                  </button>
                </div>
                <div className="rounded-2xl border-2 border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-xl p-8">
                  <FlashcardDisplay flashcards={flashcards} metadata={metadata} />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
