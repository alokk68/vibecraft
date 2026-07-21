/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextResponse, NextRequest } from 'next/server';
import { withRobustness } from '@/lib/apiMiddleware';

const SYSTEM_PROMPT = `[ROLE]: You are an Autonomous Meta-Prompt Engineering Engine. Your single task is to convert raw, low-quality user text into a structured, highly descriptive prompt optimized for image generation models (Flux/SDXL). Do not explain anything; output ONLY the final raw prompt string.
[EXECUTION LOGIC]:
STRUCTURAL EXPANSION: Take the user's core subject and map it into 4 distinct quadrants: [Core Subject Details], [Atmosphere & Lighting Grid], [Cinematic/Camera Parameters], and [Aesthetic Style/Art Direction].
TOKEN EXTRACTION & OPTIMIZATION: Scan the user input for weak verbs and generic adjectives (e.g., "good", "beautiful", "clear") and replace them with high-weight diffusion tokens (e.g., "volumetric studio rim lighting", "intricate photorealistic textures", "razor-sharp focus").
STYLE INJECTION:
If User says "Anime" -> Map to: "Studio Ghibli aesthetic, hand-drawn vector elements, detailed cel-shading, soft pastel color grade, 4k anime key visual".
If User says "Real/Photo" -> Map to: "Cinematic portrait photograph, shot on 85mm lens, f/1.4 aperture, realistic skin texture with pores, dramatic chiaroscuro lighting".
If User says "Cyberpunk" -> Map to: "Neo-noir cyberpunk city atmosphere, vivid neon reflections on wet asphalt, holographic overlays, moody teal and orange color grading, sharp octane render".

COMPONENT MERGING: Stash the generated quadrants into a single continuous, comma-separated master prompt string. Do not use conversational filler (e.g., "Here is the prompt").

[OUTPUT EXCLUSIVITY]: Output only the final prompt string inside your token window.`;

export const POST = withRobustness(async (req: NextRequest) => {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ success: true, enhancedPrompt: '' });
    }

    const userAccountId = req.headers.get('x-cf-account-id');
    const userApiToken = req.headers.get('x-cf-token');
    
    const accountId = userAccountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = userApiToken || process.env.CLOUDFLARE_API_TOKEN;

    // bypass if no keys
    if (!accountId || !apiToken) {
      return NextResponse.json({ success: true, enhancedPrompt: prompt });
    }

    const payload = {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ]
    };

    // 8s timeout. Llama on CF edge can be sluggish and we don't want to block the UI forever.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); 

    let response;
    try {
      response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
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
    } catch (err) {
      // Silent fallback on timeout/network fail
      return NextResponse.json({ success: true, enhancedPrompt: prompt });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      // CF API barfed
      return NextResponse.json({ success: true, enhancedPrompt: prompt });
    }

    const data = await response.json();
    
    if (!data.success || !data.result || !data.result.response) {
      return NextResponse.json({ success: true, enhancedPrompt: prompt });
    }

    let enhanced = data.result.response.trim();
    // strip out "Here is your prompt" LLM chatty garbage
    enhanced = enhanced.replace(/^here is the (expanded |final )?prompt:?\s*/i, '');
    enhanced = enhanced.replace(/^"(.*)"$/, '$1'); // sometimes llama wraps it in quotes

    return NextResponse.json({
      success: true,
      enhancedPrompt: enhanced
    });

  } catch (err: any) {
    throw err;
  }
});
