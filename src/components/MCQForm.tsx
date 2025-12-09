"use client";

import { useState } from "react";
import ModelSelector from "@/components/ModelSelector";
import OCRUploader from "@/components/OCRUploader";
import PresetManager from "@/components/PresetManager";

interface MCQFormProps {
  onSubmit: (data: {
    text: string;
    numQuestions: number;
    difficulty: "easy" | "medium" | "hard";
    includeExplanations: boolean;
    title: string;
    model: string;
  }) => void;
  isLoading: boolean;
}

export default function MCQForm({ onSubmit, isLoading }: MCQFormProps) {
  const [text, setText] = useState("");
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [includeExplanations, setIncludeExplanations] = useState(true);
  const [title, setTitle] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [model, setModel] = useState("auto");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 50KB for text files)
    if (file.size > 50 * 1024) {
      setFileError("File size must be less than 50KB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("text/") && !file.name.endsWith(".txt")) {
      setFileError("Please upload a text file (.txt)");
      return;
    }

    setFileError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content.length > 12000) {
        setFileError("File content exceeds 12,000 characters limit");
        return;
      }
      setText(content);
    };
    reader.onerror = () => {
      setFileError("Failed to read file");
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedText = text.trim();
    if (!trimmedText) {
      return;
    }
    onSubmit({
      text: trimmedText,
      numQuestions,
      difficulty,
      includeExplanations,
      title: title.trim() || "MCQ Set",
      model,
    });
  };

  const canSubmit = text.trim().length > 0 && !isLoading;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Preset Manager */}
      <PresetManager
        toolType="mcq"
        currentSettings={{
          numQuestions,
          difficulty,
          includeExplanations,
          model,
        }}
        onLoadPreset={(settings) => {
          if (settings.numQuestions) setNumQuestions(settings.numQuestions);
          if (settings.difficulty) setDifficulty(settings.difficulty);
          if (settings.includeExplanations !== undefined) setIncludeExplanations(settings.includeExplanations);
          if (settings.model) setModel(settings.model);
        }}
        disabled={isLoading}
      />

      {/* Title Input */}
      <div>
        <label htmlFor="mcq-title" className="block text-sm font-medium text-slate-700 mb-2">
          Topic Title (Optional)
        </label>
        <input
          id="mcq-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Photosynthesis Chapter 1"
          className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
      </div>

      {/* Text Input */}
      <div>
        <label htmlFor="mcq-text" className="block text-sm font-medium text-slate-700 mb-2">
          Paste your text or upload a file
        </label>
        <textarea
          id="mcq-text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setFileError(null);
          }}
          placeholder="Paste chapter excerpt, notes, or any text content here..."
          className="w-full min-h-[250px] rounded-md border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
        />
        <div className="mt-4">
          <OCRUploader
            onTextExtracted={(extractedText) => {
              setText((prev) => {
                const combined = prev.trim() ? `${prev}\n\n${extractedText}` : extractedText;
                return combined;
              });
            }}
            disabled={isLoading}
          />
        </div>
        <div className="mt-2 flex items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-900">
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={handleFileUpload}
              className="hidden"
            />
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Upload text file
          </label>
          <span className="text-xs text-slate-500">
            {text.length.toLocaleString()} / 12,000 characters
          </span>
        </div>
        {fileError && (
          <p className="mt-2 text-sm font-medium text-rose-600">{fileError}</p>
        )}

      </div>

      <ModelSelector selectedModel={model} onModelChange={setModel} disabled={isLoading} />

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Number of Questions */}
        <div>
          <label htmlFor="num-questions" className="block text-sm font-medium text-slate-700 mb-2">
            Number of Questions
          </label>
          <select
            id="num-questions"
            value={numQuestions}
            onChange={(e) => setNumQuestions(parseInt(e.target.value))}
            className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          >
            <option value={5}>5 Questions</option>
            <option value={10}>10 Questions</option>
            <option value={15}>15 Questions</option>
            <option value={20}>20 Questions</option>
            <option value={25}>25 Questions</option>
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <label htmlFor="difficulty" className="block text-sm font-medium text-slate-700 mb-2">
            Difficulty Level
          </label>
          <div className="flex gap-2">
            {(["easy", "medium", "hard"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setDifficulty(level)}
                className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition ${difficulty === level
                  ? "bg-sky-600 text-white shadow-sm"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Include Explanations */}
      <div className="flex items-center gap-3">
        <input
          id="include-explanations"
          type="checkbox"
          checked={includeExplanations}
          onChange={(e) => setIncludeExplanations(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
        />
        <label htmlFor="include-explanations" className="text-sm font-medium text-slate-700">
          Include explanations for answers
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-sky-600 to-purple-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg transition hover:from-sky-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-sky-600 disabled:hover:to-purple-600"
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
            Generating MCQs...
          </>
        ) : (
          <>
            <span>⚡</span>
            Generate MCQs
          </>
        )}
      </button>
    </form>
  );
}
