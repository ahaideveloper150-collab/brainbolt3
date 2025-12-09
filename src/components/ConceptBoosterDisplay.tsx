"use client";

import { useState } from "react";

interface ConceptBoosterDisplayProps {
  step: string;
  content: any;
  topic: string;
  learningLevel: string;
  onDiagnosticSubmit: (answers: Array<{ question: string; answer: string }>) => void;
  onUnderstandingSubmit: (answers: Array<{ question: string; answer: string }>) => void;
  onPracticeSubmit: (answer: string) => void;
  onDoubtSubmit: (doubt: string) => void;
  isLoading: boolean;
}

export default function ConceptBoosterDisplay({
  step,
  content,
  topic,
  learningLevel,
  onDiagnosticSubmit,
  onUnderstandingSubmit,
  onPracticeSubmit,
  onDoubtSubmit,
  isLoading,
}: ConceptBoosterDisplayProps) {
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<Record<number, string>>({});
  const [understandingAnswers, setUnderstandingAnswers] = useState<Record<number, string>>({});
  const [practiceAnswer, setPracticeAnswer] = useState("");
  const [doubt, setDoubt] = useState("");

  // Diagnostic Questions
  if (step === "diagnostic" && content.questions) {
    return (
      <div className="space-y-6">
        {content.message && (
          <div className="rounded-lg bg-sky-50 border border-sky-200 p-4">
            <p className="text-sm text-sky-800">{content.message}</p>
          </div>
        )}
        <div className="space-y-4">
          {content.questions.map((q: any) => (
            <div key={q.id} className="rounded-lg border border-slate-200 bg-white p-5">
              <h4 className="font-semibold text-slate-900 mb-3">
                {q.id}. {q.question}
              </h4>
              <textarea
                value={diagnosticAnswers[q.id] || ""}
                onChange={(e) => setDiagnosticAnswers({ ...diagnosticAnswers, [q.id]: e.target.value })}
                placeholder="Type your answer here..."
                className="w-full min-h-[80px] rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              // Skip diagnostic - pass empty array to use average knowledge level
              onDiagnosticSubmit([]);
            }}
            disabled={isLoading}
            className="flex-1 rounded-md border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {isLoading ? "Processing..." : "Skip →"}
          </button>
          <button
            onClick={() => {
              const answers = content.questions.map((q: any) => ({
                question: q.question,
                answer: diagnosticAnswers[q.id] || "",
              }));
              onDiagnosticSubmit(answers);
            }}
            disabled={isLoading || content.questions.some((q: any) => !diagnosticAnswers[q.id]?.trim())}
            className="flex-1 rounded-md bg-sky-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isLoading ? "Processing..." : "Continue to Explanation →"}
          </button>
        </div>
        <p className="text-xs text-slate-500 text-center">
          💡 Tip: Skip if you're short on time. We'll use average knowledge level for your selected level.
        </p>
      </div>
    );
  }

  // Explanation
  if (step === "explanation" && content.explanation) {
    return (
      <div className="space-y-6">
        {content.message && (
          <div className="rounded-lg bg-sky-50 border border-sky-200 p-4">
            <p className="text-sm text-sky-800">{content.message}</p>
          </div>
        )}
        <div className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">💡 Simple Intuition</h3>
            <p className="text-slate-700 leading-relaxed">{content.explanation.simple_intuition}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">🔗 Analogy</h3>
            <p className="text-slate-700 leading-relaxed">{content.explanation.analogy}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">📚 Level-Appropriate Detail</h3>
            <div className="text-slate-700 leading-relaxed whitespace-pre-line">
              {content.explanation.level_appropriate_detail}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">💼 Example</h3>
            <div className="text-slate-700 leading-relaxed whitespace-pre-line">
              {content.explanation.example}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onUnderstandingSubmit([])}
            disabled={isLoading}
            className="flex-1 rounded-md bg-sky-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isLoading ? "Loading..." : "Check Understanding →"}
          </button>
          <button
            onClick={() => {
              // Navigate to ask_doubts step without a question (initial state)
              onDoubtSubmit("");
            }}
            disabled={isLoading}
            className="flex-1 rounded-md border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {isLoading ? "Loading..." : "Ask Doubts →"}
          </button>
        </div>
      </div>
    );
  }

  // Ask Doubts
  if (step === "ask_doubts" && content) {
    return (
      <div className="space-y-6">
        {content.message && (
          <div className="rounded-lg bg-sky-50 border border-sky-200 p-4">
            <p className="text-sm text-sky-800">{content.message}</p>
          </div>
        )}
        {content.answer && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-3">💡 Answer to Your Question</h3>
            <div className="text-green-800 leading-relaxed whitespace-pre-line mb-4">
              {content.answer}
            </div>
            <button
              onClick={() => {
                // Clear the answer to ask another question
                setDoubt("");
                onDoubtSubmit("");
              }}
              className="text-sm text-green-700 hover:text-green-900 font-medium"
            >
              Ask Another Question →
            </button>
          </div>
        )}
        {(!content.answer || doubt.trim()) && (
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">❓ Ask Your Doubts</h3>
            <p className="text-sm text-slate-600 mb-4">
              Have any questions about the topic? Ask them here and get personalized explanations.
            </p>
            <textarea
              value={doubt}
              onChange={(e) => setDoubt(e.target.value)}
              placeholder="Type your question or doubt here... (e.g., 'I don't understand how X relates to Y', 'Can you explain Z in simpler terms?')"
              className="w-full min-h-[120px] rounded-md border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
            />
          </div>
        )}
        <div className="flex gap-3">
          {!content.answer && (
            <button
              onClick={() => {
                if (doubt.trim()) {
                  onDoubtSubmit(doubt);
                  setDoubt("");
                }
              }}
              disabled={isLoading || !doubt.trim()}
              className="flex-1 rounded-md bg-sky-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isLoading ? "Getting Answer..." : "Ask Question"}
            </button>
          )}
          <button
            onClick={() => onUnderstandingSubmit([])}
            disabled={isLoading}
            className={`${content.answer ? "w-full" : "flex-1"} rounded-md border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100`}
          >
            Continue to Understanding Check →
          </button>
        </div>
      </div>
    );
  }

  // Understanding Check
  if (step === "check_understanding" && content.understanding_check) {
    return (
      <div className="space-y-6">
        {content.message && (
          <div className="rounded-lg bg-sky-50 border border-sky-200 p-4">
            <p className="text-sm text-sky-800">{content.message}</p>
          </div>
        )}
        <div className="space-y-4">
          {content.understanding_check.questions.map((q: any) => (
            <div key={q.id} className="rounded-lg border border-slate-200 bg-white p-5">
              <h4 className="font-semibold text-slate-900 mb-3">
                {q.id}. {q.question}
              </h4>
              <textarea
                value={understandingAnswers[q.id] || ""}
                onChange={(e) => setUnderstandingAnswers({ ...understandingAnswers, [q.id]: e.target.value })}
                placeholder="Type your answer here..."
                className="w-full min-h-[80px] rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            const answers = content.understanding_check.questions.map((q: any) => ({
              question: q.question,
              answer: understandingAnswers[q.id] || "",
            }));
            onUnderstandingSubmit(answers);
          }}
          disabled={isLoading}
          className="w-full rounded-md bg-sky-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isLoading ? "Processing..." : "Continue to Practice →"}
        </button>
      </div>
    );
  }

  // Practice Task
  if (step === "practice" && content.practice_task) {
    return (
      <div className="space-y-6">
        {content.message && (
          <div className="rounded-lg bg-sky-50 border border-sky-200 p-4">
            <p className="text-sm text-sky-800">{content.message}</p>
          </div>
        )}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">📝 Practice Task</h3>
          <div className="text-slate-700 leading-relaxed mb-6 whitespace-pre-line">
            {content.practice_task.task}
          </div>
          <textarea
            value={practiceAnswer}
            onChange={(e) => setPracticeAnswer(e.target.value)}
            placeholder="Write your answer or solution here..."
            className="w-full min-h-[150px] rounded-md border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
          />
        </div>
        <button
          onClick={() => onPracticeSubmit(practiceAnswer)}
          disabled={isLoading || !practiceAnswer.trim()}
          className="w-full rounded-md bg-sky-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isLoading ? "Getting Feedback..." : "Get Feedback →"}
        </button>
      </div>
    );
  }

  // Feedback
  if (step === "feedback" && content.feedback) {
    return (
      <div className="space-y-6">
        {content.message && (
          <div className="rounded-lg bg-sky-50 border border-sky-200 p-4">
            <p className="text-sm text-sky-800">{content.message}</p>
          </div>
        )}
        <div className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">📊 Comparison</h3>
            <p className="text-slate-700 leading-relaxed whitespace-pre-line">
              {content.feedback.comparison}
            </p>
          </div>

          {content.feedback.improvements && content.feedback.improvements.length > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-3">✅ Improvements</h3>
              <ul className="list-disc list-inside space-y-2 text-green-800">
                {content.feedback.improvements.map((imp: string, idx: number) => (
                  <li key={idx}>{imp}</li>
                ))}
              </ul>
            </div>
          )}

          {content.feedback.misunderstandings && content.feedback.misunderstandings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
              <h3 className="text-lg font-semibold text-amber-900 mb-3">⚠️ Areas to Clarify</h3>
              <ul className="list-disc list-inside space-y-2 text-amber-800">
                {content.feedback.misunderstandings.map((mis: string, idx: number) => (
                  <li key={idx}>{mis}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

