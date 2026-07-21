import { NextResponse } from 'next/server';

export async function GET() {
  const start = Date.now();
  const res = {
    status: 'ok',
    latencyMs: 0,
    services: { cf: 'ok', hf: 'ok', webgpu: true }
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    
    const cfRes = await fetch('https://api.cloudflare.com/client/v4/accounts/health', { 
      signal: controller.signal 
    }).catch(() => null);

    if (!cfRes || !cfRes.ok) {
      res.services.cf = !cfRes ? 'timeout' : 'down';
      res.status = 'degraded';
    }

    
    const hfRes = await fetch('https://huggingface.co/api/spaces', { 
      signal: controller.signal 
    }).catch(() => null);

    if (!hfRes || !hfRes.ok) {
      res.services.hf = !hfRes ? 'timeout' : 'down';
      res.status = 'degraded';
    }

    clearTimeout(timeoutId);
  } catch {
    res.status = 'degraded';
  }

  res.latencyMs = Date.now() - start;
  return NextResponse.json(res);
}