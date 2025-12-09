import { NextRequest } from "next/server";

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
}

export interface RateLimiter {
    check(req: NextRequest, limit?: number, windowMs?: number): Promise<RateLimitResult>;
}

// In-Memory implementation (default for dev/local)
class MemoryRateLimiter implements RateLimiter {
    private store = new Map<string, { count: number; resetTime: number }>();

    async check(req: NextRequest, limit: number = 10, windowMs: number = 60000): Promise<RateLimitResult> {
        const ip = this.getIp(req);
        const key = `rate_limit:${ip}`;
        const now = Date.now();

        // Cleanup
        if (Math.random() < 0.1) {
            this.cleanup(now);
        }

        const entry = this.store.get(key);

        if (!entry || entry.resetTime < now) {
            const newEntry = { count: 1, resetTime: now + windowMs };
            this.store.set(key, newEntry);
            return { allowed: true, remaining: limit - 1, resetAt: newEntry.resetTime };
        }

        if (entry.count >= limit) {
            return { allowed: false, remaining: 0, resetAt: entry.resetTime };
        }

        entry.count++;
        return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetTime };
    }

    private getIp(req: NextRequest): string {
        const forwarded = req.headers.get("x-forwarded-for");
        return forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown";
    }

    private cleanup(now: number) {
        for (const [key, value] of this.store.entries()) {
            if (value.resetTime < now) {
                this.store.delete(key);
            }
        }
    }
}

// Redis implementation (Stub for future use)
class RedisRateLimiter implements RateLimiter {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async check(req: NextRequest, limit: number = 10, windowMs: number = 60000): Promise<RateLimitResult> {
        // TODO: Implement actual Redis logic here using Vercel KV or Upstash
        console.warn("RedisRateLimiter is not yet implemented. Falling back to MemoryRateLimiter.");
        return new MemoryRateLimiter().check(req, limit, windowMs);
    }
}

// Factory
export function getRateLimiter(): RateLimiter {
    const useRedis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
    if (useRedis) {
        return new RedisRateLimiter();
    }
    return new MemoryRateLimiter();
}
