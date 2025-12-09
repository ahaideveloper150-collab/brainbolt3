/**
 * Global API call manager
 * Prevents duplicate requests and manages debouncing
 */

type AbortControllerMap = Map<string, AbortController>;

class APICallManager {
    private activeRequests: AbortControllerMap = new Map();
    private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Make an API call with automatic duplicate prevention
     */
    async makeRequest<T>(
        requestId: string,
        requestFn: (signal: AbortSignal) => Promise<T>,
        options?: {
            cancelPrevious?: boolean;
        }
    ): Promise<T> {
        const { cancelPrevious = true } = options || {};

        // Cancel previous request if it exists
        if (cancelPrevious && this.activeRequests.has(requestId)) {
            console.log(`🚫 Cancelling previous request: ${requestId}`);
            this.activeRequests.get(requestId)?.abort();
            this.activeRequests.delete(requestId);
        }

        // Create new abort controller
        const controller = new AbortController();
        this.activeRequests.set(requestId, controller);

        try {
            const result = await requestFn(controller.signal);
            this.activeRequests.delete(requestId);
            return result;
        } catch (error) {
            this.activeRequests.delete(requestId);

            // Don't throw if request was cancelled intentionally
            if (error instanceof Error && error.name === "AbortError") {
                console.log(`✋ Request cancelled: ${requestId}`);
                throw new Error("Request cancelled");
            }

            throw error;
        }
    }

    /**
     * Debounce a function call
     */
    debounce<T extends (...args: any[]) => any>(
        key: string,
        fn: T,
        delay: number = 800
    ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
        return (...args: Parameters<T>): Promise<ReturnType<T>> => {
            return new Promise((resolve, reject) => {
                // Clear existing timer
                if (this.debounceTimers.has(key)) {
                    clearTimeout(this.debounceTimers.get(key)!);
                }

                // Set new timer
                const timer = setTimeout(async () => {
                    try {
                        const result = await fn(...args);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    } finally {
                        this.debounceTimers.delete(key);
                    }
                }, delay);

                this.debounceTimers.set(key, timer);
            });
        };
    }

    /**
     * Cancel a specific request
     */
    cancelRequest(requestId: string): boolean {
        const controller = this.activeRequests.get(requestId);
        if (controller) {
            controller.abort();
            this.activeRequests.delete(requestId);
            return true;
        }
        return false;
    }

    /**
     * Cancel all active requests
     */
    cancelAllRequests(): void {
        console.log(`🚫 Cancelling ${this.activeRequests.size} active requests`);
        this.activeRequests.forEach((controller) => controller.abort());
        this.activeRequests.clear();
    }

    /**
     * Check if a request is currently active
     */
    isRequestActive(requestId: string): boolean {
        return this.activeRequests.has(requestId);
    }

    /**
     * Get number of active requests
     */
    getActiveRequestCount(): number {
        return this.activeRequests.size;
    }
}

// Singleton instance
export const apiManager = new APICallManager();

/**
 * Helper hook for using debounced values in React
 */
export function useDebouncedValue<T>(value: T, delay: number = 800): T {
    const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

// Re-export React for the hook
import React from "react";
