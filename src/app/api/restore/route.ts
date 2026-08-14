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

    let submitResponse;
    try {
      // Gradio 6+ API - Step 1: Submit prediction and get Event ID
      submitResponse = await fetch(`${spaceUrl.replace(/\/$/, '')}/gradio_api/call/predict`, {
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
    } 

    if (!submitResponse.ok) {
      const errText = await submitResponse.text();
      if (submitResponse.status === 503) {
        throw new Error('The AI model is currently waking up from sleep. Please try again in a minute.');
      }
      throw new Error(`HF Space submit error (${submitResponse.status}): ${errText}`);
    }

    const submitData = await submitResponse.json();
    if (!submitData.event_id) {
      throw new Error('Failed to get event_id from HF Space');
    }

    let resultResponse;
    try {
      // Gradio 6+ API - Step 2: Get result via SSE stream using Event ID
      resultResponse = await fetch(`${spaceUrl.replace(/\/$/, '')}/gradio_api/call/predict/${submitData.event_id}`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
    } catch (err: any) {
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!resultResponse.ok) {
      throw new Error(`HF Space result error (${resultResponse.status})`);
    }

    // SSE format data parse karna (e.g., "data: [null, {url: ...}]\n\nevent: complete")
    const sseText = await resultResponse.text();
    
    // Starline dhundho jo 'data: ' se shuru hoti hai aur JSON array rakhti hai
    const dataLine = sseText.split('\n').find(l => l.startsWith('data: ') && !l.includes('event:'));
    
    if (!dataLine) {
      throw new Error('Received empty or invalid SSE response from HF Space');
    }

    const parsedData = JSON.parse(dataLine.replace('data: ', ''));
    
    // Gradio 6 output format: [error, data_array] or just [data_array]
    // Hum pehla valid element nikal rahe hain jo image data contain karta hai
    const resultImage = Array.isArray(parsedData) ? (parsedData.length > 1 ? parsedData[1] : parsedData[0]) : null;

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
