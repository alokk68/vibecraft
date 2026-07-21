/* eslint-disable @typescript-eslint/no-explicit-any */
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

    const gradioPayload = {
      data: [image, mode]
    };

    // free HF spaces are incredibly slow to wake up from sleep
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); 

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (hfToken) {
      headers['Authorization'] = `Bearer ${hfToken}`;
    }

    let response;
    try {
      response = await fetch(`${spaceUrl.replace(/\/$/, '')}/api/predict`, {
        method: 'POST',
        headers,
        body: JSON.stringify(gradioPayload),
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('HF Space took too long to respond (timeout). It might be cold starting. Please try again.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errText = await response.text();
      // 503 = space sleeping
      if (response.status === 503) {
        throw new Error('The AI model is currently waking up from sleep. Please try again in a minute.');
      }
      throw new Error(`HF Space error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    const resultImage = data.data?.[0];
    invariant(resultImage, 'GFPGAN returned empty array — HF space likely went to sleep mid-inference');

    if (!resultImage) {
      throw new Error('Received empty response from HF Space');
    }

    return NextResponse.json({
      success: true,
      image: resultImage,
      processingTime: Date.now() - startTime
    });

  } catch (err: any) {
    throw err;
  }
});
