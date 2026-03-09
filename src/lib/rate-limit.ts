import { NextRequest } from 'next/server';

// In-memory store for rate limiting
// Maps IP to { count, resetTime }
const rateLimits = new Map<string, { count: number; resetTime: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10;

export function checkRateLimit(req: NextRequest, agentId: string): { allowed: boolean; remaining: number; reset: number } {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const key = `${agentId}:${ip}`;
  
  const now = Date.now();
  const limit = rateLimits.get(key);

  if (!limit || now > limit.resetTime) {
    // New window
    rateLimits.set(key, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1, reset: now + WINDOW_MS };
  }

  if (limit.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, reset: limit.resetTime };
  }

  limit.count++;
  return { allowed: true, remaining: MAX_REQUESTS - limit.count, reset: limit.resetTime };
}
