import { Request, Response, NextFunction } from 'express';

const LIMIT = 100;
const WINDOW_MS = 60 * 1000; // 1 minute

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// cleanup expired entries every minute to prevent memory leak
setInterval(() => {
    const now = Date.now();
    store.forEach((entry, ip) => {
        if (now > entry.resetAt) store.delete(ip);
    });
}, WINDOW_MS);

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
        // first request or window expired → reset
        store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
        res.setHeader('X-RateLimit-Limit', LIMIT);
        res.setHeader('X-RateLimit-Remaining', LIMIT - 1);
        res.setHeader('X-RateLimit-Reset', new Date(now + WINDOW_MS).toISOString());
        return next();
    }

    entry.count++;

    const remaining = Math.max(0, LIMIT - entry.count);

    res.setHeader('X-RateLimit-Limit', LIMIT);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetAt).toISOString());

    if (entry.count > LIMIT) {
        return res.status(429).json({
            error: 'Too Many Requests',
            message: `Limit of ${LIMIT} requests per minute exceeded. Try again at ${new Date(entry.resetAt).toISOString()}`,
        });
    }

    next();
}