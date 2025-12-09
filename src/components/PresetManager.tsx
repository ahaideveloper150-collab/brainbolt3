"use client";

import { useState, useEffect } from "react";

interface Preset {
    id: number;
    name: string;
    settings: string;
    createdAt: string;
    updatedAt: string;
}

interface PresetManagerProps {
    toolType: "mcq" | "flashcard" | "format" | "concept-booster";
    currentSettings: Record<string, any>;
    onLoadPreset: (settings: Record<string, any>) => void;
    disabled?: boolean;
}

export default function PresetManager({
    toolType,
    currentSettings,
    onLoadPreset,
    disabled = false,
}: PresetManagerProps) {
    const [presets, setPresets] = useState<Preset[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [presetName, setPresetName] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPresets();
    }, [toolType]);

    const fetchPresets = async () => {
        try {
            const res = await fetch(`/api/presets?toolType=${toolType}`);
            if (res.ok) {
                const data = await res.json();
                setPresets(data.presets || []);
            }
        } catch (err) {
            console.error("Error fetching presets:", err);
        }
    };

    const handleSavePreset = async () => {
        if (!presetName.trim()) {
            setError("Please enter a preset name");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/presets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    toolType,
                    name: presetName.trim(),
                    settings: currentSettings,
                }),
            });

            if (res.ok) {
                await fetchPresets();
                setPresetName("");
                setShowSaveDialog(false);
            } else {
                const data = await res.json();
                setError(data.error || "Failed to save preset");
            }
        } catch (err) {
            setError("Failed to save preset");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoadPreset = (preset: Preset) => {
        try {
            const settings = JSON.parse(preset.settings);
            onLoadPreset(settings);
        } catch (err) {
            console.error("Error loading preset:", err);
        }
    };

    const handleDeletePreset = async (presetId: number) => {
        if (!confirm("Are you sure you want to delete this preset?")) {
            return;
        }

        try {
            const res = await fetch(`/api/presets?id=${presetId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                await fetchPresets();
            }
        } catch (err) {
            console.error("Error deleting preset:", err);
        }
    };

    if (presets.length === 0 && !showSaveDialog) {
        return (
            <div className="mb-6">
                <button
                    type="button"
                    onClick={() => setShowSaveDialog(true)}
                    disabled={disabled}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5v14a2 2 0 002 2h10a2 2 0 002-2V7l-4-4H7a2 2 0 00-2 2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 1v6h6" />
                    </svg>
                    Save Current Settings as Preset
                </button>

                {showSaveDialog && (
                    <div className="mt-3 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Preset Name
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={presetName}
                                onChange={(e) => setPresetName(e.target.value)}
                                placeholder="e.g., My MCQ Settings"
                                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                            />
                            <button
                                type="button"
                                onClick={handleSavePreset}
                                disabled={isLoading}
                                className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:opacity-50"
                            >
                                {isLoading ? "Saving..." : "Save"}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowSaveDialog(false);
                                    setPresetName("");
                                    setError(null);
                                }}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                        </div>
                        {error && (
                            <p className="mt-2 text-sm text-rose-600">{error}</p>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">Saved Presets</h3>
                <button
                    type="button"
                    onClick={() => setShowSaveDialog(!showSaveDialog)}
                    disabled={disabled}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-md hover:bg-sky-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Save New
                </button>
            </div>

            {showSaveDialog && (
                <div className="mb-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <label className="block text-xs font-medium text-slate-700 mb-2">
                        Preset Name
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                            placeholder="e.g., My MCQ Settings"
                            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        />
                        <button
                            type="button"
                            onClick={handleSavePreset}
                            disabled={isLoading}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:opacity-50"
                        >
                            {isLoading ? "Saving..." : "Save"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowSaveDialog(false);
                                setPresetName("");
                                setError(null);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                    </div>
                    {error && (
                        <p className="mt-2 text-xs text-rose-600">{error}</p>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {presets.map((preset) => (
                    <div
                        key={preset.id}
                        className="group p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-medium text-slate-900 truncate flex-1">
                                {preset.name}
                            </h4>
                            <button
                                type="button"
                                onClick={() => handleDeletePreset(preset.id)}
                                className="opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-rose-600"
                                title="Delete preset"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleLoadPreset(preset)}
                            disabled={disabled}
                            className="w-full px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-md hover:bg-sky-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Load Settings
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
