"use client";

import { useState } from "react";
import ExportButtons from "@/components/ExportButtons";

export interface MCQ {
  id: number;
  question: string;
  options: string[];
  correct: string;
  explanation?: string;
}

interface MCQListProps {
  mcqs: MCQ[];
  title?: string;
}

export default function MCQList({ mcqs, title }: MCQListProps) {
  const [expandedExplanations, setExpandedExplanations] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const toggleExplanation = (id: number) => {
    const newSet = new Set(expandedExplanations);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedExplanations(newSet);
  };

  const copyMCQ = async (mcq: MCQ) => {
    const text = formatMCQText(mcq);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(mcq.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const copyAll = async () => {
    const allText = mcqs.map((mcq, index) => {
      const header = title ? `${title}\n\n` : "";
      return `${header}${formatMCQText(mcq, index + 1)}`;
    }).join("\n\n---\n\n");

    try {
      await navigator.clipboard.writeText(allText);
      // Show temporary success indicator
      const button = document.getElementById("copy-all-btn");
      if (button) {
        const originalText = button.textContent;
        button.textContent = "✓ Copied!";
        setTimeout(() => {
          if (button) button.textContent = originalText;
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to copy all:", error);
    }
  };

  const formatMCQText = (mcq: MCQ, number?: number): string => {
    const numPrefix = number ? `${number}. ` : "";
    const questionText = `${numPrefix}${mcq.question}\n`;
    const optionsText = mcq.options
      .map((opt, idx) => `   ${String.fromCharCode(65 + idx)}. ${opt}`)
      .join("\n");
    const answerText = `\nCorrect Answer: ${mcq.correct}`;
    const explanationText = mcq.explanation ? `\n\nExplanation: ${mcq.explanation}` : "";
    return questionText + optionsText + answerText + explanationText;
  };

  const downloadPDF = async () => {
    try {
      const { generateMCQPDF } = await import("@/lib/pdf-generator");
      generateMCQPDF(mcqs, title);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const exportText = () => {
    const allText = mcqs.map((mcq, index) => {
      const header = title ? `${title}\n\n` : "";
      return `${header}${formatMCQText(mcq, index + 1)}`;
    }).join("\n\n---\n\n");

    const blob = new Blob([allText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brainbolt-mcqs.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {title || "Generated MCQs"}
          </h3>
          <p className="text-sm text-slate-600">
            {mcqs.length} question{mcqs.length !== 1 ? "s" : ""} generated
          </p>
        </div>
        <ExportButtons
          onExportPDF={downloadPDF}
          onExportText={exportText}
          onCopy={copyAll}
        />
      </div>


      {/* MCQ Cards */}
      <div className="space-y-4">
        {mcqs.map((mcq) => (
          <div
            key={mcq.id}
            className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            {/* Question */}
            <div className="mb-4">
              <div className="flex items-start justify-between gap-4">
                <h4 className="flex-1 text-base font-semibold text-slate-900">
                  {mcq.id}. {mcq.question}
                </h4>
                <button
                  onClick={() => copyMCQ(mcq)}
                  className="flex-shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  title="Copy this question"
                >
                  {copiedId === mcq.id ? (
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
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
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="mb-4 space-y-2">
              {mcq.options.map((option, idx) => {
                const optionLetter = String.fromCharCode(65 + idx);
                const isCorrect = optionLetter === mcq.correct;
                return (
                  <div
                    key={idx}
                    className={`rounded-md border px-4 py-2.5 text-sm ${isCorrect
                      ? "border-green-500 bg-green-50 text-green-900"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                  >
                    <span className="font-medium">{optionLetter}.</span> {option}
                    {isCorrect && (
                      <span className="ml-2 text-xs font-semibold text-green-700">
                        ✓ Correct
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Explanation */}
            {mcq.explanation && (
              <div className="mt-4">
                <button
                  onClick={() => toggleExplanation(mcq.id)}
                  className="flex w-full items-center justify-between rounded-md bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  <span>Explanation</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${expandedExplanations.has(mcq.id) ? "rotate-180" : ""
                      }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {expandedExplanations.has(mcq.id) && (
                  <div className="mt-2 rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    {mcq.explanation}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

