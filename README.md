# InterpretLiveNow V2.0

**AI Conversation Assistant · Personal Interpreter · Travel & Business Communication Tool**

## What’s New

Complete UX redesign from a multi-tab translator into a single-page real-time conversation experience.

### Core Experience
1. Open app → see two animated people
2. Tap **Record** → speak naturally
3. Translation appears
4. Tap **Speak** → play translation
5. Hand phone to the other person
6. Continue conversation

No tabs. No navigation. Maximum 10-second learning curve.

## Features Preserved & Enhanced
- English ↔ Japanese real-time translation
- Speech recognition + speech synthesis
- Voice selection & speed control
- Auto-translate / Auto-speak
- Save conversation (shareable text file)
- Conversation history (chat bubbles)
- Audio diagnostics & mute-switch workaround (iPhone)
- Optional Google Translate API key
- PWA / Add to Home Screen support
- iPhone Safari optimized

## New in V2
- Single-page conversation flow
- Animated avatars with state feedback (listening / processing / speaking)
- Live status bar + guided finger pointer
- Modern glassmorphism + floating action buttons
- Tourist / Business / Learning modes
- Onboarding tutorial (shown once)
- Settings drawer
- Clean messaging-style history

## How to Deploy
Just upload the entire folder to any static host (GitHub Pages, Netlify, Cloudflare Pages, etc.).

```
InterpretLiveNow-V2/
├── index.html          ← complete app (HTML + CSS + JS)
├── manifest.webmanifest
├── sw.js
├── favicon-32.png
├── icon-*.png
└── maskable-512.png
```

## Local Testing
Open `index.html` in Safari (best for iPhone testing) or Chrome.

Note: Speech recognition works best in Safari on iOS (not in standalone PWA on some iOS versions).

## Credits
Redesigned from InterpretLiveNow V1.2.2 following the V2 product specification.
