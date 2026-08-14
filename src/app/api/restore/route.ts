import { NextResponse, NextRequest } from 'next/server';
import { withRobustness } from '@/lib/apiMiddleware';
import { invariant } from '@/lib/invariant';

export const POST = withRobustness(async (req: NextRequest) => {
  const startTime = Date.now();

  try {
    const { image, mode } = await req.json();

    if (!image || !mode) {
      return NextResponse.json(
        { success: false, error: 'Missing image or mode' },
        { status: 400 }
      );
    }

    const userHfToken = req.headers.get('x-hf-token');
    const hfToken = userHfToken || process.env.HF_API_TOKEN;
    const spaceUrl = process.env.HF_SPACE_URL;

    if (!spaceUrl) {
      return NextResponse.json(
        { success: false, error: 'HF_SPACE_URL environment variable is missing' },
        { status: 500 }
      );
    }

    const payload = {
      data: [image, mode]
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); 

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (hfToken) {
      headers['Authorization'] = `Bearer ${hfToken}`;
    }

    let submitRes;
    try {
      submitRes = await fetch(`${spaceUrl.replace(/\/$/, '')}/gradio_api/call/predict`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('HF Space timeout, might be cold starting.');
      }
      throw err;
    } 

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      if (submitRes.status === 503) {
        throw new Error('AI model is waking up, try again in a minute.');
      }
      throw new Error(`HF Space submit error (${submitRes.status}): ${errText}`);
    }

    const submitData = await submitRes.json();
    if (!submitData.event_id) {
      throw new Error('Failed to get event_id from HF Space');
    }

    let resultRes;
    try {
      resultRes = await fetch(`${spaceUrl.replace(/\/$/, '')}/gradio_api/call/predict/${submitData.event_id}`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
    } catch (err) {
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!resultRes.ok) {
      throw new Error(`HF Space result error (${resultRes.status})`);
    }

    const sseText = await resultRes.text();
    const dataLine = sseText.split('\n').find(l => l.startsWith('data: ') && !l.includes('event:'));
    
    if (!dataLine) {
      throw new Error('Received empty SSE response from HF Space');
    }

    const parsedData = JSON.parse(dataLine.replace('data: ', ''));
    const resultImage = Array.isArray(parsedData) ? (parsedData.length > 1 ? parsedData[1] : parsedData[0]) : null;

    invariant(resultImage, 'GFPGAN returned empty array');

    if (!resultImage) {
      throw new Error('Received empty response from HF Space');
    }

    return NextResponse.json({
      success: true,
      image: resultImage,
      processingTime: Date.now() - startTime
    });

  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('An unknown error occurred');
  }
});
