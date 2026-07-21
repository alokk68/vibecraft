import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import * as Sentry from '@sentry/nextjs';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

export async function rateLimit(req: NextRequest) {
  if (!redis) return true; // bypass if no redis (local dev)
  
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const key = `ratelimit:${ip}`;
    
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 60);
    }
    
    if (count > 10) {
      return false;
    }
    return true;
  } catch (error) {
    console.error('Rate limit error:', error);
    return true; // fail open
  }
}

export function withRobustness(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const isAllowed = await rateLimit(req);
    if (!isAllowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
    }

    try {
      return await handler(req);
    } catch (error: unknown) {
      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        Sentry.captureException(error);
      }
      console.error('API Route Error:', error);
      return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
    }
  };
}
