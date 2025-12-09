"use client";

import { useState } from "react";
import ExportButtons from "@/components/ExportButtons";
import { generateFlashcardPDF } from "@/lib/pdf-generator";

export interface Flashcard {
  id: number;
  type: "concept" | "application" | "trick";
  front: string;
  back: string;
}

interface FlashcardDisplayProps {
  flashcards: Flashcard[];
  metadata?: {
    learning_level: string;
    total_cards: number;
    concept_cards: number;
    application_cards: number;
    trick_cards: number;
  };
}

export default function FlashcardDisplay({ flashcards, metadata }: FlashcardDisplayProps) {
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterType, setFilterType] = useState<"all" | "concept" | "application" | "trick">("all");

  const toggleFlip = (id: number) => {
    const newSet = new Set(flippedCards);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setFlippedCards(newSet);
  };

  const filteredFlashcards = filterType === "all"
    ? flashcards
    : flashcards.filter((card) => card.type === filterType);

  const currentCard = filteredFlashcards[currentIndex];
  const isFlipped = currentCard && flippedCards.has(currentCard.id);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "concept":
        return "bg-blue-50 border-blue-200 text-blue-900";
      case "application":
        return "bg-green-50 border-green-200 text-green-900";
      case "trick":
        return "bg-amber-50 border-amber-200 text-amber-900";
      default:
        return "bg-slate-50 border-slate-200 text-slate-900";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "concept":
        return "Concept";
      case "application":
        return "Application";
      case "trick":
        return "Trick/Mistake";
      default:
        return type;
    }
  };

  const copyAll = async () => {
    const text = flashcards.map((card, idx) => {
      const typeLabel = getTypeLabel(card.type);
      return `Card ${idx + 1} [${typeLabel}]\nFront: ${card.front}\nBack: ${card.back}\n`;
    }).join("\n---\n\n");

    try {
      await navigator.clipboard.writeText(text);
      alert("All flashcards copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleExportText = () => {
    const text = flashcards.map((card, idx) => {
      const typeLabel = getTypeLabel(card.type);
      return `Card ${idx + 1} [${typeLabel}]\nFront: ${card.front}\nBack: ${card.back}\n`;
    }).join("\n---\n\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brainbolt-flashcards.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    generateFlashcardPDF(flashcards, "BrainBolt Flashcards");
  };


  return (
    <div className="space-y-6">
      {/* Stats and Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Generated Flashcards
          </h3>
          {metadata && (
            <p className="text-sm text-slate-600">
              {metadata.total_cards} total • {metadata.concept_cards} Concept • {metadata.application_cards} Application • {metadata.trick_cards} Trick/Mistake
            </p>
          )}
        </div>
        <ExportButtons
          onExportPDF={handleExportPDF}
          onExportText={handleExportText}
          onCopy={copyAll}
        />
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "concept", "application", "trick"] as const).map((type) => (
          <button
            key={type}
            onClick={() => {
              setFilterType(type);
              setCurrentIndex(0);
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${filterType === type
              ? "bg-sky-600 text-white"
              : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
          >
            {type === "all" ? "All" : getTypeLabel(type)}
            {type !== "all" && ` (${flashcards.filter((c) => c.type === type).length})`}
          </button>
        ))}
      </div>

      {/* Flashcard Display */}
      {currentCard && (
        <div className="space-y-4">
          <div className="text-center text-sm text-slate-600">
            Card {currentIndex + 1} of {filteredFlashcards.length}
          </div>

          <div
            onClick={() => toggleFlip(currentCard.id)}
            className="relative h-64 cursor-pointer"
          >
            <div className="relative w-full h-full">
              {/* Front */}
              <div
                className={`absolute inset-0 rounded-lg border-2 shadow-lg p-6 flex flex-col items-center justify-center transition-opacity duration-500 ${getTypeColor(currentCard.type)}`}
                style={{
                  opacity: isFlipped ? 0 : 1,
                  pointerEvents: isFlipped ? "none" : "auto",
                  transform: "translateZ(0)",
                }}
              >
                <div className="absolute top-3 right-3">
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-white/80">
                    {getTypeLabel(currentCard.type)}
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold mb-2">Front</p>
                  <p className="text-base leading-relaxed">{currentCard.front}</p>
                </div>
                <div className="absolute bottom-3 text-xs text-slate-500">
                  Click to flip
                </div>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 rounded-lg border-2 border-slate-300 shadow-lg p-6 flex flex-col items-center justify-center bg-white transition-opacity duration-500"
                style={{
                  opacity: isFlipped ? 1 : 0,
                  pointerEvents: isFlipped ? "auto" : "none",
                  transform: "translateZ(0)",
                }}
              >
                <div className="text-center w-full">
                  <p className="text-lg font-semibold mb-2 text-slate-900">Back</p>
                  <p className="text-base leading-relaxed whitespace-pre-line text-slate-900 font-normal" style={{
                    textRendering: "optimizeLegibility",
                    WebkitFontSmoothing: "antialiased",
                    MozOsxFontSmoothing: "grayscale",
                  }}>{currentCard.back}</p>
                </div>
                <div className="absolute bottom-3 text-xs text-slate-500">
                  Click to flip
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => {
                setCurrentIndex((prev) => (prev > 0 ? prev - 1 : filteredFlashcards.length - 1));
                setFlippedCards(new Set());
              }}
              disabled={filteredFlashcards.length === 0}
              className="px-4 py-2 rounded-md border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              ← Previous
            </button>
            <button
              onClick={() => toggleFlip(currentCard.id)}
              className="px-6 py-2 rounded-md bg-sky-600 text-white shadow-sm transition hover:bg-sky-700"
            >
              {isFlipped ? "Show Front" : "Flip Card"}
            </button>
            <button
              onClick={() => {
                setCurrentIndex((prev) => (prev < filteredFlashcards.length - 1 ? prev + 1 : 0));
                setFlippedCards(new Set());
              }}
              disabled={filteredFlashcards.length === 0}
              className="px-4 py-2 rounded-md border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* All Cards List */}
      <div className="mt-8 space-y-4">
        <h4 className="text-lg font-semibold text-slate-900">All Flashcards</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFlashcards.map((card, idx) => (
            <div
              key={card.id}
              onClick={() => {
                setCurrentIndex(idx);
                setFlippedCards(new Set());
              }}
              className={`rounded-lg border-2 p-4 cursor-pointer transition hover:shadow-md ${currentIndex === idx ? "border-sky-500 ring-2 ring-sky-200" : "border-slate-200"
                } ${getTypeColor(card.type)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-semibold">{getTypeLabel(card.type)}</span>
                <span className="text-xs text-slate-500">#{card.id}</span>
              </div>
              <p className="text-sm font-medium mb-1">Front:</p>
              <p className="text-sm mb-3 line-clamp-2">{card.front}</p>
              <p className="text-xs text-slate-600">Click to view in detail</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

