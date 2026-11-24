# InterpretLiveNow V2.3.0

**AI Conversation Assistant · Personal Interpreter · Travel & Business Communication Tool**

## V2.3.0 Changes
- **Translation reliability**: Removed fragile public GTX endpoint. Google Cloud API Key (if set) and MyMemory run in parallel via `Promise.any` — first valid result wins. 5 s timeout on every fetch. Clear inline error + Retry button instead of silent failure.
- **iPhone Home Screen (standalone)**: SpeechRecognition does not work in standalone PWAs. Record button becomes “Safari” and a banner appears: tap to copy the live URL so the user can open it in Safari.
- **iOS mic hang after TTS**: 300 ms cooldown after speaking; if no recognition result within 4 s, auto-abort and one automatic retry after 1 s.
- **Screen sharing / layout**: `overscroll-behavior: contain` on `.main` only (no body rubber-band). Solid header background on iOS (no `backdrop-filter`) for stable mirroring. Explicit `user-scalable=yes` in viewport.
- **Performance**: Preconnect to translation hosts. Simplified avatar/record feedback (no continuous float / pulse-ring animations). Service Worker uses Network-First for HTML so deploys appear immediately; cache name `iln-v2-3-0`.

## Previous (V2.2.0)
- New neon logo, Speak reliability on iPhone, live text while talking, faster translation path, auto-updating SW.

## Core Experience
1. Open app → two avatars
2. Tap **Record** → speak
3. Translation appears
4. Tap **Speak** → play translation
5. Hand phone to the other person
6. Continue

## Features
- English ↔ Japanese real-time translation
- Speech recognition + speech synthesis
- Voice selection & speed control
- Auto-speak, conversation history, Save
- Optional Google Cloud Translation API key
- PWA / Add to Home Screen (voice works best in Safari on iOS)

## Deploy
Upload the entire folder to any static host (GitHub Pages, Netlify, Cloudflare Pages, etc.).

```
InterpretLiveNow-V2.3/
├── index.html
├── manifest.webmanifest
├── sw.js
├── favicon-32.png
├── icon-*.png
├── logo-160.png / logo.png
└── maskable-512.png
```

After deploy: on iPhone go to Settings → Safari → Advanced → Website Data, delete the site entry, then reload so the new Service Worker is used.

## Local Testing
Open `index.html` in Safari (best for iPhone) or Chrome.
