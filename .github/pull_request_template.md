## Description
Explain the motivation and context for this PR. If it fixes an open issue, please link it.

## Production Checklist

Before requesting a review, please confirm the following:

- [ ] No `any` types added (unless explicitly bypassing a broken vendor typedef).
- [ ] Tested on Safari 16.4+ (WASM fallback works and does not crash the tab).
- [ ] No environment variables or secrets are logged to the console.
- [ ] BYOK (Bring Your Own Key) inputs are strictly kept in client-side state and NOT persisted server-side.

## Additional Context
Add any other context or screenshots about the pull request here. WebGPU memory profile changes should be noted here.
