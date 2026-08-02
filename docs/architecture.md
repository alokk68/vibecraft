# VibeCraft Architecture & Production Gotchas

We chose CF over Vercel because Edge Functions can't do custom headers in middleware (yet). Also, HF CPU spaces sleep — so we retry twice before giving up.

## Memory Profile
| Engine | Footprint | Notes |
|---|---|---|
| RMBG-1.4 | 200MB JIT | Spikes heavily during initial WASM compile |
| Swin2SR | 1.2GB | Heavy. Don't run on mobile if battery is < 20% |
| GFPGAN | 180MB | Runs remotely on HF Space, but cold starts hurt |

## Why not run everything on WebGPU?
Safari 16.4–17.0 has bugs in WebGL/WebRTC that bleed into WebGPU memory limits. If we force it, the tab silently crashes with zero stack trace. We fallback to WASM which is slower but rock solid.

## Production gotchas
- HF Gradio headers change monthly. Don't rely on undocumented `x-gradio-session` stuff, just stick to raw fetch.
- Cloudflare fetch body size limits for base64 will randomly 413 if you send uncompressed 4K images. Always downscale client-side first before hitting the edge.
