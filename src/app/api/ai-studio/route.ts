/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from 'next/server';
import { withRobustness } from '@/lib/apiMiddleware';
import { invariant } from '@/lib/invariant';

export function stripBase64Prefix(base64: string): string {
  return base64.replace(/^data:image\/\w+;base64,/, '');
}

export const POST = withRobustness(async (req: NextRequest) => {
  const startTime = Date.now();

  try {
    const { image, prompt, strength, mask, model } = await req.json();

    if (!model) {
      return NextResponse.json({ success: false, error: 'Missing model identifier' }, { status: 400 });
    }

    // fallback to env if no BYOK
    const userAccountId = req.headers.get('x-cf-account-id');
    const userApiToken = req.headers.get('x-cf-token');
    
    const accountId = userAccountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = userApiToken || process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json(
        { success: false, error: 'Cloudflare credentials missing. Please set them in Settings.' },
        { status: 401 }
      );
    }

    const payload: any = { prompt };
    
    if (image) {
      payload.image_b64 = stripBase64Prefix(image);
    }
    
    invariant(payload.image_b64 || payload.prompt, 'CF API will 400 if both image and prompt are missing');
    
    if (mask) {
      if (model.includes('inpainting')) {
        // CF inpainting requires a raw Uint8Array mask for some reason.
        // (lost an hour debugging this, img2img takes b64 just fine)
        const maskBuffer = Buffer.from(stripBase64Prefix(mask), 'base64');
        payload.mask = Array.from(new Uint8Array(maskBuffer));
      } else {
        payload.mask_b64 = stripBase64Prefix(mask);
      }
    }
    
    if (strength !== undefined) {
      payload.strength = parseFloat(strength);
    }
    if (model.includes('flux')) {
      payload.num_steps = 4;
    } else {
      // SD 1.5 needs more steps + guidance unlike flux
      payload.guidance = 7.5;
      payload.num_steps = 20;
    }

    // console.log('[CF Payload Keys]:', Object.keys(payload)); // uncomment to debug mask issue
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    let response;
    try {
      response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Cloudflare API took too long to respond.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      const errMsg = errData?.errors?.[0]?.message || errData?.error || response.statusText;
      throw new Error(`Cloudflare error (${response.status}): ${errMsg}`);
    }

    // CF unpredictably returns either raw binary or JSON string. handle both.
    const contentType = response.headers.get('content-type') || '';
    let resultBase64 = '';

    if (contentType.includes('image/')) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      resultBase64 = `data:image/png;base64,${buffer.toString('base64')}`;
    } else {
      const data = await response.json();
      if (!data.success) {
        throw new Error(`Cloudflare API returned success: false - ${JSON.stringify(data.errors)}`);
      }
      
      const returnedImage = data.result?.image;
      if (!returnedImage) {
        throw new Error('No image returned from Cloudflare API');
      }
      
      resultBase64 = `data:image/png;base64,${returnedImage}`;
    }

    return NextResponse.json({
      success: true,
      image: resultBase64,
      processingTime: Date.now() - startTime
    });

  } catch (err: any) {
    throw err;
  }
});
