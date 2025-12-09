/**
 * Local caching system for BrainBolt
 * Provides instant results for previously processed content
 */

// Simple SHA256 hash for cache keys
async function hashText(text: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export interface CacheEntry {
    key: string;
    value: any;
    timestamp: number;
    toolType: string;
}

const CACHE_PREFIX = "brainbolt_cache_";
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Get cached result for a specific tool and input
 */
export async function getCachedResult(
    toolType: string,
    input: string,
    additionalParams?: Record<string, any>
): Promise<any | null> {
    try {
        // Create cache key from input + params
        const cacheKey = additionalParams
            ? JSON.stringify({ input, ...additionalParams })
            : input;

        const hash = await hashText(cacheKey);
        const key = `${CACHE_PREFIX}${toolType}_${hash}`;

        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const entry: CacheEntry = JSON.parse(cached);

        // Check if cache is expired
        if (Date.now() - entry.timestamp > MAX_CACHE_AGE) {
            localStorage.removeItem(key);
            return null;
        }

        console.log(`✅ Cache HIT for ${toolType}`);
        return entry.value;
    } catch (error) {
        console.error("Error reading cache:", error);
        return null;
    }
}

/**
 * Save result to cache
 */
export async function setCachedResult(
    toolType: string,
    input: string,
    value: any,
    additionalParams?: Record<string, any>
): Promise<void> {
    try {
        const cacheKey = additionalParams
            ? JSON.stringify({ input, ...additionalParams })
            : input;

        const hash = await hashText(cacheKey);
        const key = `${CACHE_PREFIX}${toolType}_${hash}`;

        const entry: CacheEntry = {
            key,
            value,
            timestamp: Date.now(),
            toolType,
        };

        localStorage.setItem(key, JSON.stringify(entry));
        console.log(`💾 Cached result for ${toolType}`);
    } catch (error) {
        console.error("Error saving to cache:", error);
    }
}

/**
 * Clear all BrainBolt caches
 */
export function clearAllCaches(): number {
    let cleared = 0;
    const keys = Object.keys(localStorage);

    for (const key of keys) {
        if (key.startsWith(CACHE_PREFIX)) {
            localStorage.removeItem(key);
            cleared++;
        }
    }

    console.log(`🗑️ Cleared ${cleared} cache entries`);
    return cleared;
}

/**
 * Clear cache for a specific tool
 */
export function clearToolCache(toolType: string): number {
    let cleared = 0;
    const keys = Object.keys(localStorage);
    const prefix = `${CACHE_PREFIX}${toolType}_`;

    for (const key of keys) {
        if (key.startsWith(prefix)) {
            localStorage.removeItem(key);
            cleared++;
        }
    }

    console.log(`🗑️ Cleared ${cleared} cache entries for ${toolType}`);
    return cleared;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
    totalEntries: number;
    byTool: Record<string, number>;
    totalSize: number;
} {
    const keys = Object.keys(localStorage);
    const stats = {
        totalEntries: 0,
        byTool: {} as Record<string, number>,
        totalSize: 0,
    };

    for (const key of keys) {
        if (key.startsWith(CACHE_PREFIX)) {
            stats.totalEntries++;

            const value = localStorage.getItem(key);
            if (value) {
                stats.totalSize += value.length;

                try {
                    const entry: CacheEntry = JSON.parse(value);
                    stats.byTool[entry.toolType] = (stats.byTool[entry.toolType] || 0) + 1;
                } catch (e) {
                    // Invalid entry, skip
                }
            }
        }
    }

    return stats;
}
