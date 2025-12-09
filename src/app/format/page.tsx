"use client";

import { useState } from "react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ModelSelector from "@/components/ModelSelector";
import OCRUploader from "@/components/OCRUploader";
import ExportButtons from "@/components/ExportButtons";
import { generateFormattedTextPDF } from "@/lib/pdf-generator";

type Mode = "idle" | "loading" | "done" | "error";

interface FormatResponse {
  formatted: string;
}

interface ErrorResponse {
  error: string;
}

export default function FormatPage() {
  const [rawAnswer, setRawAnswer] = useState("");
  const [formatted, setFormatted] = useState("");
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState("auto");

  const canSubmit = rawAnswer.trim().length > 0 && mode !== "loading";

  async function handleFormat() {
    const trimmedText = rawAnswer.trim();
    if (!trimmedText) {
      setError("Please enter some text to format.");
      setMode("error");
      return;
    }

    if (mode === "loading") {
      return;
    }

    setMode("loading");
    setError(null);
    setFormatted("");

    try {
      const res = await fetch("/api/format", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: trimmedText, model }),
      });

      if (!res.ok) {
        let errorMessage = "Failed to format answer";
        let errorDetails = "";
        try {
          const errorData: ErrorResponse & { details?: string } = await res.json();
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details || "";
        } catch {
          errorMessage = res.statusText || errorMessage;
        }
        const fullError = errorDetails ? `${errorMessage} (${errorDetails})` : errorMessage;
        throw new Error(fullError);
      }

      const data: FormatResponse = await res.json();

      if (!data.formatted || typeof data.formatted !== "string") {
        throw new Error("Invalid response format from server");
      }

      setFormatted(data.formatted);
      setMode("done");
    } catch (err) {
      console.error("Format error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
      setMode("error");
    }
  }

  async function handleCopy() {
    if (!formatted) return;
    try {
      await navigator.clipboard.writeText(formatted);
    } catch {
      // Copy failed silently
    }
  }

  function handleClear() {
    setRawAnswer("");
    setFormatted("");
    setMode("idle");
    setError(null);
  }

  function handleExportText() {
    if (!formatted) return;
    const blob = new Blob([formatted], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brainbolt-formatted.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleExportPDF() {
    if (!formatted) return;
    generateFormattedTextPDF(formatted, "BrainBolt Formatted Answer");
  }


  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Premium Header */}
          <header className="mb-12 text-center">
            <div className="inline-flex items-center justify-center gap-3 mb-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 shadow-lg">
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-sky-600 to-sky-800 bg-clip-text text-transparent">
                Answer Formatter
              </h1>
            </div>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Transform your rough, unstructured answers into clean, presentation-ready academic format with proper headings, bullet points, and professional formatting.
            </p>
          </header>

          <div className="space-y-8">
            {/* Input Section */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-xl p-8">
              <div className="mb-6">
                <label
                  htmlFor="answer-input"
                  className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-3"
                >
                  <svg
                    className="h-5 w-5 text-sky-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Your Raw Answer
                </label>
                <div className="mb-4">
                  <ModelSelector selectedModel={model} onModelChange={setModel} disabled={mode === "loading"} />
                </div>
                <textarea
                  id="answer-input"
                  value={rawAnswer}
                  onChange={(e) => setRawAnswer(e.target.value)}
                  placeholder="Paste your unformatted answer here... Start typing or paste your content to begin formatting."
                  className="w-full min-h-[280px] rounded-xl border-2 border-slate-200 bg-slate-50/50 px-6 py-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all resize-none"
                />
                <div className="mt-4">
                  <OCRUploader
                    onTextExtracted={(extractedText) => {
                      setRawAnswer((prev) => {
                        const combined = prev.trim() ? `${prev}\n\n${extractedText}` : extractedText;
                        return combined;
                      });
                    }}
                    disabled={mode === "loading"}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    {rawAnswer.length} characters
                  </span>
                  <button
                    type="button"
                    onClick={handleFormat}
                    disabled={!canSubmit}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:shadow-xl hover:shadow-sky-500/30 hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {mode === "loading" ? (
                      <>
                        <svg
                          className="h-5 w-5 animate-spin"
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
                        Formatting...
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-5 w-5"
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
                        Format Answer
                      </>
                    )}
                  </button>
                </div>
                {error && (
                  <div className="mt-4 rounded-xl border-2 border-rose-200 bg-rose-50/50 p-4">
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
            </div>

            {/* Loading Animation */}
            {mode === "loading" && (
              <div className="rounded-2xl border-2 border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-xl p-16">
                <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-sky-500/20 rounded-full blur-2xl animate-pulse"></div>
                    <svg
                      className="relative h-20 w-20 animate-spin text-sky-600"
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
                      Formatting your answer
                    </p>
                    <p className="text-sm text-slate-500">
                      AI is processing and structuring your content...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Output Section */}
            {formatted && mode !== "loading" && (
              <div className="rounded-2xl border-2 border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-xl overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
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
                      <h3 className="text-base font-semibold text-slate-900">
                        Formatted Answer
                      </h3>
                      <p className="text-xs text-slate-500">Ready to use</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <ExportButtons
                      onExportPDF={handleExportPDF}
                      onExportText={handleExportText}
                      onCopy={handleCopy}
                    />
                    <button
                      type="button"
                      onClick={handleClear}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      Clear
                    </button>
                  </div>
                </div>
                <div className="p-8 bg-gradient-to-br from-slate-50 to-white min-h-[300px] max-h-[700px] overflow-y-auto">
                  <div className="prose prose-sky max-w-none prose-headings:font-bold prose-p:text-slate-700 prose-strong:text-slate-900">
                    <MarkdownRenderer content={formatted} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
