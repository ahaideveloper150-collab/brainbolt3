"use client";

import { useState } from "react";
import ModelSelector from "@/components/ModelSelector";
import OCRUploader from "@/components/OCRUploader";

interface ConceptBoosterFormProps {
  onSubmit: (data: { topic: string; learning_level: string; model: string }) => void;
  isLoading: boolean;
}

const LEARNING_LEVELS = [
  "Class 6–8",
  "Class 9–10",
  "Class 11–12 (FSc/Intermediate)",
  "University Level",
  "Beginner Adult",
  "Advanced Learner",
  "Other",
];

export default function ConceptBoosterForm({ onSubmit, isLoading }: ConceptBoosterFormProps) {
  const [topic, setTopic] = useState("");
  const [learningLevel, setLearningLevel] = useState("");
  const [customLevel, setCustomLevel] = useState("");
  const [model, setModel] = useState("auto");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTopic = topic.trim();
    const selectedLevel = learningLevel === "Other" ? customLevel.trim() : learningLevel;

    if (!trimmedTopic || !selectedLevel) {
      return;
    }

    onSubmit({
      topic: trimmedTopic,
      learning_level: selectedLevel,
      model,
    });
  };

  const canSubmit = topic.trim().length > 0 && learningLevel.length > 0 && (learningLevel !== "Other" || customLevel.trim().length > 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Topic Input */}
      <div>
        <label htmlFor="topic-input" className="block text-sm font-medium text-slate-700 mb-2">
          What topic would you like to learn?
        </label>
        <input
          id="topic-input"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., Photosynthesis, Newton's Laws, Python Functions..."
          className="w-full rounded-md border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
        <div className="mt-4">
          <OCRUploader
            onTextExtracted={(extractedText) => {
              setTopic((prev) => {
                const combined = prev.trim() ? `${prev}\n\n${extractedText}` : extractedText;
                return combined;
              });
            }}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Learning Level Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          Please select your learning level:
        </label>
        <div className="space-y-2">
          {LEARNING_LEVELS.map((level) => (
            <label
              key={level}
              className="flex items-center gap-3 p-3 rounded-md border border-slate-200 bg-white cursor-pointer transition hover:bg-slate-50 hover:border-sky-300"
            >
              <input
                type="radio"
                name="learning-level"
                value={level}
                checked={learningLevel === level}
                onChange={(e) => setLearningLevel(e.target.value)}
                className="h-4 w-4 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-sm text-slate-700">{level}</span>
            </label>
          ))}
        </div>

        {/* Custom Level Input */}
        {learningLevel === "Other" && (
          <div className="mt-3">
            <input
              type="text"
              value={customLevel}
              onChange={(e) => setCustomLevel(e.target.value)}
              placeholder="Please specify your learning level"
              className="w-full rounded-md border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        )}
      </div>

      <ModelSelector selectedModel={model} onModelChange={setModel} disabled={isLoading} />

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!canSubmit || isLoading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-sky-600 to-purple-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg transition hover:from-sky-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
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
            Starting your learning journey...
          </>
        ) : (
          <>
            <span>🚀</span>
            Start Learning
          </>
        )}
      </button>
    </form>
  );
}

