"use client";

import { useState, useRef } from "react";
import Tesseract from "tesseract.js";
import { compressImage, formatFileSize } from "@/lib/image-compression";

interface OCRUploaderProps {
    onTextExtracted: (text: string) => void;
    disabled?: boolean;
}

export default function OCRUploader({ onTextExtracted, disabled = false }: OCRUploaderProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Clear previous errors
        setError(null);

        // Validate file types
        const validImageTypes = ["image/png", "image/jpeg", "image/jpg"];
        const invalidFiles = Array.from(files).filter(
            (file) => !validImageTypes.includes(file.type)
        );

        if (invalidFiles.length > 0) {
            setError("Only PNG, JPG, and JPEG files are allowed.");
            return;
        }

        setIsProcessing(true);
        setProgress(0);

        try {
            let combinedText = "";

            // Process each image
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // Validate file size (max 10MB before compression)
                if (file.size > 10 * 1024 * 1024) {
                    setError(`Image ${i + 1} is too large. Maximum file size is 10MB.`);
                    setIsProcessing(false);
                    return;
                }

                // Compress image for faster OCR processing
                const compressed = await compressImage(file);
                console.log(`📦 Compressed: ${formatFileSize(compressed.originalSize)} → ${formatFileSize(compressed.compressedSize)} (${compressed.compressionRatio.toFixed(1)}% reduction)`);

                // Process image with Tesseract with optimized settings
                const result = await Tesseract.recognize(compressed.dataUrl, "eng", {
                    logger: (m) => {
                        // Update progress
                        if (m.status === "recognizing text") {
                            const fileProgress = (m.progress * 100) / files.length;
                            const overallProgress = (i / files.length) * 100 + fileProgress;
                            setProgress(Math.round(overallProgress));
                        }
                    },
                });

                const extractedText = result.data.text.trim();

                // Check if any meaningful text was extracted (more lenient check)
                if (!extractedText || extractedText.length < 3) {
                    setError(
                        `Image ${i + 1} appears to contain no readable text. Please ensure the image is clear and contains text.`
                    );
                    setIsProcessing(false);
                    return;
                }

                // Add extracted text to combined text
                if (combinedText) {
                    combinedText += "\n\n";
                }
                combinedText += extractedText;
            }

            // Final validation
            if (!combinedText.trim()) {
                setError("No text could be extracted from the image(s). Please try with clearer images.");
                setIsProcessing(false);
                return;
            }

            // Pass extracted text to parent component
            onTextExtracted(combinedText);
            setProgress(100);

            // Clear error and reset file input after successful extraction
            setError(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (err) {
            console.error("OCR Error:", err);
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            setError(`Failed to extract text: ${errorMessage}. Please ensure the image is clear and try again.`);
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    };

    return (
        <div className="space-y-2">
            {/* Upload Button */}
            <label
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-all cursor-pointer ${isProcessing || disabled
                    ? "border-slate-300 bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "border-sky-400 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:border-sky-500"
                    }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    multiple
                    onChange={handleImageUpload}
                    disabled={isProcessing || disabled}
                    className="hidden"
                />
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
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                </svg>
                <span className="text-sm font-medium">
                    {isProcessing ? "Processing..." : "Upload Image"}
                </span>
            </label>

            {/* Processing Indicator */}
            {isProcessing && (
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-sky-500 to-sky-600 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-xs font-medium text-slate-600">{progress}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <svg
                            className="h-4 w-4 animate-spin text-sky-600"
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
                        <span>Extracting text from image...</span>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && !isProcessing && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200">
                    <svg
                        className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0"
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
            )}

            {/* Help Text */}
            {!isProcessing && !error && (
                <p className="text-xs text-slate-500">
                    Supported formats: PNG, JPG, JPEG • Multiple images supported
                </p>
            )}
        </div>
    );
}
