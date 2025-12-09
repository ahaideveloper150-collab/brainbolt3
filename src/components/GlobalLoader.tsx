"use client";

interface GlobalLoaderProps {
    message?: string;
    progress?: number;
}

export default function GlobalLoader({ message = "Processing...", progress }: GlobalLoaderProps) {
    return (
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
                        {message}
                    </p>
                    {progress !== undefined && (
                        <div className="w-64 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-sky-600 h-2 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}
                    <p className="text-sm text-slate-500 mt-2">
                        AI is processing your content...
                    </p>
                </div>
            </div>
        </div>
    );
}
