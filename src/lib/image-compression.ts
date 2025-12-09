/**
 * Client-side image compression for OCR optimization
 * Compresses and resizes images before sending to OCR
 */

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const COMPRESSION_QUALITY = 0.6;

export interface CompressedImage {
    blob: Blob;
    dataUrl: string;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
}

/**
 * Compress an image file for faster OCR processing
 */
export async function compressImage(
    file: File,
    maxWidth: number = MAX_WIDTH,
    maxHeight: number = MAX_HEIGHT,
    quality: number = COMPRESSION_QUALITY
): Promise<CompressedImage> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                // Calculate new dimensions while maintaining aspect ratio
                let { width, height } = img;

                if (width > maxWidth || height > maxHeight) {
                    const aspectRatio = width / height;

                    if (width > height) {
                        width = maxWidth;
                        height = width / aspectRatio;
                    } else {
                        height = maxHeight;
                        width = height * aspectRatio;
                    }
                }

                // Create canvas and draw resized image
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Failed to get canvas context"));
                    return;
                }

                // Use better image smoothing for quality
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error("Failed to create blob"));
                            return;
                        }

                        const dataUrl = canvas.toDataURL("image/jpeg", quality);
                        const compressionRatio = ((file.size - blob.size) / file.size) * 100;

                        resolve({
                            blob,
                            dataUrl,
                            originalSize: file.size,
                            compressedSize: blob.size,
                            compressionRatio,
                        });
                    },
                    "image/jpeg",
                    quality
                );
            };

            img.onerror = () => {
                reject(new Error("Failed to load image"));
            };

            img.src = e.target?.result as string;
        };

        reader.onerror = () => {
            reject(new Error("Failed to read file"));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Convert compressed blob back to File object
 */
export function blobToFile(blob: Blob, filename: string): File {
    return new File([blob], filename, {
        type: blob.type,
        lastModified: Date.now(),
    });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
