"use client";

import { useState } from "react";
import MCQForm from "@/components/MCQForm";
import MCQList, { MCQ } from "@/components/MCQList";
import { ErrorBoundary } from "@/components/ErrorBoundary";

type Mode = "idle" | "loading" | "done" | "error";

interface MCQResponse {
  mcqs: MCQ[];
  source_tokens: number;
}

interface ErrorResponse {
  error: string;
  details?: string;
  retry_after?: number;
  error_code?: string;
}

export default function MCQPage() {
  const [mode, setMode] = useState<Mode>("idle");
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [sourceTokens, setSourceTokens] = useState<number>(0);

  const handleGenerate = async (data: {
    text: string;
    numQuestions: number;
    difficulty: "easy" | "medium" | "hard";
    includeExplanations: boolean;
    title: string;
    model: string;
  }) => {
    setMode("loading");
    setError(null);
    setMcqs([]);
    setTitle(data.title);

    try {
      const res = await fetch("/api/mcq", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: data.text,
          num_questions: data.numQuestions,
          difficulty: data.difficulty,
          include_explanations: data.includeExplanations,
          title: data.title,
          model: data.model,
        }),
      });

      if (!res.ok) {
        let errorMessage = "Failed to generate MCQs";
        let errorDetails = "";
        let retryAfter: number | undefined;
        let errorCode: string | undefined;

        try {
          const errorData: ErrorResponse & { error_code?: string; retry_after?: number } = await res.json();
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details || "";
          errorCode = errorData.error_code;
          retryAfter = errorData.retry_after;
        } catch {
          errorMessage = res.statusText || errorMessage;
        }

        if (res.status === 429 && retryAfter) {
          errorMessage = `${errorMessage} Please try again in ${retryAfter} seconds.`;
        }

        if (errorCode === "INSUFFICIENT_CONTEXT") {
          errorMessage = errorMessage || "The provided text doesn't contain enough information to generate valid MCQs. Please provide more detailed content.";
        }

        const fullError = errorDetails ? `${errorMessage}${errorDetails ? ` (${errorDetails})` : ""}` : errorMessage;
        throw new Error(fullError);
      }

      const responseData: MCQResponse = await res.json();

      if (!responseData.mcqs || !Array.isArray(responseData.mcqs) || responseData.mcqs.length === 0) {
        throw new Error("Invalid response format from server");
      }

      setMcqs(responseData.mcqs);
      setSourceTokens(responseData.source_tokens || 0);
      setMode("done");
    } catch (err) {
      console.error("MCQ generation error:", err);
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
    setMcqs([]);
    setError(null);
    setTitle("");
    setSourceTokens(0);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Premium Header */}
          <header className="mb-12 text-center">
            <div className="inline-flex items-center justify-center gap-3 mb-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                MCQ Generator
              </h1>
            </div>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Generate high-quality multiple choice questions from your study materials. Perfect for exam preparation with customizable difficulty levels and explanations.
            </p>
          </header>

          <div className="space-y-8">
            {/* Form Section */}
            {mode !== "done" && (
              <div className="rounded-2xl border-2 border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-xl p-8">
                <MCQForm onSubmit={handleGenerate} isLoading={mode === "loading"} />
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
                    <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl animate-pulse"></div>
                    <svg
                      className="relative h-20 w-20 animate-spin text-purple-600"
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
                      Generating your MCQs
                    </p>
                    <p className="text-sm text-slate-500">
                      AI is crafting high-quality questions from your content...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Results Section */}
            {mode === "done" && mcqs.length > 0 && (
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
                        {mcqs.length} Question{mcqs.length !== 1 ? "s" : ""} Generated
                      </h2>
                      {sourceTokens > 0 && (
                        <p className="text-xs text-slate-500">
                          ~{sourceTokens.toLocaleString()} tokens processed
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  <MCQList mcqs={mcqs} title={title} />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
