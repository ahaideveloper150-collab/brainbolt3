"use client";

interface ModelSelectorProps {
    selectedModel: string;
    onModelChange: (model: string) => void;
    disabled?: boolean;
}

export const AVAILABLE_MODELS = [
    { id: "auto", name: "Auto (Default)" },
    { id: "x-ai/grok-4.1-fast", name: "grok-4.1-fast" },
    { id: "x-ai/grok-4.1", name: "grok-4.1" },
    { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash (Free)" },
];

export default function ModelSelector({ selectedModel, onModelChange, disabled }: ModelSelectorProps) {
    return (
        <div className="flex items-center gap-2">
            <label htmlFor="model-select" className="text-sm font-medium text-slate-700 whitespace-nowrap">
                Choose Model:
            </label>
            <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => onModelChange(e.target.value)}
                disabled={disabled}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
            >
                {AVAILABLE_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                        {model.name}
                    </option>
                ))}
            </select>
        </div>
    );
}
