# InterpretLiveNow  V1.0.1
Japanese ⇄ English live interpreter (iPhone PWA).

## Deploy (GitHub Pages)
1. Upload all files (no folders) to a new repo, branch `main`.
2. Settings → Pages → Source: **Deploy from a branch** → `main` → `/ (root)` → Save.
3. Open `https://<user>.github.io/<repo>/` in **Safari** on iPhone → Share → **Add to Home Screen**.

## Notes
- Translation: free MyMemory API (daily limit). Replace `translateChunk()` in `app.js` to use another service.
- Voice recording uses the Web Speech API. iOS often disables it in home-screen apps; use the 🎤 key on the iPhone keyboard as the reliable alternative.

© 2026 Rafat Kotaki. All rights reserved.
